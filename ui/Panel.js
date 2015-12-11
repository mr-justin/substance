'use strict';

var Component = require('./Component');

function Panel() {
  Component.apply(this, arguments);
}

Panel.Prototype = function() {

  this.setHighlights = function() {
    console.log('TODO: implement');
  };
};

Component.extend(Panel);

module.exports = Panel;
