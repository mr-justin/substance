"use strict";

var delay = require('lodash/function/delay');
var each = require('lodash/collection/each');
var oo = require('../util/oo');
var DocumentChange = require('./DocumentChange');

function ExampleHub() {
  // queue for requests
  this.queue = [];
  // mapping from session id to a client
  this.clients = {};
  // mapping from version number to change
  this.history = {};
  // TODO: this should be the latest available version
  this.version = 0;
}

ExampleHub.Prototype = function() {

  this.start = function(interval) {
    this.isRunning = true;
    var self = this;
    function _run() {
      if (self.isRunning) {
        self.step();
        delay(_run, interval);
      }
    }
    _run();
  };

  this.stop = function() {
    this.isRunning = false;
  };

  this.step = function() {
    if (this.queue.length > 0) {
      var message = this.queue[0];
      var success = false;
      switch (message.type) {
        case 'load':
          this._serveDocument(message);
          success = true;
          break;
        case 'commit':
          this._commit(message);
          success = true;
          break;
        default:
          throw new Error('Illegal message type: ' + message.type);
      }
      // remove the request from the queue
      // TODO: what if we fail systematically?
      if (success) {
        this.queue.shift();
      }
    }
  };

  this._connect = function(client) {
    this.clients[client.id] = client;
  };

  this.send = function(clientId, message) {
    this.clients[clientId].onMessage(message);
  };

  this.onMessage = function(message) {
    switch (message.type) {
      case 'commit':
        message.change = DocumentChange.deserialize(message.change);
        break;
    }
    this.queue.push(message);
  };

  this._serveDocument = function(message) {
    // TODO: get a snapshot plus all changes that have been applied since
    // a given version
    var version = message.version;
    var snapshot = this._getLatestSnapshotBefore(version);
    snapshot.changes = this._getChangesSince(snapshot.version);
    this.send(message.sessionId, JSON.stringify(snapshot));
  };

  this._commit = function(message) {
    // simple case: the change is based on the latest version
    // then we can just add the change to the change history
    // and increment the document version
    if (message.change.version === this.version) {
      // TODO: apply the change locally
      message.change.freeze();
      this._applyChange(message.change);
      this.history[this.version] = {
        sessionId: message.sessionId,
        change: message.change
      };
      this.version++;
      each(this.clients, function(client) {
        if (client.id === message.sessionId) {
          this.send(client.id, { type: 'confirm', sha: message.change.sha, newVersion: this.version });
        } else {
          this.send(client.id, { type: 'apply', sessionId: message.sessionId, change: message.change, newVersion: this.version });
        }
      }.bind(this));
    } else if (message.version > this.version) {
      // TODO what to do?
      throw new Error('Illegal state. Incoming change is based on an unknown docment version.');
    } else {
      // The client committed a change which was applied on an older document version.
      // In this case we need to transform all changes which have occurred in the meantime
      // and send it back to the client
      // c -> a' -> b'
      // and at the same time, accept the new change in a transformed version
      // a -> b -> c'
      // and broadcast this to the other users

      // TODO: rebase the change on the latest version
      var changesSinceThen = this._getChangesSince(message.change.version);
      var change = message.change;
      // ATTENTION: this method works inplace on the first argument
      DocumentChange.transform(change, changesSinceThen);
      change.freeze();
      this._applyChange(change);
      this.history[this.version] = {
        sessionId: message.sessionId,
        change: change
      };
      this.version++;
      each(this.clients, function(client) {
        if (client.id === message.sessionId) {
          this.send(client.id, { type: 'confirm', sha: change.sha, newVersion: this.version });
        } else {
          this.send(client.id, { type: 'apply', sessionId: message.sessionId, change: change, newVersion: this.version });
        }
      }.bind(this));
    }
  };

  this._getLatestSnapshotBefore = function(version) {
    /* jshint unused: false */
    // TODO: return the latest snapshot before a given version
    throw new Error('This method is abstract.');
  };

  this._getChangesSince = function(version) {
    /* jshint unused: false */
    var changes = [];
    while(true) {
      var change = this.history[version];
      if (!change) {
        break;
      }
      changes.push(change.change);
      version++;
    }
    return changes;
  };

  this._applyChange = function(change) {
    /* jshint unused: false */
    throw new Error('This method is abstract.');
  };

};

oo.initClass(ExampleHub);

module.exports = ExampleHub;
