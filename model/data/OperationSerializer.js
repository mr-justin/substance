/* jshint latedef:nofunc */
"use strict";

var oo = require('../../util/oo');
var ObjectOperation = require('./ObjectOperation');
var TextOperation = require('./TextOperation');
var ArrayOperation = require('./ArrayOperation');

/*
  Specification:

  - create:
    ```
    'c <JSON.stringify(data)>'
    'c { id: "1123", type: "paragraph", content: ""}'
    ```
  - delete:
    ```
    'd <JSON.stringify(data)>'
    'd { id: "1123", type: "paragraph", content: ""}'
    ```
  - set a property
    ```
    's <property path> <value> <old value>'
    's p1.content foo'
    ```
  - update a property
    ```
    'u <property path> <primitive op>'
    'u p1.content t+ 4 foo'
    ```

Primitive type operations:

  - insert text
    ```
    't+ <pos> <string>'
    't+ 4 foo'
    ```
  - delete text
    ```
    't- <pos> <string>'
    't- 4 foo'
    ```
  - insert value into array
    ```
    'a+ <pos> <value>'
    'a+ 0 p1'
    ```
  - delete value from array
    ```
    'a- <pos> <value>'
    'a- 0 p1'
    ```
*/

function OperationSerializer() {
  this.SEPARATOR = '\t';
}

OperationSerializer.Prototype = function() {

  this.serialize = function(op) {
    var out = [];
    switch (op.type) {
      case 'create':
        out.push('c');
        out.push(op.val.id);
        out.push(JSON.stringify(op.val));
        break;
      case 'delete':
        out.push('d');
        out.push(op.val.id);
        out.push(JSON.stringify(op.val));
        break;
      case 'set':
        out.push('s');
        out.push(op.path.join('.'));
        // NOTE: we need to replace undefined by null
        // as JSON does not support undefined as a value.
        if (op.val === undefined) {
          out.push('null');
        } else {
          out.push(JSON.stringify(op.val));
        }
        if (op.original === undefined) {
          out.push('null');
        } else {
          out.push(JSON.stringify(op.original));
        }
        break;
      case 'update':
        out.push('u');
        out.push(op.path.join('.'));
        out.push(this.serializePrimitiveOp(op.diff));
        break;
      default:
        throw new Error('Unsupported operation type.');
    }
    return out.join(this.SEPARATOR);
  };

  this.serializePrimitiveOp = function(op) {
    var out = [];
    if (op instanceof TextOperation) {
      if (op.isInsert()) {
        out.push('t+');
      } else if (op.isDelete()) {
        out.push('t-');
      }
      out.push(op.pos);
      out.push(JSON.stringify(op.str));
    } else if (op instanceof ArrayOperation) {
      if (op.isInsert()) {
        out.push('a+');
      } else if (op.isDelete()) {
        out.push('a-');
      }
      out.push(op.pos);
      out.push(JSON.stringify(op.val));
    } else {
      throw new Error('Unsupported operation type.');
    }
    return out.join(this.SEPARATOR);
  };

  this.deserialize = function(str, tokenizer) {
    if (!tokenizer) {
      tokenizer = new Tokenizer(str, this.SEPARATOR);
    }
    var type = tokenizer.getString();
    var op, path, val, oldVal, diff;
    switch (type) {
      case 'c':
        path = tokenizer.getPath();
        val = tokenizer.getObject();
        op = ObjectOperation.Create(path, val);
        break;
      case 'd':
        path = tokenizer.getPath();
        val = tokenizer.getObject();
        op = ObjectOperation.Delete(path, val);
        break;
      case 's':
        path = tokenizer.getPath();
        val = tokenizer.getObject();
        oldVal = tokenizer.getObject();
        op = ObjectOperation.Set(path, oldVal, val);
        break;
      case 'u':
        path = tokenizer.getPath();
        diff = this.deserializePrimitiveOp(str, tokenizer);
        op = ObjectOperation.Update(path, diff);
        break;
    }
    return op;
  };

  this.deserializePrimitiveOp = function(str, tokenizer) {
    if (!tokenizer) {
      tokenizer = new Tokenizer(str, this.SEPARATOR);
    }
    var type = tokenizer.getString();
    var op, pos, val;
    switch (type) {
      case 't+':
        pos = tokenizer.getNumber();
        val = tokenizer.getObject();
        op = TextOperation.Insert(pos, val);
        break;
      case 't-':
        pos = tokenizer.getNumber();
        val = tokenizer.getObject();
        op = TextOperation.Delete(pos, val);
        break;
      case 'a+':
        pos = tokenizer.getNumber();
        val = tokenizer.getObject();
        op = ArrayOperation.Insert(pos, val);
        break;
      case 'a-':
        pos = tokenizer.getNumber();
        val = tokenizer.getObject();
        op = ArrayOperation.Delete(pos, val);
        break;
      default:
        throw new Error('Unsupported operation type: ' + type);
    }
    return op;
  };
};

oo.initClass(OperationSerializer);

function Tokenizer(str, sep) {
  this.re = new RegExp("([^"+sep+"]+)("+sep+"|$)", "gi");
  this.str = str;
  this.pos = -1;
}

Tokenizer.Prototype = function() {

  this.error = function(msg) {
    throw new Error('Parsing error: ' + msg + '\n' + this.str.slice(this.pos));
  };

  this.getString = function() {
    var match = this.re.exec(this.str);
    if (!match) {
      this.error('expected string');
    }
    this.pos = match.index + match[0].length;
    var str = match[1];
    if (str[0] === '"') {
      str = str.slice(1, -1);
    }
    return str;
  };

  this.getNumber = function() {
    var match = this.re.exec(this.str);
    if (!match) {
      this.error('expected number');
    }
    var number;
    try {
      number = parseInt(match[1]);
      this.pos = match.index + match[0].length;
      return number;
    } catch (err) {
      this.error('expected number');
    }
  };

  this.getObject = function() {
    var match = this.re.exec(this.str);
    if (!match) {
      this.error('expected object');
    }
    var obj;
    try {
      obj = JSON.parse(match[1]);
      this.pos = match.index + match[0].length;
      return obj;
    } catch (err) {
      this.error('expected object');
    }
  };

  this.getPath = function() {
    var str = this.getString();
    return str.split('.');
  };
};

oo.initClass(Tokenizer);

OperationSerializer.Tokenizer = Tokenizer;

module.exports = OperationSerializer;
