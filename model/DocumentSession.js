"use strict";

var delay = require('lodash/function/delay');
var oo = require('../util/oo');
var DocumentChange = require('./DocumentChange');

var MAXIMUM_CHANGE_DURATION = 1500;

function DocumentSession(doc, compressor, hub) {
  this.doc = doc;
  this.version = 0;

  this.uncommittedChanges = [];
  this.pendingChanges = [];

  this.doneChanges = [];
  this.undoneChanges = [];

  this.compressor = compressor;
  this.hub = hub;
}

DocumentSession.Prototype = function() {

  this.canUndo = function() {
    return this.doneChanges.length > 0;
  };

  this.canRedo = function() {
    return this.undoneChanges.length > 0;
  };

  this.undo = function() {
    var change = this.doneChanges.pop();
    if (change) {
      var inverted = change.invert();
      this.doc._apply(inverted);
      this.undoneChanges.push(inverted);
      this.doc._notifyChangeListeners(inverted, { 'replay': true });
    } else {
      console.error('No change can be undone.');
    }
  };

  this.redo = function() {
    var change = this.undoneChanges.pop();
    if (change) {
      var inverted = change.invert();
      this.doc._apply(inverted);
      this.doneChanges.push(inverted);
      this.doc._notifyChangeListeners(inverted, { 'replay': true });
    } else {
      console.error('No change can be redone.');
    }
  };

  this.commit = function(change, info) {
    // apply the change
    change.timestamp = Date.now();
    // TODO: try to find a more explicit way, or a maybe a smarter way
    // to keep the TransactionDocument in sync
    this.doc._apply(change, 'saveTransaction');

    var lastChange = this.getLastChange();
    // try to merge this change with the last to get more natural changes
    // e.g. not every keystroke, but typed words or such.
    var merged = false;
    if (lastChange && !lastChange.isFinal()) {
      var now = Date.now();
      if (now - lastChange.timestamp < MAXIMUM_CHANGE_DURATION) {
        merged = this.compressor.merge(lastChange, change);
      }
    }
    if (!merged) {
      // finalize a change after a certain amount of time
      delay(function(change) {
        if (!change.isFinal()) { this._finalizeChange(change); }
      }.bind(this, change), MAXIMUM_CHANGE_DURATION);
      // push to undo queue and wipe the redo queue
      this.doneChanges.push(change);
    }
    this.undoneChanges = [];
    // console.log('Document._saveTransaction took %s ms', (Date.now() - time));
    // time = Date.now();
    if (!info.silent) {
      // TODO: I would like to wrap this with a try catch.
      // however, debugging gets inconvenient as caught exceptions don't trigger a breakpoint
      // by default, and other libraries such as jquery throw noisily.
      this.doc._notifyChangeListeners(change, info);
    }
  };

  this._finalizeChange = function(change) {
    change._state = DocumentChange.FINAL;
    this._commitChange(change);
  };

  this._commitChange = function(change) {
    // TODO: send change to hub
    console.log('TODO: commit change to HUB', change._id);
  };

  this._acknowledgeChange = function(changeId, newVersion) {
    /* jshint unused: false */
    // TODO: tells the client that the change has been accepted and
  };

  this._receivedChange = function(change, newVersion) {
    /* jshint unused: false */
    // TODO: received a change from another client
  };

  this.getLastChange = function() {
    return this.doneChanges[this.doneChanges.length-1];
  };

};

oo.initClass(DocumentSession);

module.exports = DocumentSession;
