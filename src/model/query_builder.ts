import pluralize from 'pluralize';
import { snakeCase } from 'change-case';
import { TColumn, TOperator, TTable, TBaseValue } from '../builders/condition';
import WhereConditionBuilder from '../builders/condition/where';
import QueryBuilder from '../builders/query';
import HavingConditionBuilder from '../builders/condition/having';
import JoinConditionBuilder from '../builders/condition/join';

export interface IModel {
	fill(data: any): void;
	fresh(): Promise<IModel>;
	refresh(): Promise<void>;
	update(data: any, silent: boolean): Promise<number>;
	delete(): Promise<any>;
	forceDelete(): Promise<number>;
	save(): Promise<number>;
}

export type IModelRelation = {
	type: 'HasMany' | 'HasOne' | 'BelongsToMany' | 'BelongsTo';
	count: 'one' | 'many';
	model: any;
	localKey: string | string[];
	remoteKey: string | string[];
};

export default class ModelQueryBuilder {
	protected static tableName = '';

	protected static primaryKey: string | string[] = 'id';

	protected static useTimestamps = true;

	protected static createTimestamp = 'created_at';

	protected static updateTimestamp = 'updated_at';

	protected static useSoftDeletes = false;

	protected static softDeleteTimestamp = 'deleted_at';

	static relations: Record<string, IModelRelation> = {};

	/**
	 * Create a new instance of this model from a initial data object
	 * @param initialData
	 */
	constructor(initialData?: any) {
		if (initialData) {
			Object.keys(initialData).forEach((key) => {
				this[key] = initialData[key];
			});
		}
	}

	/**
	 * The table name for this model
	 */
	static get table() {
		if (!this.tableName) {
			this.tableName = snakeCase(pluralize(this.name));
		}

		return this.tableName;
	}

	/**
	 * Cast a RawDataPacket into the current model
	 * @param data
	 */
	protected static cast(data: any): ModelQueryBuilder {
		return new this(data);
	}

	/**
	 * Cast an array of RawDataPackets into the current model
	 * @param data
	 */
	protected static castAll(data: any[]): ModelQueryBuilder[] {
		return data.map((row) => this.cast(row));
	}

	/**
	 * Create many to many relation
	 * @param model
	 * @param foreignKey
	 * @param primaryKey
	 */
	static hasMany(model: any, foreignKey: string, primaryKey?: string): IModelRelation {
		return {
			type: 'HasMany',
			count: 'many',
			model,
			localKey: foreignKey,
			remoteKey: primaryKey || this.primaryKey,
		};
	}

	/**
	 * Create one to one relation
	 * @param model
	 * @param foreignKey
	 * @param primaryKey
	 */
	static hasOne(model: any, foreignKey: string, primaryKey?: string): IModelRelation {
		return {
			type: 'HasOne',
			count: 'one',
			model,
			localKey: foreignKey,
			remoteKey: primaryKey || this.primaryKey,
		};
	}

	/**
	 * Create one to many relation
	 * @param model
	 * @param foreignKey
	 * @param primaryKey
	 */
	static belongsTo(model: any, foreignKey: string, primaryKey?: string): IModelRelation {
		return {
			type: 'BelongsTo',
			count: 'one',
			model,
			remoteKey: foreignKey,
			localKey: primaryKey || this.primaryKey,
		};
	}

	/**
	 * Creates reversed many to many relation
	 * @param model
	 * @param foreignKey
	 * @param primaryKey
	 */
	static belongsToMany(model: any, foreignKey: string, primaryKey?: string): IModelRelation {
		return {
			type: 'BelongsToMany',
			count: 'many',
			model,
			remoteKey: foreignKey,
			localKey: primaryKey || this.primaryKey,
		};
	}

