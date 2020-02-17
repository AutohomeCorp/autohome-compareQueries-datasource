///<reference path="../headers/common.d.ts" />

import _ from 'lodash'
import kbn from 'app/core/utils/kbn'
import { QueryCtrl } from './sdk/sdk'

export class CompareQueriesQueryCtrl extends QueryCtrl {
  static templateUrl = 'partials/query.editor.html'
  errors: any
  query: any
  target: any

  /** @ngInject **/
  constructor($scope, $injector, $q) {
    super($scope, $injector)
    if (!this.target.timeShifts) {
      this.target.timeShifts = []
    }
    if (this.target.timeShifts.length == 0) {
      this.addTimeShifts()
    }
    if (typeof this.target.process == 'undefined') {
      this.target.process = true
    }
  }

  targetBlur() {
    this.refresh()
  }
  onChangeInternal() {
    this.refresh() // Asks the panel to refresh data.
  }
  addTimeShifts() {
    let id = this.getTimeShiftId()
    this.target.timeShifts.push({ id: id })
  }
  removeTimeShift(timeShift) {
    if (this.target.timeShifts && this.target.timeShifts.length <= 1) {
      return
    }
    var index = _.indexOf(this.target.timeShifts, timeShift)
    this.target.timeShifts.splice(index, 1)
    this.refreshTimeShifts()
  }
  refreshTimeShifts() {
    this.refresh()
  }
  getTimeShiftId() {
    let id = 0
    while (true) {
      let notExits = _.every(this.target.timeShifts, function(timeShift) {
        return timeShift.id !== id
      })
      if (notExits) {
        return id
      } else {
        id++
      }
    }
  }
}
