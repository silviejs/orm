import log from '../../../../utils/log';

const makers = {
	config: 'ORM Config File',
	migration: 'Database Migration',
	seeder: 'Database Seeder',
	model: 'Database Model',
};

const options = {
	'-M --model': 'Make a model for the entity',
	'-S --seeder': 'Make a seeder for the entity',
	'-m --migration': 'Make a migration for the entity',
};

export default () => {
	log.warning('SILVIE ORM - Make');
	log('This command helps you create files like: models, migrations, etc. from their predefined templates.');
	log('Entity make commands can be combined through the available options.');

	log();
	log.info('Makers:');
	Object.keys(makers).forEach((maker) => {
		log(' ', maker.padEnd(20, ' '), '\t', makers[maker]);
	});

	log();
	log.info('Options:');
	Object.keys(options).forEach((option) => {
		log(' ', option.padEnd(20, ' '), '\t', options[option]);
	});

	log();
	log.info('Usage:');
	log('  sorm make migration [name]');
	log('  sorm make model [name] -m');
};