	/**
	 * Specify the relations you want to be fetched along with the main query
	 * @param relationNames
	 */
	static with(...relationNames: string[]): QueryBuilder {
		const qb = this.baseQueryBuilder;

		const relations = [];

		relationNames.forEach((relationName) => {
			const relationPath: string[] = relationName.split('.');
			let superModel = this as any;
			let relation = null;

			relationPath.forEach((part) => {
				if (part in superModel.relations) {
					relation = superModel.relations[part];
					superModel = relation.model;
				} else {
					throw new Error(`There is no relation named '${part}' on '${superModel}' model.`);
				}
			});

			relations.push({
				name: relationName,
				path: relationPath,
				parent: relationPath.slice(0, relationPath.length - 1).join(''),
				relation,
			});
		});

		relations.sort((a, b) => a.path.length - b.path.length);

		qb.options.fetchingRelations = relations;
		qb.options.processFinalQuery = (finalQueryBuilder) => {
			const queryBuilders: Record<string, QueryBuilder> = {};

			const rootQuery = finalQueryBuilder.clone();
			rootQuery.options.fetchingRelations = [];
			rootQuery.options.alongQueries = [];
			rootQuery.options.processFinalQuery = null;

			relations.forEach((rel) => {
				const { relation } = rel;
				const parentQuery = (rel.parent ? queryBuilders[rel.parent] : rootQuery).clone();

				queryBuilders[rel.name] = relation.model
					.select(`${relation.model.table}.*`)
					.join(parentQuery, `${relation.model.tableName}.${relation.localKey}`, `t.${relation.remoteKey}`, `t`);
			});

			Object.values(queryBuilders).forEach((queryBuilder) => {
				finalQueryBuilder.alongWith(queryBuilder);
			});
		};

		return qb;
	}

	private static processResults(results, queryBuilder: QueryBuilder) {
		if (queryBuilder.options.fetchingRelations.length === 0) {
			return this.castAll(results);
		}

		const relations = queryBuilder.options.fetchingRelations as any[];
		const mainData = this.castAll(results[0]);

		const relationsData = {};
		relations.forEach((relation, index) => {
			relationsData[relation.name] = results[index + 1];
		});

		relations.reverse();
		relations.forEach((rel) => {
			if (rel.parent) {
				relationsData[rel.parent].forEach((item) => {
					const relationData = rel.relation.model.castAll(
						relationsData[rel.name].filter((row) => row[rel.relation.localKey] === item[rel.relation.remoteKey])
					);

					item[rel.path.slice(-1)[0]] = rel.relation.count === 'one' ? relationData[0] || null : relationData;
				});
			} else {
				mainData.forEach((item) => {
					const relationData = rel.relation.model.castAll(
						relationsData[rel.name].filter((row) => row[rel.relation.localKey] === item[rel.relation.remoteKey])
					);

					item[rel.name] = rel.relation.count === 'one' ? relationData[0] || null : relationData;
				});
			}
		});

		return mainData;
	}

	static extendBaseQueryBuilder(queryBuilder?: QueryBuilder) {
		// This does nothing by default
		return queryBuilder;
	}

	/**
	 * Configures a query builder to match this model table and configuration
	 */
	static get baseQueryBuilder(): QueryBuilder {
		const queryBuilder = new QueryBuilder(this.table).extend({
			processData: this.processResults.bind(this),

			useTimestamps: this.useTimestamps,
			createTimestamp: this.createTimestamp,
			updateTimestamp: this.updateTimestamp,

			useSoftDeletes: this.useSoftDeletes,
			softDeleteTimestamp: this.softDeleteTimestamp,
		});

		if (this.extendBaseQueryBuilder instanceof Function) {
			this.extendBaseQueryBuilder(queryBuilder);
		}

		return queryBuilder;
	}

	/**
	 * Configures a query builder to match with this model's primary key
	 * @param queryBuilder Query builder instance to add conditions to
	 * @param thisRef Uses the current instance properties to get primary key values
	 * @param ids ID or IDs to search for
	 */
	static primaryKeyCondition(queryBuilder: QueryBuilder, thisRef: ModelQueryBuilder, ids?: any[]): QueryBuilder {
		if (thisRef) {
			if (this.primaryKey instanceof Array) {
				this.primaryKey.forEach((key) => {
					queryBuilder.where(key, thisRef[key]);
				});
			} else {
				queryBuilder.where(this.primaryKey, thisRef[this.primaryKey]);
			}
		} else if (this.primaryKey instanceof Array) {
			ids.forEach((id) => {
				queryBuilder.orWhere((cb) => {
					(this.primaryKey as Array<string>).forEach((key, index) => {
						cb.where(key, id[index]);
					});
				});
			});
		} else {
			queryBuilder.whereIn(this.primaryKey, ids);
		}

		return queryBuilder;
	}

