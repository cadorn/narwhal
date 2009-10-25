
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var system = require("system");
var fs = require("file");
var json = require("json");
var util = require("util");
var URI = require("uri");
var MD5 = require("md5");
var HTTP = require("http");
var STRUCT = require("struct");
var tusk = require("./tusk");
var tuskUtil = require("./util");

var PACKAGE = require("./package");
var LOCATOR = require("./locator");
var CATALOG = require("./catalog");
var TUSK = require("./tusk");
var SEA = require("./sea");



var Catalog = exports.Catalog = function (path, url) {
    if (!(this instanceof exports.Catalog))
        return new exports.Catalog(path, url);
    
    if(path instanceof fs.Path) {
        this.path = path;
    } else {
        this.path = fs.Path(path);
    }
    
    this.path = this.path.absolute();

    this.url = url || "file://" + this.path.valueOf();
    
    this.locked = false;
}

Catalog.prototype.getPath = function() {
    return this.path;
}

Catalog.prototype.getUrl = function() {
    return this.url;
}

Catalog.prototype.setFallbackCatalog = function(catalog) {
    this.fallbackCatalog = catalog;
    return this;
}

Catalog.prototype.reload = function() {
    delete this.catalog;
    delete this.localCatalog;
}

Catalog.prototype.getCatalog = function(includeLocal) {
    
    includeLocal = !(includeLocal==false);      // default to: true
    
    if(!this.catalog) {
        if(this.exists()) {
            this.catalog = json.decode(this.getPath().read({charset:"utf-8"}));
        } else {
            this.catalog = {schema: "1.1", "packages": {}};
        }
        this.validate();
    }

    // overlay local catalog
    if(includeLocal && this.getPath().dirname().join("catalog.local.json").exists()) {
        
        var catalog = util.deepCopy(this.catalog);
        
        if(!this.localCatalog) {
            this.localCatalog = json.decode(this.getPath().dirname().join("catalog.local.json").read({charset:"utf-8"}));
        }
        
        util.deepUpdate(catalog, this.localCatalog);

        return catalog;
        
    } else {
        return this.catalog;
    }
}

Catalog.prototype.getLocalCatalog = function() {
    if(this.getPath().basename().valueOf()!="catalog.json") {
        throw new TUSK.TuskError("Cannot get local catalog for non catalog.json file.");
    }
    var localCatalog = exports.Catalog(this.getPath().dirname().join("catalog.local.json"));
    localCatalog.setSea(this.sea);
    return localCatalog;
}

Catalog.prototype.create = function(name) {
    if(this.catalog) {
        throw "Catalog already exists";
    }
    this.catalog = {name: name};
    this.validate();
    this.save();
}

Catalog.prototype.remove = function(name) {
    if(!this.exists()) {
        throw "catalog does not exist";
    }
    this.getPath().remove();
}

Catalog.prototype.setSea = function(sea) {
    this.sea = sea;
}

Catalog.prototype.exists = function() {
    return this.getPath().exists();
}

Catalog.prototype.validate = function() {
    var catalog = this.getCatalog();

    if(catalog.schema!="1.1") {
        throw new TUSK.TuskError("Catalog does not follow schema 1.1: " + this.getPath());
    }

    return true;
}

// needed
Catalog.prototype.save = function() {
/*
    if(this.locked) {
        throw "package is locked and cannot be modified";
    }
*/    

    var path = this.getPath(),
        catalog = this.getCatalog(false);

    path.dirname().mkdirs();

    path.write(
        json.encode(catalog, null, 4),
        {charset: 'utf-8'}
    );
}

Catalog.prototype.update = function() {

    var originCatalog = this.getOriginCatalog();

/*    
    this.print('\0blue(Downloading catalog.\0)');
    var catalogData = http.read('http://github.com/tlrobinson/narwhal/raw/master/catalog.json');
    this.print('\0green(Saving catalog.\0)');
    tusk.getCatalogPath().write(catalogData, 'b');
*/
        
    print("  Updating '"+this.getName()+"' from: " + originCatalog.getURL());
    
    originCatalog.clearCache();
    
    this.replaceWith(originCatalog);
    
    
}

Catalog.prototype.isSeaCatalog = function() {
    return (this.getPath().basename().valueOf()=="catalog.json" &&
            this.getPath().dirname().join("package.json").exists());
}

Catalog.prototype.hasOverlay = function(overlay) {
    
    var catalog = this.getCatalog();
    
    if(!util.has(catalog, "overlays")) {
        return false;
    }
    
    return (catalog.overlays.indexOf(overlay.getName())>-1);
}

Catalog.prototype.addOverlay = function(overlay) {

    var catalog = this.getCatalog(false);
    
    if(!util.has(catalog, "overlays")) {
        catalog.overlays = [];
    }
    
    if(catalog.overlays.indexOf(overlay.getName())>-1) {
        throw "overlay already exists";
    }
    
    catalog.overlays.push(overlay.getName());
    
    this.save();
}

Catalog.prototype.getPackageCount = function() {
    var catalog = this.getCatalog();
    if(!util.has(catalog, "packages")) {
        return 0;
    }
    return util.len(catalog.packages);
}

// needed
Catalog.prototype.addPackage = function(alias, locator) {

    if(this.hasPackage(alias)) {
        throw "package already listed in catalog";
    }

    var catalog = this.getCatalog(false);
    
    if(!util.has(catalog, "packages")) {
        catalog.packages = {};
    }
    
    catalog.packages[alias] = locator.getInfo();
    
    this.save();
}

