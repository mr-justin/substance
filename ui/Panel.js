'use strict';

var $ = require('../util/jquery');
var Component = require('./Component');
var $$ = Component.$$;

/**
  Abstract Panel interface.
  
  @class
  @abstract
  @component
  @extends ui/Component
*/

function Panel() {
  Component.apply(this, arguments);
}

Panel.Prototype = function() {
  this.render = function() {
    var el = $$('div')
      .addClass('sc-panel');
    el.append(
      $$('div').ref("panelContent").addClass('se-panel-content')
        .append(
          $$('div').addClass('se-panel-content-inner').append(
            this.props.children
          )
        )
        .on('scroll', this.onScroll)
    );
    return el;
  };


  this.onScroll = function(e) {
    /* jshint unused:false */
  };

  /**
    Get controller instance from context.

    @return {ui/Controller} controller instance
  */
  this.getController = function() {
    return this.context.controller;
  };

  /**
    Get the Document instance.

    @returns {Document}
  */
  this.getDocument = function() {
    return this.props.doc;
  };

  /**
    Get the Panel's content element.

    @returns {String} HTML element
  */
  this.getPanelContentElement = function() {
    return this.refs.panelContent.$el[0];
  };

  this.getScrollableContainer = function() {
    return this.refs.panelContent.$el[0];
  };

  /**
    Get the cumulated height of a panel's content.

    @returns {Number} height of panel's content
  */
  // Returns the cumulated height of a panel's content
  this.getContentHeight = function() {
    // initialized lazily as this element is not accessible earlier (e.g. during construction)
    // get the new dimensions
    // TODO: better use outerheight for contentheight determination?
    var contentHeight = 0;
    var panelContentEl = this.getPanelContentElement();

    $(panelContentEl).children().each(function() {
     contentHeight += $(this).outerHeight();
    });
    return contentHeight;
  };

  /**
    Get the height of a panel.

    @returns {Number} height of panel
  */
  // Returns the height of panel (inner content overflows)
  this.getPanelHeight = function() {
    var panelContentEl = this.getPanelContentElement();
    return $(panelContentEl).height();
  };

  /**
    Get the current vertical position of the panel.

    @returns {Number} scroll position
  */
  this.getScrollPosition = function() {
    var panelContentEl = this.getPanelContentElement();
    return $(panelContentEl).scrollTop();
  };

  /**
    Get the panel offset for given element.

    @param {ui/DOMElement} el the HTML element

    @returns {Number} scroll position
  */
  this.getPanelOffsetForElement = function(el) {
    // initial offset
    var offset = $(el).position().top;

    // Now look at the parents
    function addParentOffset(el) {
      var parentEl = el.parentNode;

      // Reached the panel or the document body. We are done.
      if ($(el).hasClass('se-panel-content-inner') || $(el).hasClass('se-panel-content') || !parentEl) return;

      // Found positioned element (calculate offset!)
      if ($(el).css('position') === 'absolute' || $(el).css('position') === 'relative') {
        offset += $(el).position().top;
      }
      addParentOffset(parentEl);
    }

    addParentOffset(el.parentNode);
    return offset;
  };

  /**
    Scrolls the panel to the specified node

    @param {String} nodeId Id of node
  */

  this.scrollToNode = function(nodeId) {
    // var n = this.findNodeView(nodeId);
    // TODO make this generic
    var panelContentEl = this.getScrollableContainer();

    // Node we want to scroll to
    var targetNode = $(panelContentEl).find('*[data-id="'+nodeId+'"]')[0];

    if (targetNode) {
      $(panelContentEl).scrollTop(this.getPanelOffsetForElement(targetNode));
    } else {
      console.warn(nodeId, 'not found in scrollable container');
    }
  };
};

Component.extend(Panel);

module.exports = Panel;
