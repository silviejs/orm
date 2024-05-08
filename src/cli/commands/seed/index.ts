import fs from 'fs';
import path from 'path';
import log from '../../../utils/log';
import readORMConfig from "../../../utils/config";
import { DatabaseInstances } from '../../../index';

import babelRegister from '@babel/register';
import process from "process";

process.env.BABEL_DISABLE_CACHE = '1';
babelRegister({
	configFile: path.resolve(__dirname, '../../assets/babel.config.js'),
	extensions: ['.ts', '.js', '.json'],
	ignore: [],
});

export default async (args: { _: string[], all: boolean }) => {
	const ORMConfig = readORMConfig();

	if (ORMConfig) {
		const seedersDir = path.resolve(process.cwd(), ORMConfig.seedersPath);

		let filenames = args._.slice(1);

		if (args.all && filenames.length === 0) {
			filenames = fs.readdirSync(seedersDir).map((file) => file.replace(/\.ts$/, ''));
		}

		if (filenames.length > 0) {
			filenames = filenames.filter((file) => {
				const exists = fs.existsSync(path.resolve(seedersDir, `${file}.ts`));

				if (!exists) {
					log.error('[Silvie ORM] Seeder File Not Found');
					log(`There is no seeder named '${file}'`);
				}

				return exists;
			});
		}

		if (filenames.length > 0) {
			const seeders = filenames
				.map((file) => {
					const seeder = require(path.resolve(seedersDir, file)).default;

					if (!seeder) {
						log.error('[Silvie ORM] Seeder Not Found');
						log(`There is no migration in '${file}'`);
					}

					seeder.filename = file;

					return seeder;
				})
				.sort((a, b) => (a.order || 0) - (b.order || 0));

			for (const seeder of seeders) {
				try {
					await seeder.seed?.();

					log.success('Seeded', `Successfully seeded '${seeder.filename}'`);
				} catch (error) {
					log.error('Seed Failed', `Could not seed '${seeder.filename}'`);
					log(error);
				}
			}

			Object.values(DatabaseInstances).forEach((instance) => instance.closeConnection());

			process.exit(0);
		} else {
			log.warning('[Silvie ORM] No Seeders Found');
			log("You can create new seeders using 'sorm make seeder'");
		}
	} else {
		log.error('[Silvie ORM] Config File Not Found');
	}
};