// needed
Catalog.prototype.removePackage = function(pkg) {
    
    if(!this.hasPackage(pkg)) {
        throw "package not found in catalog";
    }
    
    var name = pkg;
//    if(pkg instanceof PACKAGE.Package) {
//        name = pkg.getName();
//    }

    var catalog = this.getCatalog();
    
    delete catalog.packages[name];
    
    this.save();
}

// needed
Catalog.prototype.hasPackage = function(pkg) {

    var catalog = this.getCatalog();

    if(!util.has(catalog, "packages"))
        return false;
    
    var name = pkg;
//    if(pkg instanceof PACKAGE.Package) {
//        name = pkg.getName();
//    }

    if(!util.has(catalog["packages"], name)) {
        return false;
    }

    return util.has(catalog.packages, name);
}

// needed
Catalog.prototype.forEachPackageDescriptor = function(callback) {

    var catalog = this.getCatalog();

    if(!util.has(catalog, "packages")) {
        return false;
    }

    util.every(catalog.packages, function(pair) {
        callback(pair[0], pair[1]);
    });
}

// needed
Catalog.prototype.getLocator = function(name, originalLocator) {

    var catalog = this.getCatalog();

    if(!util.has(catalog, "packages"))
        return false;
    
    if(!util.has(catalog["packages"], name)) {
        return false;
    }
    
    if(this.fallbackCatalog) {
        return LOCATOR.Locator(catalog["packages"][name], originalLocator);
    } else {
        return LOCATOR.Locator(catalog["packages"][name]);
    }
}

Catalog.prototype.forEachPackage = function(callback) {

    var catalog = this.getCatalog(),
        overlayCatalog,
        overlayCatalogMatch;

    if(!util.has(catalog, "packages")) {
        return false;
    }    
    
    for( var name in catalog.packages ) {
        
        overlayCatalogMatch = null;
        
        if(util.has(catalog, "overlays")) {
            catalog.overlays.forEach(function(overlayName) {
                if(overlayCatalogMatch) {
                    return;
                }
                overlayCatalog = CATALOG.getCatalog(overlayName);
                if(overlayCatalog.hasPackage(name)) {
                    overlayCatalogMatch = overlayCatalog;
                }
            });
        }
        
        if(overlayCatalogMatch) {
            callback(name, overlayCatalogMatch.getCatalog().packages[name], overlayCatalogMatch.getName());
        } else {
            callback(name, catalog.packages[name], null);
        }
    }
     
    return true;   
}

Catalog.prototype.getPackage = function(name) {
    
    var catalog = this.getCatalog();

    if(!util.has(catalog, "packages")) {
        return false;
    }

    if(!util.has(catalog.packages, name)) {
        return false;
    }
    
    var locator = LOCATOR.Locator(catalog.packages[name]);
    
    // check if we are seeking a package relative to a sea catalog
    if(this.isSeaCatalog() && locator.isRelative()) {

        // since a sea catalog works together with a sea/package and packages
        // with the same name can only exist once within a package
        // we can simply locate the package in the sea by name ignoreing the path
        
        return this.sea.getPackage(locator.getPackageName());
        
    } else {
        
        return TUSK.getActive().getPlanet().getPackage(locator);        
    }
}


/*
Catalog.prototype.getOrigin = function() {
    throw "deprecated. use: getOriginInfo()";    
}

// needed
Catalog.prototype.getOriginInfo = function() {
    
    var catalog = this.getCatalog();
    
    if(!util.has(catalog, "origin")) {
        return false;
    }
    
    return catalog.origin;
*/

/*    
    // ensure we have all default keys set
    var origin = {
        url: "",
        revision: ""
    }
    
    // for backwards compatibility
    if(this.getName()=="narwhal") {
        origin.url = "http://github.com/tlrobinson/narwhal/raw/master/catalog.json";
    }    
    
    util.update(origin, this.getCatalog().origin);
    
    return origin;
*/
//}

/*
Catalog.prototype.getOriginCatalog = function() {
    var originInfo = this.getOriginInfo();
    if(!originInfo.url) {
        return null;
    }
    return exports.Catalog(originInfo.url);
}

Catalog.prototype.hasOriginUpdates = function() {
    return (this.getOriginInfo().revision!=this.getOriginCatalog().getRevision());
}

Catalog.prototype.assembleOriginInfo = function() {
    var info = {};
    info.name = this.getName();
    info.url = this.uri.url;
    info.revision = this.getRevision();
    return info;
}
*/

Catalog.prototype.replaceWith = function(newCatalog) {
    
    var catalog = this.getCatalog();
    
    var name = catalog.name;
    
    util.update(catalog, newCatalog.getCatalog());
    
    catalog.name = name;    
    catalog.origin = newCatalog.assembleOriginInfo();
    
    this.save();
}





exports.list = function() {
    var info = {
        sea: [ SEA.getActive().getCatalog().getPath() ],
        planet: [ exports.getCatalog("narwhal").getPath() ]
//        narwhal: [ exports.getCatalog("narwhal").getPath() ]
    };
    
    var planetCatalogs = tusk.getPlanetTuskDirectory().glob("*.catalog.json");
    planetCatalogs.forEach(function(path) {
        info.planet.push(path);
    });
    
    return info;
}

exports.getCatalog = function(name) {
    if(!name) {
        return SEA.getActive().getCatalog();
    } else
    if(name=="narwhal") {
        return Catalog(fs.Path(system.env["NARWHAL_HOME"]).join("catalog.json"));
    }
    return Catalog(tusk.getPlanetTuskDirectory().join(name + ".catalog.json"), name);
}