	/**
	 * Insert a data array into the table and return with [LastInsertId, AffectedRows]
	 * @param data
	 * @param ignore Weather to ignore duplicate keys or not
	 */
	static insert(data: any[], ignore?: boolean): Promise<[number, number]> {
		return this.baseQueryBuilder.insert(data, ignore);
	}

	/**
	 * Delete a record of this kind (uses soft delete if it is enabled in model)
	 * @param id
	 */
	static delete(id: TBaseValue | TBaseValue[]): Promise<number> {
		return this.primaryKeyCondition(this.baseQueryBuilder, null, [id]).delete(this.useSoftDeletes);
	}

	/**
	 * Delete all the records of this kind (uses soft delete if it is enabled in model)
	 * @param ids
	 */
	static deleteAll(...ids: (TBaseValue | TBaseValue[])[]): Promise<number> {
		return this.primaryKeyCondition(this.baseQueryBuilder, null, ids).delete(this.useSoftDeletes);
	}

	/**
	 * Restore a soft deleted record of this kind
	 * @param id
	 */
	static restore(id: TBaseValue | TBaseValue[]): Promise<number> {
		return this.primaryKeyCondition(this.baseQueryBuilder, null, [id]).restore();
	}

	/**
	 * Restore soft deleted records of this kind
	 * @param ids
	 */
	static restoreAll(...ids: (TBaseValue | TBaseValue[])[]): Promise<number> {
		return this.primaryKeyCondition(this.baseQueryBuilder, null, ids).delete(this.useSoftDeletes);
	}

	static bulkUpdate(data: any[], keys: string[] = [], silent = false): Promise<any> {
		return this.baseQueryBuilder.bulkUpdate(data, keys, silent);
	}

	/**
	 * Delete a record of this kind
	 * @param id
	 */
	static forceDelete(id: TBaseValue | TBaseValue[]): Promise<number> {
		return this.primaryKeyCondition(this.baseQueryBuilder, null, [id]).delete();
	}

	/**
	 * Delete all the records of this kind
	 * @param ids
	 */
	static forceDeleteAll(...ids: (TBaseValue | TBaseValue[])[]): Promise<number> {
		return this.primaryKeyCondition(this.baseQueryBuilder, null, ids).delete();
	}

	/**
	 * Create a base query builder configured to reach the current instance matching record
	 */
	protected get baseQueryBuilder(): QueryBuilder {
		const BaseClass = this.constructor as typeof ModelQueryBuilder;
		return BaseClass.primaryKeyCondition(BaseClass.baseQueryBuilder, this);
	}

	/* * * * * * * * * * * * * * * * * * * * * * * * * *
	 * * * * * * * * * * * * * * * * * * * * * * * * * *
	 * * *   FORWARDING METHODS TO QUERY BUILDER   * * *
	 * * * * * * * * * * * * * * * * * * * * * * * * * *
	 * * * * * * * * * * * * * * * * * * * * * * * * * */

	static pluck(keyColumn: TColumn, valueColumn: TColumn = null, override = true): Promise<any> {
		return this.baseQueryBuilder.pluck(keyColumn, valueColumn, override);
	}

	static count(): Promise<number> {
		return this.baseQueryBuilder.count();
	}

	static average(column: TColumn): Promise<number> {
		return this.baseQueryBuilder.average(column);
	}

	static sum(column: TColumn): Promise<number> {
		return this.baseQueryBuilder.sum(column);
	}

	static min(column: TColumn): Promise<any> {
		return this.baseQueryBuilder.min(column);
	}

	static max(column: TColumn): Promise<any> {
		return this.baseQueryBuilder.max(column);
	}

