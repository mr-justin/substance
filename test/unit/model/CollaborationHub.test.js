'use strict';

require('../qunit_extensions');

var sinon = require('sinon');
var oo = require('../../../util/oo');
var ExampleHub = require('../../../model/ExampleHub');
var DocumentChange = require('../../../model/DocumentChange');
var ObjectOperation = require('../../../model/data/ObjectOperation');
var TextOperation = require('../../../model/data/TextOperation');
var simple = require('../../fixtures/simpleJSON');

function TestHub() {
  TestHub.super.apply(this, arguments);

  this.onMessage = sinon.spy(this, 'onMessage');
}
TestHub.Prototype = function() {

  this._getLatestSnapshotBefore = function() {
    return {
      version: 0,
      data: simple()
    };
  };

  this._applyChange = function() {
    // nothing for now
  };

};
ExampleHub.extend(TestHub);

function TestClient(id) {
  this.id = id;

  this.onMessage = sinon.spy(this, 'onMessage');
}

TestClient.Prototype = function() {

  this.connect = function(hub) {
    hub._connect(this);
    this.hub = hub;
  };

  this.send = function(message) {
    message.sessionId = this.id;
    this.hub.onMessage(message);
  };

  this.onMessage = function(message) {
    // console.log('Client %s received message: \n%s', this.id, JSON.stringify(message,null,2));
  };

  this._getMessage = function(idx) {
    return this.onMessage.getCall(idx).args[0];
  };

};

oo.initClass(TestClient);

QUnit.module('model/CollaborationHub');

/*
  Protocol tests: testing only the expected communication between hub and clients.
  Further down, you find integration tests which also test the results.
*/

QUnit.test("Protocol: loading initial version", function(assert) {
  var hub = new TestHub();
  var client = new TestClient("XYZ");
  client.connect(hub);
  client.send({type: "load", version: 0});
  hub.step();
  var data = client.onMessage.getCall(0).args[0];
  data = JSON.parse(data);
  assert.equal(data.version, 0);
  assert.deepEqual(data.changes, []);
  assert.deepEqual(data.data, simple());
});

QUnit.test("Protocol: committing a change", function(assert) {
  var hub = new TestHub();
  var client = new TestClient("XYZ");
  client.connect(hub);
  var ops = [ObjectOperation.Update(['p1', 'content'], TextOperation.Insert(3, "foo"))];
  var change = new DocumentChange(ops, {}, {});
  change.version = 0;
  client.send({type: "commit", change: change.serialize()});
  hub.step();
  var response = client._getMessage(0);
  assert.equal(response.type, "confirm");
  assert.equal(response.sha, change.sha);
  assert.equal(response.newVersion, change.version+1);
});

QUnit.test("Protocol: two clients committing sequentially", function(assert) {
  var hub = new TestHub();
  var c1 = new TestClient("XYZ");
  var c2 = new TestClient("ABC");
  c1.connect(hub);
  c2.connect(hub);

  // 1. client 1 applies change 'a'
  var ops = [ObjectOperation.Update(['p1', 'content'], TextOperation.Insert(3, "foo"))];
  var a = new DocumentChange(ops, {}, {});
  a.version = 0;
  c1.send({type: "commit", change: a.serialize()});
  // 2. Hub propagates change
  hub.step();
  // 3. client 3 applies change 'b'
  ops = [ObjectOperation.Update(['p2', 'content'], TextOperation.Insert(2, "bar"))];
  var b = new DocumentChange(ops, {}, {});
  b.version = 1;
  c2.send({type: "commit", change: b.serialize()});
  // 4. Hub propagates change
  hub.step();

  // both clients should have received 2 messages
  assert.equal(c1.onMessage.callCount, 2, "Client 1 should have received 2 messages.");
  assert.equal(c2.onMessage.callCount, 2, "Client 2 should have received 2 messages.");
  // client 1 messages
  var response = c1._getMessage(0);
  assert.equal(response.type, "confirm", "First message of Client 1 should have been a confirmation");
  assert.equal(response.sha, a.sha, "... with correct sha");
  assert.equal(response.newVersion, 1, "... and proper new version");
  response = c1._getMessage(1);
  assert.equal(response.type, "apply", "Second message of Client 1 should have been an apply");
  assert.equal(response.newVersion, 2, "... and proper new version");
  // client 2 messages
  response = c2._getMessage(0);
  assert.equal(response.type, "apply", "First message of Client 2 should have been an apply");
  assert.equal(response.newVersion, 1, "... and proper new version");
  response = c2._getMessage(1);
  assert.equal(response.type, "confirm", "Second message of Client 2 should have been a confirmation");
  assert.equal(response.sha, b.sha, "... with correct sha");
  assert.equal(response.newVersion, 2, "... and proper new version");
});

