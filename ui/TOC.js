"use strict";

var _ = require('../util/helpers');
var EventEmitter = require('../util/EventEmitter');
var $ = require('../util/jquery');

function TOC(controller) {
  this.controller = controller;

  // this.controller.doc.connect(this, {
  //   'toc:entry-selected': this.onTocEntrySelected
  //   // 'highlights:updated': this.onHighlightsUpdated
  // }, -1);
}

TOC.Prototype = function() {

  this.getDocument = function() {
    return this.controller.props.doc;
  };

  this.dispose = function() {
    this.controller.doc.disconnect(this);
  };


  this.markActiveEntry = function(scrollPane) {
    var doc = this.getDocument();

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
  
    var tocNodes = doc.getTOCNodes(scrollPane.context.config);
    if (tocNodes.length === 0) return;

    // Use first toc node as default
    var activeNode = _.first(tocNodes).id;
    tocNodes.forEach(function(tocNode) {
      var nodeEl = $panelContent.find('[data-id="'+tocNode.id+'"]')[0];
      if (!nodeEl) {
        console.warn('Not found in Content panel', tocNode.id);
        return;
      }
      var panelOffset = scrollPane.getPanelOffsetForElement(nodeEl);
      if (scanline >= panelOffset) {
        activeNode = tocNode.id;
      }
    }.bind(this));

    doc.emit('app:toc-entry:changed', activeNode);
  };
};

EventEmitter.extend(TOC);

module.exports = TOC;
