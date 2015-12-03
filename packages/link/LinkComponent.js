var AnnotationComponent = require('../../ui/AnnotationComponent');

function LinkComponent() {
  LinkComponent.super.apply(this, arguments);
}

AnnotationComponent.extend(LinkComponent, function LinkComponentPrototype() {
  this.render = function() {
    var el = AnnotationComponent.prototype.render.call(this);
    var titleComps = [this.props.node.url];
    if (this.props.node.title) {
      titleComps.push(this.props.node.title);
    }

    return el.attr("title", titleComps.join(' | '));
  };

  this.didMount = function() {
    AnnotationComponent.prototype.didMount.call(this);
    var node = this.props.node;
    this.doc = node.getDocument();
    this.doc.getEventProxy('path').add([node.id, 'title'], this, this.rerender);
    this.doc.getEventProxy('path').add([node.id, 'url'], this, this.rerender);
  };

  this.dispose = function() {
    AnnotationComponent.prototype.dispose.call(this);
    this.doc.getEventProxy('path').remove([this.props.node.id, 'title'], this);
    this.doc.getEventProxy('path').remove([this.props.node.id, 'url'], this);
  };
});

module.exports = LinkComponent;