	static withTrashed(): QueryBuilder {
		if (this.useSoftDeletes) {
			return this.baseQueryBuilder.withTrashed();
		}

		throw new Error(`'${this.name}' model does not support soft deletes`);
	}

	static onlyTrashed(): QueryBuilder {
		if (this.useSoftDeletes) {
			return this.baseQueryBuilder.onlyTrashed();
		}

		throw new Error(`'${this.name}' model does not support soft deletes`);
	}

	static withoutTrashed(): QueryBuilder {
		if (this.useSoftDeletes) {
			return this.baseQueryBuilder.withoutTrashed();
		}

		throw new Error(`'${this.name}' model does not support soft deletes`);
	}

	static sharedLock(): QueryBuilder {
		return this.baseQueryBuilder.sharedLock();
	}

	static lockForUpdate(): QueryBuilder {
		return this.baseQueryBuilder.lockForUpdate();
	}

	static clearLock(): QueryBuilder {
		return this.baseQueryBuilder.clearLock();
	}

	static into(variableName: string): QueryBuilder {
		return this.baseQueryBuilder.into(variableName);
	}

	static select(...columns: TColumn[]): QueryBuilder {
		return this.baseQueryBuilder.select(...columns);
	}

	static selectSub(queryBuilder: QueryBuilder, alias: string): QueryBuilder {
		return this.baseQueryBuilder.selectSub(queryBuilder, alias);
	}

	static selectRaw(query: string, params?: TBaseValue[]): QueryBuilder {
		return this.baseQueryBuilder.selectRaw(query, params);
	}

	static orderBy(column: TColumn | QueryBuilder, direction?: 'asc' | 'desc' | 'ASC' | 'DESC'): QueryBuilder {
		return this.baseQueryBuilder.orderBy(column, direction);
	}

	static orderByRaw(query: string, params?: TBaseValue[]): QueryBuilder {
		return this.baseQueryBuilder.orderByRaw(query, params);
	}

	static reorder(column?: TColumn, direction?: 'asc' | 'desc' | 'ASC' | 'DESC'): QueryBuilder {
		return this.baseQueryBuilder.reorder(column, direction);
	}

	static shuffle(seed?: string): QueryBuilder {
		return this.baseQueryBuilder.shuffle(seed);
	}

	static offset(count: number): QueryBuilder {
		return this.baseQueryBuilder.offset(count);
	}

	static skip(count: number): QueryBuilder {
		return this.baseQueryBuilder.skip(count);
	}

	static limit(count: number): QueryBuilder {
		return this.baseQueryBuilder.limit(count);
	}

	static take(count: number): QueryBuilder {
		return this.baseQueryBuilder.take(count);
	}

	static selectCount(alias: string): QueryBuilder {
		return this.baseQueryBuilder.selectCount(alias);
	}

	static selectAverage(column: TColumn, alias: string): QueryBuilder {
		return this.baseQueryBuilder.selectAverage(column, alias);
	}

	static selectSum(column: TColumn, alias: string): QueryBuilder {
		return this.baseQueryBuilder.selectSum(column, alias);
	}

	static selectMin(column: TColumn, alias: string): QueryBuilder {
		return this.baseQueryBuilder.selectMin(column, alias);
	}

	static selectMax(column: TColumn, alias: string): QueryBuilder {
		return this.baseQueryBuilder.selectMax(column, alias);
	}

	static groupBy(...columns: TColumn[]): QueryBuilder {
		return this.baseQueryBuilder.groupBy(...columns);
	}

	static groupByRaw(query: string, params?: TBaseValue[]): QueryBuilder {
		return this.baseQueryBuilder.groupByRaw(query, params);
	}

	static union(queryBuilder: QueryBuilder, all = false): QueryBuilder {
		return this.baseQueryBuilder.union(queryBuilder, all);
	}

	static unionRaw(query: string, params?: TBaseValue[], all = false): QueryBuilder {
		return this.baseQueryBuilder.unionRaw(query, params, all);
	}

