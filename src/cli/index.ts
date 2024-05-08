#!/usr/bin/env bun

import fs from 'fs';
import path from 'path';
import minimist from "minimist";
import log from '../utils/log';

// Check to see if it is running in the project root
if (!fs.existsSync(path.resolve(process.cwd(), 'node_modules/@silviejs/orm'))) {
	log.error('[Silvie ORM] Invalid Execution Path');
	log('Silvie ORM CLI is only accessible from the project root');
	log('Project root is where @silviejs/orm package is found under node_modules');

	process.exit();
}

const args = minimist(process.argv.slice(2));

const [command] = args._;

if (command) {
	const commandPath = path.resolve(__dirname, `./commands/${command}`);

	if (fs.existsSync(commandPath)) {
		require(commandPath).default(args);
	} else {
		log.warning('[Silvie ORM] Command Not Found');
		log(`There is no command named '${command}'`);
	}
} else {
	log.error('[Silvie ORM] Invalid Usage');
	log('This is not how you use Silvie CLI');
	log("Run 'sorm help' for more info");
}
