
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var system = require("system");
var fs = require("file");
var json = require("json");
var util = require("util");


var Config = function(type) {

    var impl = function (path) {
        if (!(this instanceof exports[type]))
            return new exports[type](path);
        this.path = path;
        this.config = (path.exists())?json.decode(path.read({charset:"utf-8"})):{};
    }

    impl.prototype.exists = function() {
        return this.path.exists();
    }
        
    impl.prototype.getPath = function() {
        return this.path;
    }
        
    impl.prototype.save = function() {
        this.path.dirname().mkdirs();
        this.path.write(
            json.encode(this.config, null, 4),
            {charset: 'utf-8'}
        );
    }
    
    return impl;
};


var TuskConfig = exports.TuskConfig = Config("TuskConfig");


TuskConfig.prototype.addSea = function(path) {

    path = path.valueOf();

    if(!util.has(this.config,"seas")) {
        this.config.seas = [];
    }

    if(this.config.seas.indexOf(path)>=0) {
        return false;
    }

    this.config.seas.push(path);
    
    this.save();
    
    return true;
}

TuskConfig.prototype.removeSea = function(seaPath) {

    if(!util.has(this.config, "seas")) {
        return false;
    }
    
    this.config.seas = this.config.seas.filter(function(path) {
       return !(path==seaPath);
    });

    this.save();

    return true;
}