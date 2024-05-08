import {getInstance} from '../index';
import Table from '../migration/table';
import log from '../utils/log';

export default class Schema {
	static async create(tableName: string, tableCallback: (table: Table) => void, update = false, instanceKey: string = 'default'): Promise<any> {
		try {
			const table = new Table(tableName);

			if (tableCallback instanceof Function) tableCallback(table);

			const db = getInstance(instanceKey);

			try {
				await db.disableForeignKeyChecks();
				await db.createTable(table);
				await db.enableForeignKeyChecks();

				log.success('Created', tableName);
			} catch (error) {
				if (error.code === 'ER_TABLE_EXISTS_ERROR') {
					if (update) {
						try {
							await db.disableForeignKeyChecks();
							await db.updateTable(table);
							await db.enableForeignKeyChecks();

							log.success('Updated', tableName);
						} catch (err) {
							log.error('Update Table Failed', err);
						}
					} else {
						log.warning('Already Created', tableName);
					}
				} else {
					log.error('Create Table Failed', error);
				}
			}
		} catch (ex) {
			log.error('Initialize Table Instance Failed', ex);
		}
	}

	static async drop(tableName: string, instanceKey: string = 'default'): Promise<any> {
		try {
			const db = getInstance(instanceKey);

			await db.disableForeignKeyChecks();
			await db.dropTable(tableName);
			await db.enableForeignKeyChecks();

			log.warning('Deleted', `${tableName} table`);
		} catch (ex) {
			log.error('Drop Table Failed', ex);
		}
	}

	static async dropIfExists(tableName: string, instanceKey: string = 'default'): Promise<any> {
		try {
			const db = getInstance(instanceKey)

			await db.disableForeignKeyChecks();
			await db.dropTableIfExists(tableName);
			await db.enableForeignKeyChecks();

			log.warning('Deleted', `${tableName} table`);
		} catch (ex) {
			log.error('Drop Table Failed', ex);
		}
	}
}
