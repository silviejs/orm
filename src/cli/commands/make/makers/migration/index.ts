import fs from 'fs';
import path from 'path';
import pluralize from 'pluralize';
import { pascalCase, snakeCase } from 'change-case';
import log from '../../../../../utils/log';
import readORMConfig from "../../../../../utils/config";

const template = fs.readFileSync(path.resolve(__dirname, 'template'), { encoding: 'utf8' });

export default (args: { _: string[] }) => {
	const name = args._[2];

	if (name) {
		const pluralName = pluralize(name);
		const filename = snakeCase(pluralName);

		const ORMConfig = readORMConfig();

		if (ORMConfig) {
			const migrationsDir = path.resolve(process.cwd(), ORMConfig.migrationsPath);
			if (!fs.existsSync(migrationsDir)) {
				fs.mkdirSync(migrationsDir, { recursive: true });
			}

			const filepath = path.resolve(migrationsDir, `${filename}.ts`);

			if (!fs.existsSync(filepath)) {
				const className = `${pascalCase(pluralName)}TableMigration`;

				const content = template.replace(/CLASS_NAME/g, className).replace(/TABLE_NAME/g, filename);

				fs.writeFileSync(filepath, content);

				log.success('Migration Created', `'${filename}' created successfully.`);
			} else {
				log.error('Migration Exists', `There is already a migration named '${filename}'`);
			}
		} else {
			log.error('[Silvie ORM] Config File Not Found');
		}
	} else {
		log.error('No Name', 'You have to specify migration name');
	}
};
