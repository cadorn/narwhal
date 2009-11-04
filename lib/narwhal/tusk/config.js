
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var JSON = require("json");
var UTIL = require("util");

var TUSK = require("./tusk");
var OVERLAY = require("./overlay");



var Config = function(type) {

    var impl = function (path) {
        if (!(this instanceof exports[type]))
            return new exports[type](path);
        this.path = path;
        this.config = (path.exists())?JSON.decode(path.read({charset:"utf-8"})):{"schema":"1"};
        
        // TODO: check schema and upgrade if applicable        
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
            JSON.encode(this.config, null, 4),
            {charset: 'utf-8'}
        );
    }
    
    return impl;
};


var TuskConfig = exports.TuskConfig = Config("TuskConfig");


TuskConfig.prototype.addSea = function(path) {

    path = path.valueOf();

    if(!UTIL.has(this.config,"seas")) {
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

    if(!UTIL.has(this.config, "seas")) {
        return false;
    }
    
    this.config.seas = this.config.seas.filter(function(path) {
       return !(path==seaPath);
    });

    this.save();

    return true;
}



TuskConfig.prototype.addCatalog = function(name, url) {

    if(!UTIL.has(this.config, "catalogs")) {
        this.config.catalogs = {};
    }

    if(UTIL.has(this.config.catalogs, name)) {
        throw new TUSK.TuskError("Catalog already exists for name: " + name);
    }

    this.config.catalogs[name] = url;

    this.save();
    
    return true;
}


TuskConfig.prototype.hasCatalog = function(name) {
    return (this.getCatalog(name)!==false);
}

TuskConfig.prototype.getCatalog = function(name) {
    if(!UTIL.has(this.config, "catalogs")) {
        return false;
    }
    if(!UTIL.has(this.config.catalogs, name)) {
        return false;
    }
    return this.config.catalogs[name];
}

TuskConfig.prototype.getCatalogs = function() {
    if(!UTIL.has(this.config, "catalogs")) {
        return false;
    }
    return this.config.catalogs;
}


var PackageMetadata = exports.PackageMetadata = Config("PackageMetadata");


PackageMetadata.prototype.addOverlay = function(overlay) {

    if(!UTIL.has(this.config, "overlays")) {
        this.config.overlays = {};
    }
    
    if(overlay.getType()=="catalog") {
        
        
        if(!UTIL.has(this.config.overlays, "catalog")) {
            this.config.overlays.catalog = {};
        }
        
        var url = overlay.getCatalogUrl();
        
        if(UTIL.has(this.config.overlays.catalog, url)) {
            throw new TUSK.TuskError("Overlay for catalog '" + url + "' already present.");
        }
        
        this.config.overlays.catalog[url] = overlay.getOverlayUrl();
        
        this.save();
        
    } else
    if(overlay.getType()=="location") {
        
        if(!UTIL.has(this.config.overlays, "location")) {
            this.config.overlays.location = {};
        }
        
        var url = overlay.getLocationUrl();
        
        if(UTIL.has(this.config.overlays.location, url)) {
            throw new TUSK.TuskError("Overlay for location '" + url + "' already present.");
        }
        
        this.config.overlays.location[url] = overlay.getOverlayUrl();
        
        this.save();
        
    } else {
        throw new TUSK.TuskError("NYI: cannot add overlay");
    }
}

PackageMetadata.prototype.forEachOverlay = function(callback, type) {
    if(!UTIL.has(this.config, "overlays")) return;
    var self = this;
    ["location", "catalog"].forEach(function(overlayType) {
        if(!type || overlayType==type) {
            if(UTIL.has(self.config.overlays, overlayType)) {
                UTIL.every(self.config.overlays[overlayType], function(pair) {
                    callback(OVERLAY[overlayType.substr(0,1).toUpperCase()+overlayType.substr(1)+"Overlay"](pair[0], pair[1]));
                });
            }
        }
    });
}

PackageMetadata.prototype.hasOverlay = function(uri, type) {
    if(!UTIL.has(this.config, "overlays")) return false;
    var self = this;
    var found = false;
    ["location", "catalog"].forEach(function(overlayType) {
        if(found) return;
        if(!type || overlayType==type) {
            if(UTIL.has(self.config.overlays, overlayType) &&
               UTIL.has(self.config.overlays[overlayType], uri)) {
                found = true;
            }
        }
    });
    return found;
}

PackageMetadata.prototype.getOverlay = function(uri, type) {
    if(!UTIL.has(this.config, "overlays")) return false;
    var self = this;
    var found = false;
    ["location", "catalog"].forEach(function(overlayType) {
        if(found) return;
        if(!type || overlayType==type) {
            if(UTIL.has(self.config.overlays, overlayType) &&
               UTIL.has(self.config.overlays[overlayType], uri)) {
                found = OVERLAY[overlayType.substr(0,1).toUpperCase()+overlayType.substr(1)+"Overlay"](uri, self.config.overlays[overlayType][uri]);
            }
        }
    });
    return found;
}
