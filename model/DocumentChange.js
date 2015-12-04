'use strict';

var isObject = require('lodash/lang/isObject');
var map = require('lodash/collection/map');
var oo = require('../util/oo');
var uuid = require('../util/uuid');
var PathAdapter = require('../util/PathAdapter');
var ObjectOperation = require('./data/ObjectOperation');

var PROVISIONAL = 1;
var FINAL = 2;
var PENDING = 3;
var ACKNOWLEDGED = 4;

/*

  States:

  - Provisional:

    Change has been applied to the document already. Subsequent changes might be merged
    into it, to achieve a more natural representation.

  - Final:

    Change has been finalized.

  - Pending:

    Change has been committed to the collaboration hub.

  - Acknowledged:

    Change has been applied and acknowledged by the server.
*/
function DocumentChange(ops, before, after) {
  if (arguments.length === 1 && isObject(ops)) {
    var data = arguments[0];
    this._id = data.id;
    this._state = data.state;
    this.ops = map(data.ops, function(opData) {
      return ObjectOperation.fromJSON(opData);
    });
    this.before = data.before;
    this.after = data.after;
    this.timestamp = data.timestamp;
    this.userId = data.userId;
    this.data = data.data;
    Object.freeze(this);
    Object.freeze(this.ops);
    Object.freeze(this.before);
    Object.freeze(this.after);
  } else if (arguments.length === 3) {
    this._id = uuid();
    this._state = PROVISIONAL;
    this.ops = ops.slice(0);
    this.before = before;
    this.after = after;
  } else {
    throw new Error('Illegal arguments.');
  }
  // a hash with all updated properties
  this.updated = null;
  // a hash with all created nodes
  this.created = null;
  // a hash with all deleted nodes
  this.deleted = null;

  // TODO: maybe do this lazily, i.e. only when the change inspection API is used?
  this._init();
}

DocumentChange.Prototype = function() {

  this._init = function() {
    var ops = this.ops;
    var created = {};
    var deleted = {};
    var updated = new PathAdapter.Arrays();
    var i;
    for (i = 0; i < ops.length; i++) {
      var op = ops[i];
      if (op.type === "create") {
        created[op.val.id] = op.val;
        delete deleted[op.val.id];
      }
      if (op.type === "delete") {
        delete created[op.val.id];
        delete updated[op.val.id];
        deleted[op.val.id] = op.val;
      }
      if (op.type === "set" || op.type === "update") {
        // The old as well the new one is affected
        updated.add(op.path, op);
      }
    }
    this.created = created;
    this.deleted = deleted;
    this.updated = updated;
  };

  this.toJSON = function() {
    return {
      id: this._id,
      state: this._state,
      before: this.before,
      ops: map(this.ops, function(op) {
        return op.toJSON();
      }),
      after: this.after,
    };
  };

  this.invert = function() {
    var ops = [];
    for (var i = this.ops.length - 1; i >= 0; i--) {
      ops.push(this.ops[i].invert());
    }
    var before = this.after;
    var after = this.before;
    return new DocumentChange(ops, before, after);
  };

  this.traverse = function(fn, ctx) {
    this.updated.traverse(function() {
      fn.apply(ctx, arguments);
    });
  };

  this.isFinal = function() {
    return this._state >= FINAL;
  };

  this.isPending = function() {
    return this._state === PENDING;
  };

  this.isAcknowledged = function() {
    return this._state === ACKNOWLEDGED;
  };

  /*
   Change inspection API.
   Should make it easier to implement change listeners.
  */

  this.isAffected = function(path) {
    return !!this.updated.get(path);
  };

  this.isUpdated = this.isAffected;

};

oo.initClass(DocumentChange);

DocumentChange.fromJSON = function(data) {
  return new DocumentChange(data);
};

module.exports = DocumentChange;
