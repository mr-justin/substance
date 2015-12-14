'use strict';

require('../qunit_extensions');
var cloneDeep = require('lodash/lang/cloneDeep');
var DocumentSession = require('../../../model/DocumentSession');
var sample1 = require('../../fixtures/sample1');

QUnit.module('model/DocumentSession');

QUnit.test("Transaction: before and after state.", function(assert) {
  var doc = sample1();
  var docSession = new DocumentSession(doc);
  var change = null;
  doc.on('document:changed', function(_change) {
    change = _change;
  });
  var beforeState = { selection: 'foo', some: "other" };
  var afterState = { selection: 'bar' };
  docSession.transaction(cloneDeep(beforeState), {}, function(tx) {
    tx.create({ type: 'paragraph', id: 'bla', content: ""});
    return cloneDeep(afterState);
  });
  assert.ok(change !== null, "Change should be applied.");
  assert.ok(change.before !== null, "Change should have before state.");
  assert.ok(change.after !== null, "Change should have after state.");
  assert.deepEqual(change.before, beforeState, "Change.before should be the same.");
  assert.equal(change.after.selection, afterState.selection, "Change.after.selection should be set correctly.");
  assert.equal(change.after.some, beforeState.some, "Not updated state variables should be forwarded.");
});
