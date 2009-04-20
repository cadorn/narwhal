var Binary = exports.Binary = function(bytes) {
    this.bytes = bytes;
}

Binary.prototype.getLength = function() {
    return this.bytes.length;
}

Binary.prototype.toString = function(encoding) {
    var jstr = encoding ?
               new java.lang.String(this.bytes, encoding) :
               new java.lang.String(this.bytes);
    return String(jstr);
}
