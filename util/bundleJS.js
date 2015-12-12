var browserify = require('browserify');

var bundleJS = function(path) {
	return function(req, res, next) {
	  browserify({ debug: true, cache: false })
	    .add(path)
	    .bundle()
	    .on('error', function(err) {
	      return next(err);
	    })
	    .pipe(res);
	};
};

module.exports = bundleJS;