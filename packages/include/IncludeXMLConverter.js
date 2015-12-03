'use strict';

/*
  HTML converter for Includes.
*/
module.exports = {

  type: 'include',
  tagName: 'include',

  import: function(el, node) {
    node.nodeId = el.attr('data-rid');
    node.nodeType = el.attr('data-rtype');
  },

  export: function(node, el) {
    el.attr('data-rtype', node.nodeType)
      .attr('data-rid', node.nodeId);
  }

};
