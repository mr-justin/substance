"use strict";

var _ = require('../util/helpers');
var EventEmitter = require('../util/EventEmitter');
var $ = require('../util/jquery');

function TOC(controller) {
  EventEmitter.apply(this, arguments);
  this.controller = controller;

  this.entries = this.computeEntries();
  if (this.entries.length > 0) {
    this.activeEntry = this.entries[0].id;
  } else {
    this.activeEntry = null;
  }
  
  var doc = this.getDocument();
  doc.connect(this, {
    'document:changed': this.handleDocumentChange
  });
}

TOC.Prototype = function() {

  this.dispose = function() {
    var doc = this.getDocument();
    doc.disconnect(this);
  };

  // Inspects a document change and recomputes the
  // entries if necessary
  this.handleDocumentChange = function(change) {
    var doc = this.getDocument();
    var needsUpdate = false;
    var tocTypes = this.constructor.static.tocTypes;

    // HACK: this is not totally correct but works.
    // Actually, the TOC should be updated if tocType nodes
    // get inserted or removed from the container, plus any property changes
    // This implementation just checks for changes of the node type
    // not the container, but as we usually create and show in
    // a single transaction this works.
    for (var i = 0; i < change.ops.length; i++) {
      var op = change.ops[i];
      var nodeType;
      if (op.isCreate() || op.isDelete()) {
        var nodeData = op.getValue();
        nodeType = nodeData.type;
        if (_.includes(tocTypes, nodeType)) {
          needsUpdate = true;
          break;
        }
      } else {
        var id = op.path[0];
        var node = doc.get(id);
        if (node && _.includes(tocTypes, node.type)) {
          needsUpdate = true;
          break;
        }
      }
    }
    if (needsUpdate) {
      this.entries = this.computeEntries();
      this.emit('toc:updated');
    }
  };

  this.computeEntries = function() {
    var doc = this.getDocument();
    var entries = [];
    var contentNodes = doc.get('main').nodes;
    _.each(contentNodes, function(nodeId) {
      var node = doc.get(nodeId);
      if (node.type === 'heading') {
        entries.push({
          id: node.id,
          name: node.content,
          level: node.level,
          node: node
        });
      }
    });
    return entries;
  };

  this.getEntries = function() {
    return this.entries;
  };

  this.getDocument = function() {
    return this.controller.getDocument();
  };

  this.getConfig = function() {
    return this.controller.getConfig();
  };

  this.markActiveEntry = function(scrollPane) {
    var $panelContent = $(scrollPane.getContentElement());
    var contentHeight = scrollPane.getContentHeight();
    var scrollPaneHeight = scrollPane.getHeight();
    var scrollPos = scrollPane.getScrollPosition();

    var scrollBottom = scrollPos + scrollPaneHeight;
    var regularScanline = scrollPos;
    var smartScanline = 2 * scrollBottom - contentHeight;
    var scanline = Math.max(regularScanline, smartScanline);

    // For debugging purposes
    // To activate remove display:none for .scanline in the CSS
    // $('.se-scanline').css({
    //   top: (scanline - scrollTop)+'px'
    // });
  
    var tocNodes = this.computeEntries();
    if (tocNodes.length === 0) return;

    // Use first toc node as default
    var activeEntry = _.first(tocNodes).id;
    tocNodes.forEach(function(tocNode) {
      var nodeEl = $panelContent.find('[data-id="'+tocNode.id+'"]')[0];
      if (!nodeEl) {
        console.warn('Not found in Content panel', tocNode.id);
        return;
      }
      var panelOffset = scrollPane.getPanelOffsetForElement(nodeEl);
      if (scanline >= panelOffset) {
        activeEntry = tocNode.id;
      }
    }.bind(this));

    if (this.activeEntry !== activeEntry) {
      this.activeEntry = activeEntry;
      this.emit('toc:updated');
    }
  };
};

EventEmitter.extend(TOC);

TOC.static.tocTypes = ['heading'];

module.exports = TOC;
