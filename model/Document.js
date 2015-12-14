'use strict';

var each = require('lodash/collection/each');
var AbstractDocument = require('./AbstractDocument');
var DocumentIndex = require('./DocumentIndex');
var AnnotationIndex = require('./AnnotationIndex');
var AnchorIndex = require('./AnchorIndex');
var DocumentChange = require('./DocumentChange');
var PathEventProxy = require('./PathEventProxy');

var __id__ = 0;

/**
  Abstract class used for deriving a custom article implementation.
  Requires a {@link model/DocumentSchema} to be provided on construction.

  @class Document
  @abstract
  @extends model/AbstractDocument
  @example

  ```js
  var Document = require('substance/model/Document');
  var articleSchema = require('./myArticleSchema');
  var Article = function() {
    Article.super.call(articleSchema);

    // We set up a container that holds references to
    // block nodes (e.g. paragraphs and figures)
    this.create({
      type: "container",
      id: "body",
      nodes: []
    });
  };

  Document.extend(Article);
  ```
*/

/**
  @constructor Document
  @param {DocumentSchema} schema The document schema.
*/

function Document(schema) {
  AbstractDocument.call(this, schema);
  this.__id__ = __id__++;

  // all by type
  this.addIndex('type', DocumentIndex.create({
    property: "type"
  }));

  // special index for (property-scoped) annotations
  this.addIndex('annotations', new AnnotationIndex());

  // special index for (contaoiner-scoped) annotations
  this.addIndex('container-annotation-anchors', new AnchorIndex());

  // change event proxies are triggered after a document change has been applied
  // before the regular document:changed event is fired.
  // They serve the purpose of making the event notification more efficient
  // In earlier days all observers such as node views where listening on the same event 'operation:applied'.
  // This did not scale with increasing number of nodes, as on every operation all listeners where notified.
  // The proxies filter the document change by interest and then only notify a small set of observers.
  // Example: NotifyByPath notifies only observers which are interested in changes to a certain path.
  this.eventProxies = {
    'path': new PathEventProxy(this),
  };

  this.initialize();

  this.FORCE_TRANSACTIONS = false;

  // Note: using the general event queue (as opposed to calling _updateEventProxies from within _notifyChangeListeners)
  // so that handler priorities are considered correctly
  this.connect(this, {
    'document:changed': this._updateEventProxies
  });
}

Document.Prototype = function() {

  /**
    Creates a context like a transaction for importing nodes.
    This is important in presence of cyclic dependencies.
    Indexes will not be updated during the import but will afterwards
    when all nodes are have been created.

    @private
    @param {Function} importer a `function(doc)`, where with `doc` is a `model/AbstractDocument`

    @example

    Consider the following example from our documentation generator:
    We want to have a member index, which keeps track of members of namespaces, modules, and classes.
    grouped by type, and in the case of classes, also grouped by 'instance' and 'class'.

    ```
    ui
      - class
        - ui/Component
    ui/Component
      - class
        - method
          - mount
      - instance
        - method
          - render
    ```

    To decide which grouping to apply, the parent type of a member needs to be considered.
    Using an incremental approach, this leads to the problem, that the parent must exist
    before the child. At the same time, e.g. when deserializing, the parent has already
    a field with all children ids. This cyclic dependency is best address, by turning
    off all listeners (such as indexes) until the data is consistent.

  */
  this.import = function(importer) {
    try {
      this.data._stopIndexing();
      importer(this);
      this.data._startIndexing();
    } finally {
      this.data.queue = [];
      this.data._startIndexing();
    }
  };

  this.create = function(nodeData) {
    if (this.FORCE_TRANSACTIONS) {
      throw new Error('Use a transaction!');
    }
    var op = this._create(nodeData);
    this._notifyChangeListeners(new DocumentChange([op], {}, {}));
    return this.data.get(nodeData.id);
  };

  this.delete = function(nodeId) {
    if (this.FORCE_TRANSACTIONS) {
      throw new Error('Use a transaction!');
    }
    var node = this.get(nodeId);
    var op = this._delete(nodeId);
    this._notifyChangeListeners(new DocumentChange([op], {}, {}));
    return node;
  };

  this.set = function(path, value) {
    if (this.FORCE_TRANSACTIONS) {
      throw new Error('Use a transaction!');
    }
    var oldValue = this.get(path);
    var op = this._set(path, value);
    this._notifyChangeListeners(new DocumentChange([op], {}, {}));
    return oldValue;
  };

  this.update = function(path, diff) {
    if (this.FORCE_TRANSACTIONS) {
      throw new Error('Use a transaction!');
    }
    var op = this._update(path, diff);
    this._notifyChangeListeners(new DocumentChange([op], {}, {}));
    return op;
  };

  this.getEventProxy = function(name) {
    return this.eventProxies[name];
  };

  this.newInstance = function() {
    var DocumentClass = this.constructor;
    return new DocumentClass(this.schema);
  };

  this.fromSnapshot = function(data) {
    var doc = this.newInstance();
    doc.loadSeed(data);
    return doc;
  };

  this.getDocumentMeta = function() {
    return this.get('document');
  };

  this.getHighlights = function() {
    return this._highlights;
  };

  // Set higlights on a document
  this.setHighlights = function(highlights) {
    var oldHighlights = this._highlights;

    if (oldHighlights) {
      each(oldHighlights, function(nodeId) {
        var node = this.get(nodeId);
        // Node could in the meanwhile have been deleted
        if (node) {
          node.setHighlighted(false);
        }
      }.bind(this));
    }

    each(highlights, function(nodeId) {
      var node = this.get(nodeId);
      node.setHighlighted(true);
    }.bind(this));

    this._highlights = highlights;
    this.emit('highlights:updated', highlights);
  };

  this._apply = function(transaction) {
    each(transaction.ops, function(op) {
      this.data.apply(op);
      this.emit('operation:applied', op);
    }.bind(this));
  };

  this._notifyChangeListeners = function(transaction, info) {
    info = info || {};
    this.emit('document:changed', transaction, info, this);
  };

  this._updateEventProxies = function(transaction, info) {
    each(this.eventProxies, function(proxy) {
      proxy.onDocumentChanged(transaction, info, this);
    }.bind(this));
  };
};

AbstractDocument.extend(Document);

module.exports = Document;
