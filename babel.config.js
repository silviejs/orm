module.exports = (api) => {
	api.cache(true);

	return {
		presets: [
			['@babel/preset-env', {modules: 'cjs', targets: {node: true}}],
			'@babel/preset-typescript'
		],
		plugins: [
			['@babel/plugin-proposal-decorators', {legacy: true}],
		],
	};
};
