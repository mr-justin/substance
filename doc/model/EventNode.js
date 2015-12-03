'use strict';

var DocumentedNode = require('./DocumentedNode');

function EventNode() {
  EventNode.super.apply(this, arguments);
}

DocumentedNode.extend(EventNode);

EventNode.static.name = 'event';

EventNode.static.defineSchema({
  parent: 'id',
  name: 'string',
  params: { type: ['array', 'object'], default: [] } // [{name: 'doc', type: 'model/Document', description: 'A Substance document instance'}]
});

EventNode.static.isBlock = true;

module.exports = EventNode;