QUnit.test("Protocol: two clients committing simultaneously", function(assert) {
  var hub = new TestHub();
  var c1 = new TestClient("XYZ");
  var c2 = new TestClient("ABC");
  var c3 = new TestClient("KLM");
  c1.connect(hub);
  c2.connect(hub);
  c3.connect(hub);

  // 1. client 1 applies change 'a'
  var ops = [ObjectOperation.Update(['p1', 'content'], TextOperation.Insert(3, "foo"))];
  var a = new DocumentChange(ops, {}, {});
  a.version = 0;
  c1.send({type: "commit", change: a.serialize()});
  // 2. client 3 applies change 'b'
  ops = [ObjectOperation.Update(['p2', 'content'], TextOperation.Insert(2, "bar"))];
  var b = new DocumentChange(ops, {}, {});
  // 'b' is based on the same document version as 'a'
  b.version = 0;
  c2.send({type: "commit", change: b.serialize()});
  // 3. Hub propagates changes
  hub.step();
  hub.step();

  // all clients should have received 2 messages
  assert.equal(c1.onMessage.callCount, 2, "Client 1 should have received 2 messages.");
  assert.equal(c2.onMessage.callCount, 2, "Client 2 should have received 2 messages.");
  assert.equal(c2.onMessage.callCount, 2, "Client 3 should have received 2 messages.");
  // client 1
  var r1 = c1._getMessage(0);
  var r2 = c1._getMessage(1);
  assert.deepEqual([r1.type, r2.type], ["confirm", "apply"], "Client 1 should have received correct messages.");
  assert.deepEqual([r1.newVersion, r2.newVersion], [1,2], "... and proper version updates.");
  // client 2
  // Note: client 2 receives 'a' whilst having applied 'b' already.
  // So it needs to take care of rebasing on its own.
  // This makes the server implementation more straight-forward. The client implementation
  // is more complex anyways, as it needs to take care of keeping the undo history in shape
  r1 = c2._getMessage(0);
  r2 = c2._getMessage(1);
  assert.deepEqual([r1.type, r2.type], ["apply", "confirm"], "Client 2 should have received correct messages.");
  assert.deepEqual([r1.newVersion, r2.newVersion], [1,2], "... and proper version updates.");
  r1 = c3._getMessage(0);
  r2 = c3._getMessage(1);
  assert.deepEqual([r1.type, r2.type], ["apply", "apply"], "Client 3 should have received correct messages.");
  assert.deepEqual([r1.newVersion, r2.newVersion], [1,2], "... and proper version updates.");
});

/*
  Integration tests: simulating a situation with two users editing the same document at the same time.
*/
// QUnit.test("Integration: two clients committing sequentially", function(assert) {
//   var hub = new TestHub();
//   var c1 = new TestClient("Michael");
//   var c2 = new TestClient("Oliver");
//   c1.connect(hub);
//   c2.connect(hub);

//   // 1. client 1 applies change 'a'
//   var ops = [ObjectOperation.Update(['p1', 'content'], TextOperation.Insert(3, "foo"))];
//   var a = new DocumentChange(ops, {}, {});
//   a.version = 0;
//   c1.send({type: "commit", change: a.serialize()});
//   // 2. Hub propagates change
//   hub.step();
//   // 3. client 3 applies change 'b'
//   ops = [ObjectOperation.Update(['p2', 'content'], TextOperation.Insert(2, "bar"))];
//   var b = new DocumentChange(ops, {}, {});
//   b.version = 1;
//   c2.send({type: "commit", change: b.serialize()});
//   // 4. Hub propagates change
//   hub.step();

// });
