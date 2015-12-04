"use strict";

var oo = require('../util/oo');

function DocumentSession(doc) {
  this.doc = doc;
  this.version = 0;

  this.uncommittedChanges = [];
  this.pendingChanges = [];

  this.doneChanges = [];
  this.undoneChanges = [];
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
    // TODO: try to find a more explicit way, or a maybe a smarter way
    // to keep the TransactionDocument in sync
    this.doc._apply(change, 'saveTransaction');
    // push to undo queue and wipe the redo queue
    this.doneChanges.push(change);
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

  this.acknowledgeChange = function(changeId, newVersion) {
    /* jshint unused: false */
    // TODO: tells the client that the change has been accepted and
  };

  this.receivedChange = function(change, newVersion) {
    /* jshint unused: false */
    // TODO: received a change from another client
  };

};

oo.initClass(DocumentSession);

module.exports = DocumentSession;
