import log from '../../../../utils/log';

const options = {
	'--all': 'Run all seeders',
};

export default () => {
	log.warning('SILVIE ORM - Seed');
	log('This command will run one or all seeders to inject data into the database.');

	log();
	log.info('Options:');
	Object.keys(options).forEach((option) => {
		log(' ', option.padEnd(20, ' '), '\t', options[option]);
	});

	log();
	log.info('Usage:');
	log('  sorm seed');
	log('  sorm seed [seeder]');
};
