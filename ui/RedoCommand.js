'use strict';

var ControllerCommand = require('./ControllerCommand');

function Redo() {
  Redo.super.apply(this, arguments);
}

Redo.Prototype = function() {

  this.getCommandState = function() {
    var doc = this.getDocument();
    return {
      disabled: !doc.canRedo(),
      active: false
    };
  };

  this.execute = function() {
    var doc = this.getDocument();
    if (doc.canRedo()) {
      doc.redo();
      return true;
    } else {
      return false;
    }
  };
};

ControllerCommand.extend(Redo);

Redo.static.name = 'redo';

module.exports = Redo;
