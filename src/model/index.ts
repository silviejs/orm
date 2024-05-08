import ModelQueryBuilder, { IModel } from '../model/query_builder';
import { TBaseValue } from '../builders/condition';

export type TModelHook =
	| 'beforeCreate'
	| 'afterCreate'
	| 'beforeUpdate'
	| 'afterUpdate'
	| 'beforeDelete'
	| 'afterDelete'
	| 'beforeRestore'
	| 'afterRestore';

export default class Model extends ModelQueryBuilder implements IModel {
	private static hooks: Record<TModelHook, CallableFunction[]> = {
		beforeCreate: [],
		afterCreate: [],
		beforeUpdate: [],
		afterUpdate: [],
		beforeDelete: [],
		afterDelete: [],
		beforeRestore: [],
		afterRestore: [],
	};

	static hook(name: TModelHook, callback: CallableFunction) {
		if (!Model.hooks?.[name]?.includes(callback)) {
			Model.hooks[name].push(callback);
		}
	}

	static unhook(name: TModelHook, callback: CallableFunction) {
		if (Model.hooks?.[name]?.includes(callback)) {
			Model.hooks[name] = Model.hooks[name].filter((h) => h !== callback);
		}
	}

	private static runHook(name, method, params) {
		Model.hooks?.[name]?.forEach((h) => {
			h({method, params});
		});
	}

	/**
	 * Fetch all records from the table
	 */
	static async all(): Promise<Model[]> {
		return this.castAll(await this.baseQueryBuilder.get()) as Model[];
	}

	/**
	 * Find a record in the table with the given id
	 * @param id
	 */
	static async find(id: TBaseValue | TBaseValue[]): Promise<Model> {
		const result = await this.primaryKeyCondition(this.baseQueryBuilder, null, [id]).first();

		return result ? (this.cast(result) as Model) : null;
	}

	static async findAll(...ids: (TBaseValue | TBaseValue[])[]): Promise<Model[]> {
		const results = await this.primaryKeyCondition(this.baseQueryBuilder, null, ids).get();

		return results.length > 0 ? (this.castAll(results) as Model[]) : [];
	}

	/**
	 * Insert a single record into the table and return with either created record or InsertedId
	 * @param data
	 * @param shouldReturn Specify to return the created record or not, defaults to true
	 */
	static async create(data: any, shouldReturn = true): Promise<Model> {
		Model.runHook('beforeCreate', 'create', {data, shouldReturn});

		const [insertId] = await this.baseQueryBuilder.insert([data]);

		Model.runHook('afterCreate', 'create', {data, shouldReturn});

		if (shouldReturn) {
			if (this.primaryKey instanceof Array) {
				return this.find(this.primaryKey.map((key) => data[key]));
			}

			return this.find(insertId);
		}

		return insertId;
	}

	/**
	 * Fill this instance with the provided data
	 * @param data
	 */
	fill(data: any): void {
		Object.keys(data).forEach((key) => {
			this[key] = data[key];
		});
	}

	/**
	 * Retrieve a fresh copy of this instance from the database
	 */
	async fresh(): Promise<Model> {
		return (this.constructor as typeof Model).cast(await this.baseQueryBuilder.first()) as Model;
	}

	/**
	 * Refresh the current instance from the database
	 */
	async refresh(): Promise<void> {
		const result = await this.baseQueryBuilder.first();
		Object.assign(this as any, result);
	}

	/**
	 * Update the current instance with the provided data
	 * @param data
	 * @param silent Weather to refresh the update timestamp or not
	 */
	async update(data: any, silent = false): Promise<number> {
		Model.runHook('beforeUpdate', 'update', {self: this, data, silent});

		const result = await this.baseQueryBuilder.update(data, silent);

		Model.runHook('afterUpdate', 'update', {self: this, data, silent});

		if (result.affectedRows > 0) {
			this.fill(data);
		}

		return result;
	}

	/**
	 * Delete the current instance (uses soft delete if it is enabled in model)
	 */
	async delete(): Promise<any> {
		Model.runHook('beforeDelete', 'delete', {self: this});

		const result = await this.baseQueryBuilder.delete((this.constructor as typeof Model).useSoftDeletes);

		Model.runHook('afterDelete', 'delete', {self: this});

		return result;
	}


	/**
	 * Delete the current instance
	 */
	async forceDelete(): Promise<number> {
		Model.runHook('beforeDelete', 'forceDelete', {self: this});

		const result = await this.baseQueryBuilder.delete();

		Model.runHook('afterDelete', 'forceDelete', {self: this});

		return result;
	}

	/**
	 * Save the changes of current instance in the database
	 * @param silent Weather to refresh the update timestamp or not
	 */
	async save(silent?: boolean): Promise<number> {
		Model.runHook('beforeUpdate', 'save', {self: this, silent});
		const result = await this.update(this, silent);
		Model.runHook('afterUpdate', 'save', {self: this, silent});
		return result;
	}


	static async insert(data: any[], ignore?: boolean): Promise<[number, number]> {
		Model.runHook('beforeCreate', 'insert', {data, ignore});
		const result = await super.insert(data, ignore);
		Model.runHook('afterCreate', 'insert', {data, ignore});
		return result;
	}

	static async restore(id: TBaseValue | TBaseValue[]): Promise<number> {
		Model.runHook('beforeRestore', 'restore', {id});
		const result = await super.restore(id);
		Model.runHook('afterRestore', 'restore', {id});
		return result;
	}

	static async restoreAll(...ids: (TBaseValue | TBaseValue[])[]): Promise<number> {
		Model.runHook('beforeRestore', 'restoreAll', {ids});
		const result = await super.restoreAll(...ids);
		Model.runHook('afterRestore', 'restoreAll', {ids});
		return result;
	}

	static async bulkUpdate(data: any[], keys?: string[], silent?: boolean): Promise<any> {
		Model.runHook('beforeUpdate', 'bulkUpdate', {data, keys, silent});
		const result = await super.bulkUpdate(data, keys, silent);
		Model.runHook('afterUpdate', 'bulkUpdate', {data, keys, silent});
		return result;
	}

	static async delete(id: TBaseValue | TBaseValue[]): Promise<number> {
		Model.runHook('beforeDelete', 'delete', {id});
		const result = await super.delete(id);
		Model.runHook('afterDelete', 'delete', {id});
		return result;
	}

	static async deleteAll(...ids: (TBaseValue | TBaseValue[])[]): Promise<number> {
		Model.runHook('beforeDelete', 'deleteAll', {ids});
		const result = await super.deleteAll(...ids);
		Model.runHook('afterDelete', 'deleteAll', {ids});
		return result;
	}

	static async forceDelete(id: TBaseValue | TBaseValue[]): Promise<number> {
		Model.runHook('beforeDelete', 'forceDelete', {id});
		const result = await super.forceDelete(id);
		Model.runHook('afterDelete', 'forceDelete', {id});
		return result;
	}

	static async forceDeleteAll(...ids: (TBaseValue | TBaseValue[])[]): Promise<number> {
		Model.runHook('beforeDelete', 'forceDeleteAll', {ids});
		const result = await super.forceDeleteAll(...ids);
		Model.runHook('afterDelete', 'forceDeleteAll', {ids});
		return result;
	}

}