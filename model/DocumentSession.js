"use strict";

var oo = require('../util/oo');
var TransactionDocument = require('./TransactionDocument');
var DefaultChangeCompressor = require('./DefaultChangeCompressor');

/*
  TODO: Maybe find a suitable name.
  The purpose of this class is to maintain editing related things:
    - selection
    - transactions
    - undo/redo
    - versioning
    - collaborative editing
*/
function DocumentSession(doc, options) {
  options = options || {};
  this.doc = doc;

  // TODO: do we want to force transactions whenever a DocumentSession has been created?
  doc.FORCE_TRANSACTIONS = true;

  this.version = 0;

  this.selection = null;

  // the stage is a essentially a clone of this document
  // used to apply a sequence of document operations
  // without touching this document
  this.stage = new TransactionDocument(this.doc, this);
  this.isTransacting = false;

  this.doneChanges = [];
  this.undoneChanges = [];

  this.compressor = options.compressor || new DefaultChangeCompressor();
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
      this.stage._apply(inverted);
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
      this.stage._apply(inverted);
      this.doc._apply(inverted);
      this.doneChanges.push(inverted);
      this.doc._notifyChangeListeners(inverted, { 'replay': true });
    } else {
      console.error('No change can be redone.');
    }
  };

  /**
    Start a transaction to manipulate the document

    @param {object} [beforeState] object which will be used as before start of transaction
    @param {object} [eventData] object which will be used as payload for the emitted document:change event
    @param {function} transformation a function(tx) that performs actions on the transaction document tx

    @example

    ```js
    doc.transaction({ selection: sel }, {'event-hack': true}, function(tx, args) {
      tx.update(...);
      ...
      return {
        selection: newSelection
      };
    })
    ```
  */
  this.transaction = function(beforeState, eventData, transformation) {
    /* jshint unused: false */
    if (this.isTransacting) {
      throw new Error('Nested transactions are not supported.');
    }
    this.isTransacting = true;
    this.stage.reset();
    var change = this.stage._transaction.apply(this.stage, arguments);
    this.isTransacting = false;
    return change;
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
      if (this.compressor.shouldMerge(lastChange, change)) {
        merged = this.compressor.merge(lastChange, change);
      }
    }
    if (!merged) {
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

  this._commitChange = function(change) {
    /* jshint unused:false */
    // TODO: send change to hub
    // console.log('TODO: commit change to HUB', change._id);
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
