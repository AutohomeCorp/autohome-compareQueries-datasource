/// <reference path="../headers/common.d.ts" />
import { QueryCtrl } from './sdk/sdk';
export declare class CompareQueriesQueryCtrl extends QueryCtrl {
    static templateUrl: string;
    errors: any;
    query: any;
    target: any;
    /** @ngInject **/
    constructor($scope: any, $injector: any, $q: any);
    targetBlur(): void;
    onChangeInternal(): void;
    addTimeShifts(): void;
    removeTimeShift(timeShift: any): void;
    refreshTimeShifts(): void;
    getTimeShiftId(): number;
}
