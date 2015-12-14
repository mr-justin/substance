'use strict';

require('../qunit_extensions');
var Surface = require('../../../ui/Surface');
var DocumentSession = require('../../../model/DocumentSession');

function StubSurface(doc, containerId) {

  this.name = 'test_surface';
  this.containerId = containerId;
  this.selection = null;

  var docSession = new DocumentSession(doc);

  this.getName = function() {
    return this.name;
  };

  this.getDocument = function() {
    return doc;
  };

  this.getDocumentSession = function() {
    return docSession;
  };

  this.getSelection = function() {
    return this.selection;
  };

  this.setSelection = function(sel) {
    this._setSelection(sel);
  };

  this._setSelection = function(sel) {
    this.selection = sel;
  };

  this.getContainerId = function() {
    return this.containerId;
  };

  this.emit = function() {};

  this.rerenderDomSelection = function() {};

  this.transaction = Surface.prototype.transaction;

  this.copy = Surface.prototype.copy;

}

module.exports = StubSurface;
