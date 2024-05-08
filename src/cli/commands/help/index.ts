import log from '../../../utils/log';
import commands from './commands';

const mainCommands = {
	help: 'Show this help page',
	make: 'Make initial file from template',
	migrate: 'Migrate the schemas to the database',
	seed: 'Seed initial data to the database',
};

export default (args: { _: string[] }) => {
	const commandName = args._[1];

	if (commandName) {
		if (commandName in commands) {
			commands[commandName]();
		} else {
			log.error('Invalid Help', `There is no further help for '${commandName}' command`);
		}
	} else {
		log.warning('SILVIE ORM Helper');

		log();
		log.info('Commands:');
		Object.keys(mainCommands).forEach((command) => {
			log(' ', command.padEnd(20, ' '), '\t', mainCommands[command]);
		});

		log();
		log.info('Usage:');
		log('  sorm make model Example');
		log('  sorm migrate examples');

		log();
		log.info('Extra Help:');
		log('  sorm help [command]');
	}
};
