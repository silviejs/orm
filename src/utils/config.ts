import path from "path";
import fs from "fs";

function readORMConfig() {
	const configPath = path.resolve(process.cwd(), 'silvie.orm.config.ts');

	if (fs.existsSync(configPath)) {
		return require(configPath).default;
	}

	return null;
}

export default readORMConfig;