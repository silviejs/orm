/* eslint-disable @typescript-eslint/no-var-requires,global-require,import/no-dynamic-require,no-await-in-loop,no-restricted-syntax */

import fs from 'fs';
import path from 'path';
import log from '../../../utils/log';
import readORMConfig from "../../../utils/config";
import Database, {DatabaseInstances} from '../../../index';

import babelRegister from '@babel/register';
import * as process from "process";

process.env.BABEL_DISABLE_CACHE = '1';
babelRegister({
	configFile: path.resolve(__dirname, '../../assets/babel.config.js'),
	extensions: ['.ts', '.js', '.json'],
	ignore: [],
});

export default async (args: { _: string[]; rollback: boolean; refresh: boolean; update: boolean; all: boolean }) => {
	const ORMConfig = readORMConfig();

	if (ORMConfig) {
		const migrationsDir = path.resolve(process.cwd(), ORMConfig.migrationsPath);

		let filenames = args._.slice(1);

		if (args.all && filenames.length === 0) {
			filenames = fs.readdirSync(migrationsDir).map((file) => file.replace(/\.ts$/, ''));
		}

		if (filenames.length > 0) {
			filenames = filenames.filter((file) => {
				const exists = fs.existsSync(path.resolve(migrationsDir, `${file}.ts`));

				if (!exists) {
					log.error('[Silvie ORM] Migration File Not Found');
					log(`There is no migration named '${file}'`);
				}

				return exists;
			});
		}

		if (filenames.length > 0) {
			const migrations = filenames
				.map((file) => {
					const migration = require(path.resolve(migrationsDir, file)).default;

					if (!migration) {
						log.error('[Silvie ORM] Migration Not Found');
						log(`There is no migration in '${file}'`);
					}

					return migration;
				})
				.sort((a, b) => (a.order || 0) - (b.order || 0));

			if (args.rollback || args.refresh) {
				for (const migration of migrations) {
					await migration.down?.();
				}
			}

			if (!args.rollback) {
				if (args.update) {
					for (const migration of migrations) {
						await migration.update?.();
					}
				} else {
					for (const migration of migrations) {
						await migration.up?.();
					}
				}
			}

			Object.values(DatabaseInstances).forEach((instance) => instance.closeConnection());

			process.exit(0);
		} else {
			log.warning('[Silvie ORM] No Migrations Found');
			log("You can create new migrations using 'sorm make migration'");
		}
	} else {
		log.error('[Silvie ORM] Config File Not Found');
	}
};
