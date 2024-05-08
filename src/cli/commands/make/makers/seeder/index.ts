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
			const seedersDir = path.resolve(process.cwd(), ORMConfig.seedersPath);
			if (!fs.existsSync(seedersDir)) {
				fs.mkdirSync(seedersDir, { recursive: true });
			}

			const filepath = path.resolve(seedersDir, `${filename}.ts`);

			if (!fs.existsSync(filepath)) {
				const className = `${pascalCase(pluralName)}TableSeeder`;

				const content = template.replace(/CLASS_NAME/g, className);

				fs.writeFileSync(filepath, content);

				log.success('Seeder Created', `'${filename}' created successfully.`);
			} else {
				log.error('Seeder Exists', `There is already a seeder named '${filename}'`);
			}
		} else {
			log.error('[Silvie ORM] Config File Not Found');
		}
	} else {
		log.error('No Name', 'You have to specify seeder name');
	}
};
