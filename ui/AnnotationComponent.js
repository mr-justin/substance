"use strict";

var oo = require('../util/oo');
var Component = require('./Component');
var $$ = Component.$$;

/**
  Renders an annotation. Used internally by different components (e.g. ui/AnnotatedTextComponent)
  
  @class
  @component
  @extends ui/Component
  
  @prop {Object} doc document
  @prop {Object} node node which describes annotation

  @example

  ```js
  $$(TextProperty, { 
    doc: doc, 
    node: node 
  })
  ```
*/

function AnnotationComponent() {
  Component.apply(this, arguments);
}

AnnotationComponent.Prototype = function() {

  this.render = function() {
    var el = $$('span')
      .attr("data-id", this.props.node.id)
      .addClass(this.getClassNames());
    if (this.props.node.highlighted) {
      el.addClass('highlighted');
    }
    el.append(this.props.children);
    return el;
  };

  this.getClassNames = function() {
    return 'sc-'+this.props.node.type;
  };

  this.didMount = function() {
    var node = this.props.node;
    node.connect(this, {
      'highlighted': this.onHighlightedChanged
    });
  };

  this.dispose = function() {
    var node = this.props.node;
    node.disconnect(this);
  };

  this.onHighlightedChanged = function() {
    if (this.props.node.highlighted) {
      this.$el.addClass('highlighted');
    } else {
      this.$el.removeClass('highlighted');
    }
  };
};

oo.inherit(AnnotationComponent, Component);

module.exports = AnnotationComponent;
