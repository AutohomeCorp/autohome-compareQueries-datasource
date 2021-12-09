import _ from 'lodash';
import moment from 'moment'; // eslint-disable-line no-restricted-imports

import { ArrayVector, MutableField } from '@grafana/data';

export class CompareQueriesDatasource {
  datasourceSrv: any;
  $q: any;
  templateSrv: any;
  meta: any;
  units = ['y', 'M', 'w', 'd', 'h', 'm', 's'];

  /** @ngInject */
  constructor($q, datasourceSrv, templateSrv) {
    this.datasourceSrv = datasourceSrv;
    this.$q = $q;
    this.templateSrv = templateSrv;
  }

  testDatasource() {
    return new Promise(function(resolve, reject) {
      resolve({
        status: 'success',
        message: 'Compare Query Source is working correctly',
        title: 'Success',
      });
    });
  }

  // Called once per panel (graph)
  query(options) {
    var _this = this;
    var sets = _.groupBy(options.targets, function(ds) {
      // Trying to maintain compatibility with grafana lower then 8.3.x
      if (ds.datasource.uid === undefined) {
        return ds.datasource;
      }
      return ds.datasource.uid;
    });
    var querys = _.groupBy(options.targets, 'refId');
    var promises: any[] = [];
    _.forEach(sets, function(targets, dsName) {
      var opt = _.cloneDeep(options);

      var promise = _this.datasourceSrv.get(dsName).then(function(ds) {
        if (ds.meta.id === _this.meta.id) {
          return _this._compareQuery(options, targets, querys, _this);
        } else {
          opt.targets = targets;
          let result = ds.query(opt);
          return typeof result.toPromise === 'function' ? result.toPromise() : result;
        }
      });
      promises.push(promise);
    });
    let result = this.$q.all(promises).then(function(results) {
      return {
        data: _.flatten(
          _.filter(
            _.map(results, function(result) {
              var data = result.data;
              if (data) {
                data = _.filter(result.data, function(datum) {
                  return datum.hide !== true;
                });
              }
              return data;
            }),
            function(result) {
              return result !== undefined && result !== null;
            }
          )
        ),
      };
    });
    return result;
  }

