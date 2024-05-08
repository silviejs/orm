import log from '../../../utils/log';
import makers from './makers';

const entityMakers = ['model', 'seeder', 'migration', 'config'];

export default (args: {
	_: string[];
	M?: boolean;
	model?: boolean;
	s?: boolean;
	seeder?: boolean;
	m?: boolean;
	migration?: boolean;
}) => {
	const maker = args._[1];

	if (maker) {
		if (maker in makers) {
			makers[maker](args);

			if (entityMakers.includes(maker)) {
				const extraMakers = [];

				if (maker !== 'model' && (args.M || args.model)) {
					extraMakers.push('model');
				}
				if (maker !== 'seeder' && (args.s || args.seeder)) {
					extraMakers.push('seeder');
				}
				if (maker !== 'migration' && (args.m || args.migration)) {
					extraMakers.push('migration');
				}

				extraMakers.forEach((extraMaker) => {
					makers[extraMaker](args);
				});
			}
		} else {
			log.error('Unknown Maker', `There is no maker for '${maker}'`);
		}
	} else {
		log.error('Invalid Make', 'You need to specify what you want to be made');
	}
};
