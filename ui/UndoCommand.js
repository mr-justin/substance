'use strict';

var ControllerCommand = require('./ControllerCommand');

function Undo() {
  Undo.super.apply(this, arguments);
}

Undo.Prototype = function() {
  this.getCommandState = function() {
    var doc = this.getDocument();
    return {
      disabled: !doc.canUndo(),
      active: false
    };
  };
  this.execute = function() {
    var doc = this.getDocument();
    if (doc.canUndo()) {
      doc.undo();
      return true;
    }
    return false;
  };
};

ControllerCommand.extend(Undo);

ControllerCommand.static.name = 'undo';

module.exports = Undo;