  _compareQuery(options, targets, querys, _this) {
    var comparePromises: any[] = [];
    //console.log('_compareQuery targets', targets)
    _.forEach(targets, function(target) {
      var query = target.query;
      if (query === null || query === '' || querys[query] === null) {
        return;
      }
      var queryObj = _.cloneDeep(querys[query][0]);
      queryObj.hide = false;
      if (queryObj) {
        var compareDsName = queryObj.datasource;
        if (target.timeShifts && target.timeShifts.length > 0) {
          _.forEach(target.timeShifts, function(timeShift) {
            var timeShiftValue;
            var timeShiftAlias;
            var aliasType = timeShift.aliasType || 'suffix';
            var delimiter = timeShift.delimiter || '_';

            var comparePromise = _this.datasourceSrv
              .get(compareDsName)
              .then(function(compareDs) {
                if (compareDs.meta.id === _this.meta.id) {
                  return { data: [] };
                }
                timeShiftValue = _this.templateSrv.replace(timeShift.value, options.scopedVars);
                timeShiftAlias = _this.templateSrv.replace(timeShift.alias, options.scopedVars) || timeShiftValue;

                if (timeShiftValue === null || timeShiftValue === '' || typeof timeShiftValue === 'undefined') {
                  return { data: [] };
                }
                let compareOptions = _.cloneDeep(options);
                compareOptions.range.from = _this.addTimeShift(compareOptions.range.from, timeShiftValue);
                compareOptions.range.to = _this.addTimeShift(compareOptions.range.to, timeShiftValue);
                compareOptions.range.raw = {
                  from: compareOptions.range.from,
                  to: compareOptions.range.to,
                };
                compareOptions.rangeRaw = compareOptions.range.raw;

                queryObj.refId = queryObj.refId + '_' + timeShiftValue;
                compareOptions.targets = [queryObj];
                compareOptions.requestId = compareOptions.requestId + '_' + timeShiftValue;

                var compareResult = compareDs.query(compareOptions);
                return typeof compareResult.toPromise === 'function' ? compareResult.toPromise() : compareResult;
              })
              .then(function(compareResult) {
                var data = compareResult.data;
                data.forEach(function(line) {
                  if (line.target) {
                    // if old time series format
                    line.target = _this.generalAlias(line.target, timeShiftAlias, aliasType, delimiter);
                    typeof line.title !== 'undefined' &&
                      line.title !== null &&
                      (line.title = _this.generalAlias(line.title, timeShiftAlias, aliasType, delimiter));
                  } else if (line.fields) {
                    //else if new data frames format with multiple series
                    line.fields.forEach(function(field) {
                      if (field.name) {
                        field.name = _this.generalAlias(field.name, timeShiftAlias, aliasType, delimiter);
                      }

                      if (field.config && field.config.displayName) {
                        field.config.displayName = _this.generalAlias(
                          field.config.displayName,
                          timeShiftAlias,
                          aliasType,
                          delimiter
                        );
                      }

                      if (field.config && field.config.displayNameFromDS) {
                        field.config.displayNameFromDS = _this.generalAlias(
                          field.config.displayNameFromDS,
                          timeShiftAlias,
                          aliasType,
                          delimiter
                        );
                      }
                    });
                  }

                  if (target.process) {
                    let timeShift_ms = _this.parseShiftToMs(timeShiftValue);

                    if (line.type === 'table') {
                      if (line.rows) {
                        line.rows.forEach(function(row) {
                          row[0] = row[0] + timeShift_ms;
                        });
                      }
                    } else {
                      if (line.datapoints) {
                        // if old time series format
                        line.datapoints.forEach(function(datapoint) {
                          datapoint[1] = datapoint[1] + timeShift_ms;
                        });
                      } else if (line.fields && line.fields.length > 0) {
                        //else if new data frames format
                        const unshiftedTimeField = line.fields.find(field => field.type === 'time');

                        if (unshiftedTimeField) {
                          const timeField: MutableField = {
                            name: unshiftedTimeField.name,
                            type: unshiftedTimeField.type,
                            config: unshiftedTimeField.config || {},
                            labels: unshiftedTimeField.labels,
                            values: new ArrayVector(),
                          };

                          for (let i = 0; i < line.length; i++) {
                            timeField.values.set(i, unshiftedTimeField.values.get(i) + timeShift_ms);
                          }
                          line.fields[0] = timeField;
                        }
                      }
                    }
                  }

                  line.hide = target.hide;
                });
                return {
                  data: data,
                };
              });

            comparePromises.push(comparePromise);
          });
        }
      }
    });

    return this.$q.all(comparePromises).then(function(results) {
      return {
        data: _.flatten(
          _.filter(
            _.map(results, function(result) {
              var data = result.data;
              if (data) {
                data = _.filter(result.data, function(datum) {
                  return datum.hide !== true;
                });
              }
              return data;
            }),
            function(result) {
              return result !== undefined && result !== null;
            }
          )
        ),
      };
    });
  }

  generalAlias(original, alias, aliasType, delimiter) {
    switch (aliasType) {
      case 'prefix':
        return alias + delimiter + original;
      case 'absolute':
        return alias;
      case 'suffix':
      default:
        return original + delimiter + alias;
    }
  }

  parseShiftToMs(timeShift) {
    let timeShiftObj = this.parseTimeShift(timeShift);
    if (!timeShiftObj) {
      return;
    }
    var num = 0 - timeShiftObj.num;
    var unit = timeShiftObj.unit;
    if (!_.includes(this.units, unit)) {
      return undefined;
    } else {
      let curTime = moment();
      let shiftTime = curTime.clone().add(num, unit);
      return curTime.valueOf() - shiftTime.valueOf();
    }
  }
  parseTimeShift(timeShift) {
    var dateTime = timeShift;
    var len = timeShift.length;
    var i = 0;

    while (i < len && !isNaN(dateTime.charAt(i))) {
      i++;
      if (i > 10) {
        return undefined;
      }
    }
    var num = parseInt(dateTime.substring(0, i), 10);
    var unit = dateTime.charAt(i);
    return {
      num: num,
      unit: unit,
    };
  }

  addTimeShift(time, timeShift) {
    let timeShiftObj = this.parseTimeShift(timeShift);
    if (!timeShiftObj) {
      return;
    }
    var num = 0 - timeShiftObj.num;
    var unit = timeShiftObj.unit;

    if (!_.includes(this.units, unit)) {
      return undefined;
    } else {
      let curTime = time;
      let shiftTime = curTime.clone().add(num, unit);
      return shiftTime;
    }
  }
}
