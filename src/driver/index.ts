import Table from '../migration/table';
import QueryBuilder from '../builders/query';
import { TBaseValue, TColumn } from '../builders/condition';

export type TModificationResult = [number, number];
export type TInsertionResult = [any, number];

export default interface IDatabaseDriver {
	select(queryBuilder: QueryBuilder): Promise<any>;
	exists(queryBuilder: QueryBuilder): Promise<boolean>;

	count(queryBuilder: QueryBuilder): Promise<number>;
	average(queryBuilder: QueryBuilder, column: TColumn): Promise<number>;
	sum(queryBuilder: QueryBuilder, column: TColumn): Promise<number>;
	min(queryBuilder: QueryBuilder, column: TColumn): Promise<any>;
	max(queryBuilder: QueryBuilder, column: TColumn): Promise<any>;

	insert(queryBuilder: QueryBuilder): Promise<TInsertionResult>;

	update(queryBuilder: QueryBuilder): Promise<TModificationResult>;
	bulkUpdate(queryBuilder: QueryBuilder): Promise<TModificationResult>;

	delete(queryBuilder: QueryBuilder): Promise<TModificationResult>;
	softDelete(queryBuilder: QueryBuilder): Promise<TModificationResult>;
	restore(queryBuilder: QueryBuilder): Promise<TModificationResult>;

	createTable(table: Table): Promise<any>;
	updateTable(table: Table): Promise<any>;
	truncateTable(tableName: string): Promise<any>;
	dropTableIfExists(tableName: string): Promise<any>;
	dropTable(tableName: string): Promise<any>;

	setForeignKeyChecks(state: boolean): Promise<any>;

	execute(query: string, params?: TBaseValue[]): Promise<any>;

	closeConnection(): void;
}
