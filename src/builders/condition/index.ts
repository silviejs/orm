import QueryBuilder from '../../builders/query';

export type TOperator = '=' | '!=' | '>' | '>=' | '<' | '<=';
export type TBaseValue = string | number | boolean;
export type TValue = string | number | boolean | TBaseValue[];
export type TColumn = string;
export type TTable = string;
export type TConditionType =
	| 'group'
	| 'value'
	| 'column'
	| 'null'
	| 'not null'
	| 'between'
	| 'not between'
	| 'like'
	| 'not like'
	| 'in'
	| 'not in'
	| 'date'
	| 'year'
	| 'month'
	| 'day'
	| 'time'
	| 'raw';

export interface ICondition {
	// eslint-disable-next-line no-use-before-define
	leftHandSide?: TColumn | QueryBuilder | ((conditionBuilder: IConditionBuilder) => void);
	operator?: TOperator;
	rightHandSide?: TColumn | TValue | QueryBuilder;
	conditions?: ICondition[];
	relation?: 'and' | 'or';
	type: TConditionType;
	query?: string;
	params?: TBaseValue[];
}

export default interface IConditionBuilder {
	conditions: ICondition[];
}
