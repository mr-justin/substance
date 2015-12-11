'use strict';

var $ = require('../util/jquery');
var Component = require('./Component');
var Scrollbar = require('./Scrollbar');
var $$ = Component.$$;

function ScrollPane() {
  Component.apply(this, arguments);
}

ScrollPane.Prototype = function() {
  this.render = function() {
    var el = $$('div')
      .addClass('sc-scroll-pane');

    // Initialize Substance scrollbar (if enabled)
    if (this.props.scrollbarType === 'substance') {
      el.addClass('sm-substance-scrollbar');
      el.addClass('sm-scrollbar-position-'+this.props.scrollbarPosition);

      el.append(
        $$(Scrollbar, {
          scrollPane: this
        }).ref('scrollbar')
          .attr('id', 'content-scrollbar')
      );
      
      // For debugging purposes
      el.append(
        $$('div').ref("scanline").addClass('se-scanline')
      );
    }

    el.append(
      $$('div').ref('scrollable').addClass('se-scrollable').append(
        $$('div').ref('content').addClass('se-content').append(
          this.props.children
        )
      ).on('scroll', this.onScroll)
    );
    return el;
  };

  this.onScroll = function() {
    if (this.props.onScroll) {
      this.props.onScroll(this.getScrollPosition());
    }
  };

  // Returns the height of scrollPane (inner content overflows)
  this.getHeight = function() {
    var scrollableEl = this.getScrollableElement();
    return $(scrollableEl).height();
  };

  // Returns the cumulated height of a panel's content
  this.getContentHeight = function() {
    var contentHeight = 0;
    // var el = this.el;
    var contentEl = this.refs.content.el;

    $(contentEl).children().each(function() {
     contentHeight += $(this).outerHeight();
    });
    return contentHeight;
  };

  this.getContentElement = function() {
    return this.refs.content.el
  };

  this.getScrollableElement = function() {
    return this.refs.scrollable.el;
  };

  this.getScrollPosition = function() {
    var scrollableEl = this.getScrollableElement();
    return $(scrollableEl).scrollTop();
  };

  this.getPanelOffsetForElement = function(el) {
    // initial offset
    var offset = $(el).position().top;

    // Now look at the parents
    function addParentOffset(el) {
      var parentEl = el.parentNode;

      // Reached the content wrapper element or the parent el. We are done.
      if ($(el).hasClass('se-content') || !parentEl) return;

      // Found positioned element (calculate offset!)
      if ($(el).css('position') === 'absolute' || $(el).css('position') === 'relative') {
        offset += $(el).position().top;
      }
      addParentOffset(parentEl);
    }

    addParentOffset(el.parentNode);
    return offset;
  };

  this.scrollToNode = function(nodeId) {
    var el = this.el;
    // Node we want to scroll to
    var targetNode = $(el).find('*[data-id="'+nodeId+'"]')[0];
    if (targetNode) {
      var offset = this.getPanelOffsetForElement(targetNode);
      $(el).scrollTop(offset);
    } else {
      console.warn(nodeId, 'not found in scrollable container');
    }
  };
};

Component.extend(ScrollPane);

module.exports = ScrollPane;
