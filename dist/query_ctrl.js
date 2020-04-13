///<reference path="../headers/common.d.ts" />
System.register(['lodash', './sdk/sdk'], function(exports_1) {
    var __extends = (this && this.__extends) || function (d, b) {
        for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
    var lodash_1, sdk_1;
    var CompareQueriesQueryCtrl;
    return {
        setters:[
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (sdk_1_1) {
                sdk_1 = sdk_1_1;
            }],
        execute: function() {
            CompareQueriesQueryCtrl = (function (_super) {
                __extends(CompareQueriesQueryCtrl, _super);
                /** @ngInject **/
                function CompareQueriesQueryCtrl($scope, $injector, $q) {
                    _super.call(this, $scope, $injector);
                    if (!this.target.timeShifts) {
                        this.target.timeShifts = [];
                    }
                    if (this.target.timeShifts.length == 0) {
                        this.addTimeShifts();
                    }
                    if (typeof this.target.process == 'undefined') {
                        this.target.process = true;
                    }
                }
                CompareQueriesQueryCtrl.prototype.targetBlur = function () {
                    this.refresh();
                };
                CompareQueriesQueryCtrl.prototype.onChangeInternal = function () {
                    this.refresh(); // Asks the panel to refresh data.
                };
                CompareQueriesQueryCtrl.prototype.addTimeShifts = function () {
                    var id = this.getTimeShiftId();
                    this.target.timeShifts.push({ id: id });
                };
                CompareQueriesQueryCtrl.prototype.removeTimeShift = function (timeShift) {
                    if (this.target.timeShifts && this.target.timeShifts.length <= 1) {
                        return;
                    }
                    var index = lodash_1["default"].indexOf(this.target.timeShifts, timeShift);
                    this.target.timeShifts.splice(index, 1);
                    this.refreshTimeShifts();
                };
                CompareQueriesQueryCtrl.prototype.refreshTimeShifts = function () {
                    this.refresh();
                };
                CompareQueriesQueryCtrl.prototype.getTimeShiftId = function () {
                    var id = 0;
                    while (true) {
                        var notExits = lodash_1["default"].every(this.target.timeShifts, function (timeShift) {
                            return timeShift.id !== id;
                        });
                        if (notExits) {
                            return id;
                        }
                        else {
                            id++;
                        }
                    }
                };
                CompareQueriesQueryCtrl.templateUrl = 'partials/query.editor.html';
                return CompareQueriesQueryCtrl;
            })(sdk_1.QueryCtrl);
            exports_1("CompareQueriesQueryCtrl", CompareQueriesQueryCtrl);
        }
    }
});
//# sourceMappingURL=query_ctrl.js.map