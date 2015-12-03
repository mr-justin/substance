"use strict";

var HtmlExporter = require('../model/HTMLExporter');
var ClipboardImporter = require('./ClipboardImporter');
var converters = ClipboardImporter.converters;
var CLIPBOARD_CONTAINER_ID = ClipboardImporter.CLIPBOARD_CONTAINER_ID;
var CLIPBOARD_PROPERTY_ID = ClipboardImporter.CLIPBOARD_PROPERTY_ID;

// FIXME: this is not working yet
function ClipboardExporter() {
  ClipboardExporter.super.call(this, {
    converters: converters
  });
}

ClipboardExporter.Prototype = function() {

  this.exportDocument = function(doc) {
    var html;
    var elements = this.convertDocument(doc);
    if (elements.length === 1 && elements[0].attr('data-id') === CLIPBOARD_PROPERTY_ID) {
      html = elements[0].innerHTML;
    } else {
      html = elements.map(function(el) {
        return el.outerHTML;
      }).join('');
    }
    return '<html><body>' + html + '</body></html>';
  };

  this.convertDocument = function(doc) {
    var content = doc.get(CLIPBOARD_CONTAINER_ID);
    if (!content) {
      throw new Error('Illegal clipboard document: could not find container "' + CLIPBOARD_CONTAINER_ID + '"');
    }
    return this.convertContainer(content);
  };

};

HtmlExporter.extend(ClipboardExporter);

ClipboardExporter.CLIPBOARD_CONTAINER_ID = CLIPBOARD_CONTAINER_ID;

module.exports = ClipboardExporter;
