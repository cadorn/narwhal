
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var UTIL = require("util");
var FILE = require("file");
var URI = require("uri");
var TUSK = require("./tusk");



var Locator = exports.Locator = function (info, originalLocator) {
    if (!(this instanceof exports.Locator)) {
        return new exports.Locator(info, originalLocator);
    }

    // PRIVATE

    if(!info) {
        throw new TUSK.TuskError("no package descriptor");        
    }
    if(typeof info == "string" || UTIL.isArrayLike(info)) {
        throw new TUSK.TuskError("package descriptor is not an object: " + info);        
    }

    if(!UTIL.has(info, "catalog") && !UTIL.has(info, "location") && !UTIL.has(info, "name")) {
        throw new TUSK.TuskError("'catalog' nor 'location' nor 'name' specified in package descriptor");            
    }
    if(UTIL.has(info, "catalog") && info.catalog && UTIL.has(info, "location") && info.location) {
        throw new TUSK.TuskError("'catalog' and 'location' specified in package descriptor");            
    }
    if(UTIL.has(info, "catalog") && info.catalog && !UTIL.has(info, "name")) {
        throw new TUSK.TuskError("'name' not specified in package descriptor");            
    }

    var type,
        uri;
    if(UTIL.has(info, "catalog") && info.catalog) {
        type = "catalog";
        uri = URI.parse(info.catalog);
    } else
    if(UTIL.has(info, "location") && info.location) {
        type = "location";
        uri = URI.parse(info.location);
    } else {
        type = "named";
    }
    
    originalLocator = originalLocator || false;
    
    // PUBLIC

    var Locator = {};
    
    Locator.getType = function() {
        return type;
    }
    Locator.getName = function() {
        if(!UTIL.has(info, "name")) {
            return false;
        }
        return info["name"];
    }
    Locator.getPath = function() {
        if(!UTIL.has(info, "path")) {
            return false;
        }
        return info["path"];
    }
    Locator.getInfo = function() {
        return info;
    }
    Locator.setOriginal = function(locator) {
        originalLocator = locator;
    }
    Locator.getOriginal = function() {
        return originalLocator;
    }
    Locator.isNamedOnly = function() {
        return (type=="named");
    }
    Locator.isRelative = function() {
        return (uri && uri.protocol=="file" && uri.domain.substr(0,1)==".");
    }
    Locator.getOriginalId = function() {
        var original = Locator.getOriginal();
        if(original) {
            return original.getOriginalId();
        } else {
            return Locator.getId();
        }
    }
    Locator.getId = function() {
        var domain = uri.domain;
        var id;
        if(type=="catalog") {
            id = FILE.Path(domain + uri.path).dirname().join(info["name"]).valueOf();
        } else {
            var id = FILE.Path(domain + uri.path);
            if(UTIL.has(info, "path") && info.path) {
                id = id.join(info["path"]);
            }
            id = id.valueOf();
        }
        if(id.substr(0,1)=="/") {
            id = id.substr(1);
        }
        if(id.substr(id.length-1,1)=="/") {
            id = id.substr(0,id.length-1);
        }
        return id;
    }
    Locator.getUri = function() {
        return uri;
    }
    Locator.getUrl = function() {
        if(!uri) return false;
        return uri.url;
    }
    Locator.toString = function() {
        var name = Locator.getName();
        var path = Locator.getPath() || "";
        if(type=="named") {
            return type.toUpperCase() + "(" + name + ")"+((originalLocator)?"OVERLAY":"");
        } else {
            return type.toUpperCase() + "(" + uri.url + path + ")"+((type=="catalog" && name)?"[" + name + "]":"")+((originalLocator)?"OVERLAY":"");
        }
    }
    
    UTIL.update(this, Locator);
}