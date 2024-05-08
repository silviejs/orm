import drivers from './driver/drivers';

import MySQLDriver, {MySQLTypes, ReverseMySQLTypes} from './driver/drivers/mysql';
import Model from './model/index';
import LineStringData from './driver/drivers/mysql/datatypes/spatial/linestring';
import MultiPolygonData from './driver/drivers/mysql/datatypes/spatial/multipolygon';
import SpatialData from './driver/drivers/mysql/datatypes/spatial';
import MultiPointData from './driver/drivers/mysql/datatypes/spatial/multipoint';
import PolygonData from './driver/drivers/mysql/datatypes/spatial/polygon';
import PointData from './driver/drivers/mysql/datatypes/spatial/point';
import MultiLineStringData from './driver/drivers/mysql/datatypes/spatial/multilinestring';
import HavingConditionBuilder from './builders/condition/having';
import JoinConditionBuilder from './builders/condition/join';
import WhereConditionBuilder from './builders/condition/where';
import QueryBuilder from './builders/query';
import Schema from './migration/schema';
import Table from './migration/table';
import Column from './migration/column';
import ModelQueryBuilder from './model/query_builder';

import type IDatabaseDriver from './driver';
import type IConditionBuilder from './builders/condition';
import type {ICondition} from './builders/condition';
import type {IOrder, IAliasTable, IGroup, IUnion, IJoin, ISelect} from './builders/query/types';
import type {IRelation, IConstraintCollection} from './migration/table';
import type IColumnOptions from './migration/column';
import type {IModel, IModelRelation} from './model/query_builder';

import type {TModificationResult, TInsertionResult} from './driver';
import type {TOperator, TBaseValue, TValue, TColumn, TTable} from './builders/condition';
import type {TConditionType} from './builders/condition';
import type {TAggregateType} from './builders/query/types';
import type {TModelHook} from './model';


export {
	MySQLDriver,
	MySQLTypes,
	ReverseMySQLTypes,
	Model,
	LineStringData,
	MultiPolygonData,
	SpatialData,
	MultiPointData,
	PolygonData,
	PointData,
	MultiLineStringData,
	HavingConditionBuilder,
	JoinConditionBuilder,
	WhereConditionBuilder,
	QueryBuilder,
	Schema,
	Table,
	Column,
	ModelQueryBuilder,
	IDatabaseDriver,
	IConditionBuilder,
	ICondition,
	IOrder,
	IAliasTable,
	IGroup,
	IUnion,
	IJoin,
	ISelect,
	IRelation,
	IConstraintCollection,
	IColumnOptions,
	IModel,
	IModelRelation,
	TModificationResult,
	TInsertionResult,
	TOperator,
	TBaseValue,
	TValue,
	TColumn,
	TTable,
	TConditionType,
	TAggregateType,
	TModelHook,
}

export const DatabaseInstances: Record<string, Database> = {};

export function getInstance(instanceKey: string): Database {
	const db = DatabaseInstances[instanceKey];
	if (!db) {
		throw new Error(`Database Instance '${instanceKey}' Not Found!`);
	}

	return db;
}

export default class Database {
	/**
	 * The database driver instance
	 * @private
	 */
	private privDriver: IDatabaseDriver;

	private get driver(): IDatabaseDriver {
		if (this.privDriver) {
			return this.privDriver;
		}

		throw new Error('Database is not initialized');
	}

	/**
	 * Initializes a database driver based on the given config
	 */
	constructor(config = {} as any, instanceKey?: string) {
		const type = config.type;

		if (type in drivers) {
			this.privDriver = new drivers[type]({
				host: config.host,
				port: config.port,

				database: config.database,
				username: config.username,
				password: config.password,

				...(config[type] ?? {}),
			});
		} else {
			throw new Error('Could not initiate database instance');
		}

		if (instanceKey) {
			DatabaseInstances[instanceKey] = this;
		}
	}

	select(queryBuilder: QueryBuilder): Promise<any> {
		return this.driver.select(queryBuilder);
	}

	exists(queryBuilder: QueryBuilder): Promise<any> {
		return this.driver.exists(queryBuilder);
	}

	count(queryBuilder: QueryBuilder): Promise<number> {
		return this.driver.count(queryBuilder);
	}

	average(queryBuilder: QueryBuilder, column: TColumn): Promise<number> {
		return this.driver.average(queryBuilder, column);
	}

	sum(queryBuilder: QueryBuilder, column: TColumn): Promise<number> {
		return this.driver.sum(queryBuilder, column);
	}

	min(queryBuilder: QueryBuilder, column: TColumn): Promise<any> {
		return this.driver.min(queryBuilder, column);
	}

	max(queryBuilder: QueryBuilder, column: TColumn): Promise<any> {
		return this.driver.max(queryBuilder, column);
	}

	insert(queryBuilder: QueryBuilder): Promise<any> {
		return this.driver.insert(queryBuilder);
	}

	update(queryBuilder: QueryBuilder): Promise<any> {
		return this.driver.update(queryBuilder);
	}

	bulkUpdate(queryBuilder: QueryBuilder): Promise<any> {
		return this.driver.bulkUpdate(queryBuilder);
	}

	delete(queryBuilder: QueryBuilder): Promise<any> {
		return this.driver.delete(queryBuilder);
	}

	softDelete(queryBuilder: QueryBuilder): Promise<any> {
		return this.driver.softDelete(queryBuilder);
	}

	restore(queryBuilder: QueryBuilder): Promise<any> {
		return this.driver.restore(queryBuilder);
	}

	raw(query: string, params?: TBaseValue[]): Promise<any> {
		return this.driver.execute(query, params);
	}

	/**
	 * Creates a table from the given table instance
	 * @param table
	 */
	createTable(table: Table): Promise<any> {
		return this.driver.createTable(table);
	}

	/**
	 * Creates a table from the given table instance
	 * @param table
	 */
	updateTable(table: Table): Promise<any> {
		return this.driver.updateTable(table);
	}

	/**
	 * Empties a table
	 * @param tableName
	 */
	truncateTable(tableName: string): Promise<any> {
		return this.driver.truncateTable(tableName);
	}

	/**
	 * Drops a table without any further checks
	 * @param tableName
	 */
	dropTable(tableName: string): Promise<any> {
		return this.driver.dropTable(tableName);
	}

	/**
	 * Drops a table if it exists
	 * @param tableName
	 */
	dropTableIfExists(tableName: string): Promise<any> {
		return this.driver.dropTableIfExists(tableName);
	}

	/**
	 * Specify weather to check for foreign keys or not
	 */
	checkForeignKeys(state: boolean): Promise<any> {
		return this.driver.setForeignKeyChecks(state);
	}

	/**
	 * This will enable foreign key checks
	 */
	enableForeignKeyChecks(): Promise<any> {
		return this.checkForeignKeys(true);
	}

	/**
	 * This will disable foreign key checks
	 */
	disableForeignKeyChecks(): Promise<any> {
		return this.checkForeignKeys(false);
	}

	/**
	 * Closes the current database connection
	 */
	closeConnection(): void {
		this.driver.closeConnection();
	}
}
