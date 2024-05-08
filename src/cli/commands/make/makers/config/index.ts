import fs from 'fs';
import path from 'path';
import log from '../../../../../utils/log';

const template = fs.readFileSync(path.resolve(__dirname, 'template'), { encoding: 'utf8' });

export default () => {
	const filepath = path.resolve(process.cwd(), 'silvie.orm.config.ts');

	if (!fs.existsSync(filepath)) {
		fs.writeFileSync(filepath, template);

		log.success('Config Created', `ORM config file created successfully.`);
	} else {
		log.error('Config Exists', `There is an existing config file`);
	}
};