	static join(
		table: TTable | QueryBuilder,
		column1: TColumn | ((conditionBuilder: JoinConditionBuilder) => void),
		operator?: TOperator | TColumn,
		column2?: TColumn,
		alias?: string
	): QueryBuilder {
		return this.baseQueryBuilder.join(table, column1, operator, column2, alias);
	}

	static leftJoin(
		table: TTable | QueryBuilder,
		column1: TColumn | ((conditionBuilder: JoinConditionBuilder) => void),
		operator?: TOperator | TColumn,
		column2?: TColumn,
		alias?: string
	): QueryBuilder {
		return this.baseQueryBuilder.leftJoin(table, column1, operator, column2, alias);
	}

	static rightJoin(
		table: TTable | QueryBuilder,
		column1: TColumn | ((conditionBuilder: JoinConditionBuilder) => void),
		operator?: TOperator | TColumn,
		column2?: TColumn,
		alias?: string
	): QueryBuilder {
		return this.baseQueryBuilder.rightJoin(table, column1, operator, column2, alias);
	}

	static crossJoin(
		table: TTable | QueryBuilder,
		column1: TColumn | ((conditionBuilder: JoinConditionBuilder) => void),
		operator?: TOperator | TColumn,
		column2?: TColumn,
		alias?: string
	): QueryBuilder {
		return this.baseQueryBuilder.crossJoin(table, column1, operator, column2, alias);
	}

	static outerJoin(
		table: TTable | QueryBuilder,
		column1: TColumn | ((conditionBuilder: JoinConditionBuilder) => void),
		operator?: TOperator | TColumn,
		column2?: TColumn,
		alias?: string
	): QueryBuilder {
		return this.baseQueryBuilder.outerJoin(table, column1, operator, column2, alias);
	}

	static where(
		column: TColumn | QueryBuilder | ((conditionBuilder: WhereConditionBuilder) => void),
		operator?: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.where(column, operator, value);
	}

	static orWhere(
		column: TColumn | QueryBuilder | ((conditionBuilder: WhereConditionBuilder) => void),
		operator?: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.orWhere(column, operator, value);
	}

	static whereNull(column: TColumn | QueryBuilder): QueryBuilder {
		return this.baseQueryBuilder.whereNull(column);
	}

	static orWhereNull(column: TColumn | QueryBuilder): QueryBuilder {
		return this.baseQueryBuilder.orWhereNull(column);
	}

	static whereNotNull(column: TColumn | QueryBuilder): QueryBuilder {
		return this.baseQueryBuilder.whereNotNull(column);
	}

	static orWhereNotNull(column: TColumn | QueryBuilder): QueryBuilder {
		return this.baseQueryBuilder.orWhereNotNull(column);
	}

	static whereBetween(column: TColumn | QueryBuilder, values: [TBaseValue, TBaseValue] | QueryBuilder): QueryBuilder {
		return this.baseQueryBuilder.whereBetween(column, values);
	}

	static orWhereBetween(column: TColumn | QueryBuilder, values: [TBaseValue, TBaseValue] | QueryBuilder): QueryBuilder {
		return this.baseQueryBuilder.orWhereBetween(column, values);
	}

	static whereNotBetween(
		column: TColumn | QueryBuilder,
		values: [TBaseValue, TBaseValue] | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.whereNotBetween(column, values);
	}

	static orWhereNotBetween(
		column: TColumn | QueryBuilder,
		values: [TBaseValue, TBaseValue] | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.orWhereNotBetween(column, values);
	}

	static whereIn(column: TColumn | QueryBuilder, values: TBaseValue[] | QueryBuilder): QueryBuilder {
		return this.baseQueryBuilder.whereIn(column, values);
	}

	static orWhereIn(column: TColumn | QueryBuilder, values: TBaseValue[] | QueryBuilder): QueryBuilder {
		return this.baseQueryBuilder.orWhereIn(column, values);
	}

	static whereNotIn(column: TColumn | QueryBuilder, values: TBaseValue[] | QueryBuilder): QueryBuilder {
		return this.baseQueryBuilder.whereNotIn(column, values);
	}

