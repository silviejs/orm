export default (api) => {
	api.cache(true);

	return {
		presets: [
			'@babel/preset-typescript'
		],
		plugins: [
			['@babel/plugin-proposal-decorators', {legacy: true}],
		],
	};
};
