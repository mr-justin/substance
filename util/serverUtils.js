var bundleJS = require('./bundleJS');
var bundleStyles = require('./bundleStyles');

var serveBundle = function(app, options) {
	app.use(options.path + '/' + options.fileName + '.js', bundleJS(options.sourceDir + '/' + options.fileName + '.js'));
	app.use(options.path + '/' + options.fileName + '.css', bundleStyles(options.sourceDir + '/' + options.fileName + '.scss', {file: options.fileName + '.css'}));
	if(options.map) {
		app.use(options.path + '/' + options.fileName + '.css.map', bundleStyles(options.sourceDir + '/' + options.fileName + '.scss', {file: options.fileName + '.css', map: true}));
	}
};

var errorHandler = function(err, req, res) {
  console.error(err.message);
	res.status(400).json(err);
};

module.exports = errorHandler;

module.exports = {
	serveBundle: serveBundle,
	errorHandler: errorHandler
};