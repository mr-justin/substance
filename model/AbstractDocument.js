'use strict';

var each = require('lodash/collection/each');
var EventEmitter = require('../util/EventEmitter');
var IncrementalData = require('./data/IncrementalData');
var DocumentNodeFactory = require('./DocumentNodeFactory');
var Selection = require('./Selection');
var PropertySelection = require('./PropertySelection');
var ContainerSelection = require('./ContainerSelection');
var TableSelection = require('./TableSelection');
var docHelpers = require('./documentHelpers');

/**
  Abstract Document implementation.

  Defines the interface for {@link model/Document}.

  @class
  @abstract
 */
function AbstractDocument(schema) {
  EventEmitter.call(this);

  /**
    The data schema.
    @type {model/DocumentSchema}
   */
  this.schema = schema;

  this.nodeFactory = new DocumentNodeFactory(this);

  this.data = new IncrementalData(schema, {
    nodeFactory: this.nodeFactory
  });
}

EventEmitter.extend(AbstractDocument, function AbstractDocumentPrototype() {

  this.newInstance = function() {
    throw new Error('Must be implemented in subclass.');
  };

  /**
    Adds a Document index.

    Documents index get updated first, so that all listeners for
    document changes can rely on them being up-to-date.

    @param {String} name a unique name
    @param {model/DocumentIndex} index
  */
  this.addIndex = function(name, index) {
    return this.data.addIndex(name, index);
  };

  /**
    Get a Document index with given name.

    @param {String} name a unique name
    @returns {model/DocumentIndex|undefined} The index or undefined
             if no index found with this name.
  */
  this.getIndex = function(name) {
    return this.data.getIndex(name);
  };

  /**
    Get a node or a property.

    @param {String|Array<String>} path
    @returns {undefined|model/DocumentNode|any} `undefined` if no node
      or property could be found for the given path, a node instance if
      the path is an id, or the property value reached via the given path.
  */
  this.get = function(path) {
    return this.data.get(path);
  };

  /**
    Get the hash of nodes.

    @returns {Object} Object with node ids as keys, and the nodes as values.
  */
  this.getNodes = function() {
    return this.data.nodes;
  };

  /**
    Get the Document schema.

    @returns {model/DocumentSchema}
  */
  this.getSchema = function() {
    return this.schema;
  };


  /**
    Create a node from the given data.

    @return {model/DocumentNode} The created node.
   */
  this.create = function(nodeData) {
    /* jshint unused:false */
    throw new Error('Method is abstract.');
  };

  /**
    Delete the node with given id.

    @param {String} nodeId
    @returns {model/DocumentNode} The deleted node.
   */
  this.delete = function(nodeId) {
    /* jshint unused:false */
    throw new Error('Method is abstract.');
  };


  /**
    Set a property to a new value.

    @param {Array<String>} property path
    @param {any} newValue
    @returns {any} The old value.
   */
   this.set = function(path, value) {
    /* jshint unused:false */
    throw new Error('Method is abstract.');
  };

  /*
    Update a property incrementally.

    Incremental updates can be applied to String and Array properties.

    @param {Array<String>} property path
    @param {Object} diff

    @example

    Inserting into an array:

    ```js
    doc.update(['body', 'nodes'], 'delete', { type: delete  } })
    ```
   */
  this.update = function(path, diff) {
    /* jshint unused:false */
    throw new Error('Method is abstract.');
  };

  /**
   * Sets the text of a property together with annotations.
   *
   * @param {String[]} path Path to the text property.
   */
  this.setText = function(path, text, annotations) {
    // TODO: this should not be here, if really necessary it should go into
    // document helpers.
    var idx;
    var oldAnnos = this.getIndex('annotations').get(path);
    // TODO: what to do with container annotations
    for (idx = 0; idx < oldAnnos.length; idx++) {
      this.delete(oldAnnos[idx].id);
    }
    this.set(path, text);
    for (idx = 0; idx < annotations.length; idx++) {
      this.create(annotations[idx]);
    }
  };

  /**
    Creates a selection which is attached to this document.
    Every selection implementation provides its own
    parameter format which is basically a JSON representation.

    @param {model/Selection} sel An object describing the selection.

    @example

    Creating a PropertySelection:

    ```js
    doc.createSelection({
      type: 'property',
      path: [ 'text1', 'content'],
      startOffset: 10,
      endOffset: 20
    })
    ```

    Creating a ContainerSelection:

    ```js
    doc.createSelection({
      type: 'container',
      containerId: 'main',
      startPath: [ 'p1', 'content'],
      startOffset: 10,
      startPath: [ 'p2', 'content'],
      endOffset: 20
    })
    ```

    Creating a NullSelection:

    ```js
    doc.createSelection(null);
    ```
  */
  this.createSelection = function(sel) {
    /*
     TODO: maybe we want a simpler DSL in addition to the JSON spec?
      ```
      doc.createSelection(null);
      doc.createSelection(['p1','content'], 0, 5);
        -> PropertySelection
      doc.createSelection(['p1','content'], 0, ['p2', 'content'], 5);
        -> ContainerSelection
      ```
    */
    if (!sel) {
      return Selection.nullSelection;
    }
    switch(sel.type) {
      case 'property':
        return new PropertySelection(sel).attach(this);
      case 'container':
        return new ContainerSelection(sel).attach(this);
      case 'table':
        return new TableSelection(sel).attach(this);
      default:
        throw new Error('Unsupported selection type', sel.type);
    }
  };

  this._create = function(nodeData) {
    var op = this.data.create(nodeData);
    return op;
  };

  this._delete = function(nodeId) {
    var op = this.data.delete(nodeId);
    return op;
  };

  this._update = function(path, diff) {
    var op = this.data.update(path, diff);
    return op;
  };

  this._set = function(path, value) {
    var op = this.data.set(path, value);
    return op;
  };


  this.initialize = function() {
    console.warn("DEPRECATED: initialize the document in the constructor instead.");
  };

  /*
   * @deprecated We should use a dedicated exported instead.
   */
  this.toJSON = function() {
    // TODO: deprecate this
    // console.warn('DEPRECATED: Document.toJSON(). Use model/JSONConverter instead.');
    var nodes = {};
    each(this.getNodes(), function(node) {
      nodes[node.id] = node.toJSON();
    });
    return {
      schema: [this.schema.name, this.schema.version],
      nodes: nodes
    };
  };

  /*
    @deprecated We will drop support as this should be done in a more
    controlled fashion using an importer.
    @skip
   */
  this.loadSeed = function(seed) {
    // Attention: order of nodes may be 'invalid'
    // so that we should not attach the doc a created note
    // until all its dependencies are created

    // clear all existing nodes (as they should be there in the seed)
    each(this.data.nodes, function(node) {
      this.delete(node.id);
    }, this);
    // import new nodes
    each(seed.nodes, function(nodeData) {
      this.create(nodeData);
    }, this);

    this.documentDidLoad();
  };

  // DEPRECATED
  this.documentDidLoad = function() {};

  this.getTextForSelection = function(sel) {
    console.warn("DEPRECATED: use model/documentHelpers.getTextForSelection instead.");
    return docHelpers.getTextForSelection(this, sel);
  };

});

module.exports = AbstractDocument;
