var TOC = require('../ui/toc');

function DocumentationTOC() {
  DocumentationTOC.apply(this, arguments);
}

DocumentationTOC.Prototype = function() {

  this.computeEntries = function(config) {
    var doc = this.getDocument();
    var entries = [];
    var contentNodes = doc.get('body').nodes;

    contentNodes.forEach(function(nsId) {
      var ns = this.get(nsId);
      entries.push({
        id: nsId,
        level: 1,
        node: ns
      });

      each(ns.getMemberCategories(), function(cat) {
        var catMembers = ns.getCategoryMembers(cat, config);
        catMembers.forEach(function(catMember) {
          entries.push({
            id: catMember.id,
            level: 2,
            node: catMember
          });
        });

        tocNodes = tocNodes.concat(catMembers);
      });
    }.bind(this));
    return entries;
  };
};

TOC.extend(DocumentationTOC);

DocumentationTOC.static.tocTypes = ['namespace', 'class', 'function', 'module'];

module.exports = DocumentationTOC;
