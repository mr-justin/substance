var sass = require('node-sass');

var renderSass = function(path, opt, cb) {
  sass.render({
    file: path,
    sourceMap: opt.map,
    outFile: opt.file,
  }, cb);
};

var bundleStyles = function(path, opt) {
  return function(req, res, next) {
    renderSass(path, opt, function(err, result) {
      if (err) return next(err);
      res.set('Content-Type', 'text/css');
      if (opt.map) {
        res.send(result.map);
      } else {
        res.send(result.css);
      }
    });
  };
};

module.exports = bundleStyles;