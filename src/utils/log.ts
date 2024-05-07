import chalk from "chalk";

const colors = {
	error: 'red',
	warning: 'yellow',
	info: 'cyan',
	success: 'green',
};


function log(...texts: any[]) {
	console.log(...texts);
}

function customLog(type: 'error' | 'warning' | 'info' | 'success', title: string, message?: string) {
	const ttl = chalk.bold[colors[type]](title);

	if (message) {
		return log(ttl, message);
	}

	return log(ttl);
}

log.error = (title: string, message?: string) => customLog('error', title, message);
log.warning = (title: string, message?: string) => customLog('warning', title, message);
log.info = (title: string, message?: string) => customLog('info', title, message);
log.success = (title: string, message?: string) => customLog('success', title, message);

export default log;
