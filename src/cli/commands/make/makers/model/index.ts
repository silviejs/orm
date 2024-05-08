import fs from 'fs';
import path from 'path';
import { pascalCase, snakeCase } from 'change-case';
import log from '../../../../../utils/log';
import readORMConfig from "../../../../../utils/config";

const template = fs.readFileSync(path.resolve(__dirname, 'template'), { encoding: 'utf8' });

export default (args: { _: string[] }) => {
	const name = args._[2];

	if (name) {
		const filename = snakeCase(name);


		const ORMConfig = readORMConfig();

		if (ORMConfig) {
			const modelsDir = path.resolve(process.cwd(), ORMConfig.modelsPath);
			if (!fs.existsSync(modelsDir)) {
				fs.mkdirSync(modelsDir, { recursive: true });
			}

			const filepath = path.resolve(modelsDir, `${filename}.ts`);

			if (!fs.existsSync(filepath)) {
				const className = pascalCase(name);

				const content = template.replace(/CLASS_NAME/g, className);

				fs.writeFileSync(filepath, content);

				log.success('Model Created', `'${className}' created successfully.`);
			} else {
				log.error('Model Exists', `There is already a model named '${filename}'`);
			}
		} else {
			log.error('[Silvie ORM] Config File Not Found');
		}
	} else {
		log.error('No Name', 'You have to specify model name');
	}
};
