define(['angular', 'lodash', 'moment'], function(angular, _, moment) {
  'use strict'

  /** @ngInject */
  function CompareQueriesDatasource($q, datasourceSrv, templateSrv) {
    this.datasourceSrv = datasourceSrv
    this.$q = $q
    this.templateSrv = templateSrv
    this.testDatasource = function() {
      return new Promise(function(resolve, reject) {
        resolve({
          status: 'success',
          message: 'Compare Query Source is working correctly',
          title: 'Success'
        })
      })
    }

    // Called once per panel (graph)
    this.query = function(options) {
      var _this = this
      var sets = _.groupBy(options.targets, 'datasource')
      var querys = _.groupBy(options.targets, 'refId')
      var promises = []
      _.forEach(sets, function(targets, dsName) {
        var opt = angular.copy(options)

        var promise = _this.datasourceSrv.get(dsName).then(function(ds) {
          if (ds.meta.id === _this.meta.id) {
            return _this._compareQuery(options, targets, querys, _this)
          } else {
            opt.targets = targets
            return ds.query(opt)
          }
        })
        promises.push(promise)
      })
      let result = this.$q.all(promises).then(function(results) {
        return {
          data: _.flatten(
            _.filter(
              _.map(results, function(result) {
                var data = result.data
                if (data) {
                  data = _.filter(result.data, function(datum) {
                    return datum.hide !== true
                  })
                }
                return data
              }),
              function(result) {
                return result !== undefined && result !== null
              }
            )
          )
        }
      })
      return result
    }

    this._compareQuery = function(options, targets, querys, _this) {
      var comparePromises = []
      //console.log('_compareQuery targets', targets)
      _.forEach(targets, function(target) {
        var query = target.query
        if (query == null || query == '' || querys[query] == null) {
          return
        }
        var queryObj = angular.copy(querys[query][0])
        queryObj.hide = false
        if (queryObj) {
          var comapreDsName = queryObj.datasource
          if (target.timeShifts && target.timeShifts.length > 0) {
            _.forEach(target.timeShifts, function(timeShift) {
              var timeShiftValue
              var timeShiftAlias

              var comparePromise = _this.datasourceSrv
                .get(comapreDsName)
                .then(function(comapreDs) {
                  if (comapreDs.meta.id === _this.meta.id) {
                    return { data: [] }
                  }
                  timeShiftValue = _this.templateSrv.replace(
                    timeShift.value,
                    options.scopedVars
                  )
                  timeShiftAlias = _this.templateSrv.replace(
                    timeShift.alias,
                    options.scopedVars
                  )

                  if (
                    timeShiftValue == null ||
                    timeShiftValue == '' ||
                    typeof timeShiftValue == 'undefined'
                  ) {
                    return { data: [] }
                  }
                  let compareOptions = angular.copy(options)
                  compareOptions.range.from = addTimeShift(
                    compareOptions.range.from,
                    timeShiftValue
                  )
                  compareOptions.range.to = addTimeShift(
                    compareOptions.range.to,
                    timeShiftValue
                  )
                  compareOptions.range.raw = {
                    from: compareOptions.range.from,
                    to: compareOptions.range.to
                  }
                  compareOptions.rangeRaw = compareOptions.range.raw

                  queryObj.refId = queryObj.refId + '_' + timeShiftValue
                  compareOptions.targets = [queryObj]
                  compareOptions.requestId =
                    compareOptions.requestId + '_' + timeShiftValue

                  var compareResult = comapreDs.query(compareOptions)
                  return compareResult
                })
                .then(function(compareResult) {
                  var data = compareResult.data
                  data.forEach(function(line) {
                    if (
                      typeof timeShift.alias == 'undefined' ||
                      timeShift.alias == null ||
                      timeShift.alias == ''
                    ) {
                      line.target = line.target + '_' + timeShiftValue
                    } else {
                      line.target = line.target + '_' + timeShiftAlias
                    }

                    if (target.process) {
                      let timeShift_ms = parseShiftToMs(timeShiftValue)

                      if (line.type == 'table') {
                        if (line.rows) {
                          line.rows.forEach(function(row) {
                            row[0] = row[0] + timeShift_ms
                          })
                        }
                      } else {
                        if (line.datapoints) {
                          line.datapoints.forEach(function(datapoint) {
                            datapoint[1] = datapoint[1] + timeShift_ms
                          })
                        }
                      }
                    }

                    line.hide = target.hide
                  })
                  return {
                    data: data
                  }
                })

              comparePromises.push(comparePromise)
            })
          }
        }
      })

      return this.$q.all(comparePromises).then(function(results) {
        return {
          data: _.flatten(
            _.filter(
              _.map(results, function(result) {
                var data = result.data
                if (data) {
                  data = _.filter(result.data, function(datum) {
                    return datum.hide !== true
                  })
                }
                return data
              }),
              function(result) {
                return result !== undefined && result !== null
              }
            )
          )
        }
      })
    }
    var units = ['y', 'M', 'w', 'd', 'h', 'm', 's']
    function parseShiftToMs(timeShift) {
      let timeShiftObj = parseTimeShift(timeShift)
      var num = 0 - timeShiftObj.num
      var unit = timeShiftObj.unit
      if (!_.includes(units, unit)) {
        return undefined
      } else {
        let curTime = moment()
        let shiftTime = curTime.clone().add(num, unit)
        return curTime.valueOf() - shiftTime.valueOf()
      }
    }
    function parseTimeShift(timeShift) {
      var dateTime = timeShift
      var len = timeShift.length
      var i = 0

      while (i < len && !isNaN(dateTime.charAt(i))) {
        i++
        if (i > 10) {
          return undefined
        }
      }
      var num = parseInt(dateTime.substring(0, i), 10)
      var unit = dateTime.charAt(i)
      return {
        num: num,
        unit: unit
      }
    }

    function addTimeShift(time, timeShift) {
      let timeShiftObj = parseTimeShift(timeShift)
      var num = 0 - timeShiftObj.num
      var unit = timeShiftObj.unit

      if (!_.includes(units, unit)) {
        return undefined
      } else {
        let curTime = time
        let shiftTime = curTime.clone().add(num, unit)
        return shiftTime
      }
    }
  }
  return {
    CompareQueriesDatasource: CompareQueriesDatasource
  }
})
