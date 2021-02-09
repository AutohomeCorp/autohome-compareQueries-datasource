/// <reference path="../headers/common.d.ts" />
import { QueryCtrl } from './sdk/sdk';
export declare class CompareQueriesQueryCtrl extends QueryCtrl {
    static templateUrl: string;
    errors: any;
    query: any;
    target: any;
    aliasTypes: string[];
    /** @ngInject **/
    constructor($scope: any, $injector: any, $q: any);
    targetBlur(): void;
    onChangeInternal(): void;
    onChangeAliasType(timeShift: any): void;
    addTimeShifts(): void;
    removeTimeShift(timeShift: any): void;
    refreshTimeShifts(): void;
    onAliasAsChange(aliasAs: any): void;
    getTimeShiftId(): number;
}