	static orWhereNotIn(column: TColumn | QueryBuilder, values: TBaseValue[] | QueryBuilder): QueryBuilder {
		return this.baseQueryBuilder.orWhereNotIn(column, values);
	}

	static whereLike(column: TColumn | QueryBuilder, value: string): QueryBuilder {
		return this.baseQueryBuilder.whereLike(column, value);
	}

	static orWhereLike(column: TColumn | QueryBuilder, value: string): QueryBuilder {
		return this.baseQueryBuilder.orWhereLike(column, value);
	}

	static whereNotLike(column: TColumn | QueryBuilder, value: string): QueryBuilder {
		return this.baseQueryBuilder.whereNotLike(column, value);
	}

	static orWhereNotLike(column: TColumn | QueryBuilder, value: string): QueryBuilder {
		return this.baseQueryBuilder.orWhereNotLike(column, value);
	}

	static whereColumn(firstColumn: TColumn, operator: TOperator | TColumn, secondColumn?: TColumn): QueryBuilder {
		return this.baseQueryBuilder.whereColumn(firstColumn, operator, secondColumn);
	}

	static orWhereColumn(firstColumn: TColumn, operator: TOperator | TColumn, secondColumn?: TColumn): QueryBuilder {
		return this.baseQueryBuilder.orWhereColumn(firstColumn, operator, secondColumn);
	}

	static whereDate(
		column: TColumn | QueryBuilder,
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.whereDate(column, operator, value);
	}

	static orWhereDate(
		column: TColumn | QueryBuilder,
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.orWhereDate(column, operator, value);
	}

	static whereYear(
		column: TColumn | QueryBuilder,
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.whereYear(column, operator, value);
	}

	static orWhereYear(
		column: TColumn | QueryBuilder,
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.orWhereYear(column, operator, value);
	}

	static whereMonth(
		column: TColumn | QueryBuilder,
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.whereMonth(column, operator, value);
	}

	static orWhereMonth(
		column: TColumn | QueryBuilder,
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.orWhereMonth(column, operator, value);
	}

	static whereDay(
		column: TColumn | QueryBuilder,
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.whereDay(column, operator, value);
	}

	static orWhereDay(
		column: TColumn | QueryBuilder,
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.orWhereDay(column, operator, value);
	}

	static whereTime(
		column: TColumn | QueryBuilder,
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.whereTime(column, operator, value);
	}

	static orWhereTime(
		column: TColumn | QueryBuilder,
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.orWhereTime(column, operator, value);
	}

	static whereRaw(query: string, params?: TBaseValue[]): QueryBuilder {
		return this.baseQueryBuilder.whereRaw(query, params);
	}

	static orWhereRaw(query: string, params?: TBaseValue[]): QueryBuilder {
		return this.baseQueryBuilder.orWhereRaw(query, params);
	}

	static having(
		column: TColumn | QueryBuilder | ((conditionBuilder: HavingConditionBuilder) => void),
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.having(column, operator, value);
	}

	static orHaving(
		column: TColumn | QueryBuilder | ((conditionBuilder: HavingConditionBuilder) => void),
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.orHaving(column, operator, value);
	}

	static havingNull(column: TColumn | QueryBuilder): QueryBuilder {
		return this.baseQueryBuilder.havingNull(column);
	}

	static orHavingNull(column: TColumn | QueryBuilder): QueryBuilder {
		return this.baseQueryBuilder.orHavingNull(column);
	}

	static havingNotNull(column: TColumn | QueryBuilder): QueryBuilder {
		return this.baseQueryBuilder.havingNotNull(column);
	}

	static orHavingNotNull(column: TColumn | QueryBuilder): QueryBuilder {
		return this.baseQueryBuilder.orHavingNotNull(column);
	}

	static havingBetween(column: TColumn | QueryBuilder, values: [TBaseValue, TBaseValue] | QueryBuilder): QueryBuilder {
		return this.baseQueryBuilder.havingBetween(column, values);
	}

