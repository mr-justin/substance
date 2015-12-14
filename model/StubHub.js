"use strict";

var oo = require('../util/oo');

function StubHub() {
}

StubHub.Prototype = function() {

  /*
    Accepts a change from a client.
    After applying a change locally, clients will send the change to the hub.
    The change might need some transformations to be applicable on the latest
    version, so that
  */
  this.commitChange = function(session, change) {
    /* jshint unused:false */
  };

};

oo.initClass(StubHub);

module.exports = StubHub;