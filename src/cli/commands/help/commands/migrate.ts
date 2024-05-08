import log from '../../../../utils/log';

const options = {
	'--rollback': 'Rollback the target migrations',
	'--refresh': 'Refresh the target migrations',
	'--all': 'Perform the action on all migrations',
};

export default () => {
	log.warning('SILVIE ORM - Migrate');
	log('This will run one or all migrations on the database.');
	log('You can choose to rollback or refresh the migration with options.');
	log('If no options are specified, It will only try to create the migrations.');

	log();
	log.info('Options:');
	Object.keys(options).forEach((option) => {
		log(' ', option.padEnd(20, ' '), '\t', options[option]);
	});

	log();
	log.info('Usage:');
	log('  sorm migrate');
	log('  sorm migrate [migration]');
};