	static orHavingBetween(
		column: TColumn | QueryBuilder,
		values: [TBaseValue, TBaseValue] | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.orHavingBetween(column, values);
	}

	static havingNotBetween(
		column: TColumn | QueryBuilder,
		values: [TBaseValue, TBaseValue] | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.havingNotBetween(column, values);
	}

	static orHavingNotBetween(
		column: TColumn | QueryBuilder,
		values: [TBaseValue, TBaseValue] | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.orHavingNotBetween(column, values);
	}

	static havingIn(column: TColumn | QueryBuilder, values: TBaseValue[] | QueryBuilder): QueryBuilder {
		return this.baseQueryBuilder.havingIn(column, values);
	}

	static orHavingIn(column: TColumn | QueryBuilder, values: TBaseValue[] | QueryBuilder): QueryBuilder {
		return this.baseQueryBuilder.orHavingIn(column, values);
	}

	static havingNotIn(column: TColumn | QueryBuilder, values: TBaseValue[] | QueryBuilder): QueryBuilder {
		return this.baseQueryBuilder.havingNotIn(column, values);
	}

	static orHavingNotIn(column: TColumn | QueryBuilder, values: TBaseValue[] | QueryBuilder): QueryBuilder {
		return this.baseQueryBuilder.orHavingNotIn(column, values);
	}

	static havingLike(column: TColumn | QueryBuilder, value: string): QueryBuilder {
		return this.baseQueryBuilder.havingLike(column, value);
	}

	static orHavingLike(column: TColumn | QueryBuilder, value: string): QueryBuilder {
		return this.baseQueryBuilder.orHavingLike(column, value);
	}

	static havingNotLike(column: TColumn | QueryBuilder, value: string): QueryBuilder {
		return this.baseQueryBuilder.havingNotLike(column, value);
	}

	static orHavingNotLike(column: TColumn | QueryBuilder, value: string): QueryBuilder {
		return this.baseQueryBuilder.orHavingNotLike(column, value);
	}

	static havingColumn(firstColumn: TColumn, operator: TOperator | TColumn, secondColumn?: TColumn): QueryBuilder {
		return this.baseQueryBuilder.havingColumn(firstColumn, operator, secondColumn);
	}

	static orHavingColumn(firstColumn: TColumn, operator: TOperator | TColumn, secondColumn?: TColumn): QueryBuilder {
		return this.baseQueryBuilder.orHavingColumn(firstColumn, operator, secondColumn);
	}

	static havingDate(
		column: TColumn | QueryBuilder,
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.havingDate(column, operator, value);
	}

	static orHavingDate(
		column: TColumn | QueryBuilder,
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.orHavingDate(column, operator, value);
	}

	static havingYear(
		column: TColumn | QueryBuilder,
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.havingYear(column, operator, value);
	}

	static orHavingYear(
		column: TColumn | QueryBuilder,
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.orHavingYear(column, operator, value);
	}

	static havingMonth(
		column: TColumn | QueryBuilder,
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.havingMonth(column, operator, value);
	}

	static orHavingMonth(
		column: TColumn | QueryBuilder,
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.orHavingMonth(column, operator, value);
	}

	static havingDay(
		column: TColumn | QueryBuilder,
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.havingDay(column, operator, value);
	}

	static orHavingDay(
		column: TColumn | QueryBuilder,
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.orHavingDay(column, operator, value);
	}

	static havingTime(
		column: TColumn | QueryBuilder,
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.havingTime(column, operator, value);
	}

	static orHavingTime(
		column: TColumn | QueryBuilder,
		operator: TOperator | TBaseValue | QueryBuilder,
		value?: TBaseValue | QueryBuilder
	): QueryBuilder {
		return this.baseQueryBuilder.orHavingTime(column, operator, value);
	}

	static havingRaw(query: string, params?: TBaseValue[]): QueryBuilder {
		return this.baseQueryBuilder.havingRaw(query, params);
	}

	static orHavingRaw(query: string, params?: TBaseValue[]): QueryBuilder {
		return this.baseQueryBuilder.orHavingRaw(query, params);
	}
}
