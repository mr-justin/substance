'use strict';

var Component = require('./Component');
var $$ = Component.$$;
var Panel = require("./Panel");
var ScrollPane = require('substance/ui/ScrollPane');

function ContentPanel() {
  Panel.apply(this, arguments);

  // HACK: Scrollbar should use DOMMutationObserver instead
  var doc = this.getDocument();
  doc.connect(this, {
    'document:changed': this.onDocumentChange
  }, -1);
}

ContentPanel.Prototype = function() {

  this.dispose = function() {
    var doc = this.getDocument();
    doc.disconnect(this);
  };

  this.getDocument = function() {
    return this.context.controller.getDocument();
  };

  this.render = function() {
    var el = $$('div')
      .addClass('sc-content-panel');
    
    el.append(
      $$(ScrollPane, {
        scrollbarType: 'substance', // defaults to native
        scrollbarPosition: 'left', // defaults to right
        onScroll: this.onScroll.bind(this)
      }).append(
        this.props.children
      ).ref('scrollPane')
    );
    return el;
  };

  // TODO: verify if it is a good practice to use deep references
  this.onHighlightsUpdated = function(highlights) {    
    // Triggers a rerender of the scrollbar
    this.refs.scrollPane.refs.scrollbar.extendProps({
      highlights: highlights
    });
  };

  // HACK: Scrollbar should use DOMMutationObserver instead
  this.onDocumentChange = function() {
    this.refs.scrollPane.refs.scrollbar.updatePositions();
  };

  this.onScroll = function() {
    if (this.context.toc) {
      this.context.toc.markActiveEntry(this.refs.scrollPane);
    }
  };
};

Panel.extend(ContentPanel);
module.exports = ContentPanel;
