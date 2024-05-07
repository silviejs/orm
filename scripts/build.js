import fs from 'fs';
import path from 'path';
import childProcess from 'child_process';

const rootPath = process.cwd();

(async () => {
	try {
		const outDir = path.resolve(rootPath, 'lib');
		if (fs.existsSync(outDir)) {
			console.log('Cleaning Build Directory...');
			fs.rmSync(outDir, {recursive: true});
		}

		console.log('Building...');
		childProcess.exec(
			`babel src -d lib -x ".ts,.js" --copy-files --config-file`,
			{env: {...process.env, NODE_ENV: 'production'}},
			async (buildError) => {
				if (buildError) {
					console.log('Build Failed: ', buildError);
				} else {
					console.log('Generating Type Definitions...');
					childProcess.exec('tsc', async (typesError) => {
						if (typesError) {
							console.log('Build Failed: ', typesError);
						} else {
							try {
								console.log('Copying Package Files...');

								fs.copyFileSync(path.resolve(rootPath, 'LICENSE'), path.resolve(outDir, 'LICENSE'));
								fs.copyFileSync(path.resolve(rootPath, 'README.md'), path.resolve(outDir, 'README.md'));

								const packageJson = JSON.parse(fs.readFileSync(path.resolve(rootPath, 'package.json'), 'utf8'));

								delete packageJson.scripts;
								delete packageJson.devDependencies;

								fs.writeFileSync(
									path.resolve(outDir, 'package.json'),
									JSON.stringify(packageJson, null, '\t'),
									'utf8'
								);

								console.log('Build Finished Successfully');
							} catch (error) {
								console.log('Build Failed: ', error);
							}
						}
					});
				}
			}
		);
	} catch (error) {
		console.log('Build Failed: ', error);
	}
})();
