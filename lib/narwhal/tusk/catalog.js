
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

Catalog.prototype.getCatalog = function() {
    if(!this.catalog) {
        if(!this.exists()) {
            throw "catalog not initialized";
        }
        this.catalog = json.decode(this.getPath().read({charset:"utf-8"}));
        this.validate();
    }
    return this.catalog;
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

    if(this.locked) {
        throw "package is locked and cannot be modified";
    }

    var path = this.getPath(),
        catalog = this.getCatalog()

    path.dirname().mkdirs();
    
    if(util.has(catalog, "packages")) {
        // generate revision hash based on package data    
//        catalog.revision = STRUCT.bin2hex(MD5.hash(json.encode(catalog.packages, null, 4)));
    } else {
//        catalog.revision = "";
    }
    
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

Catalog.prototype.getName = function() {
    
    var catalog = this.getCatalog();
    
    // for backwards compatibility
    if(!util.has(catalog, "name")) {
        if(exports.getCatalog("narwhal").getPath().match(this.getPath())) {
            return "narwhal";
        }
    }
    
    return catalog.name;
}

Catalog.prototype.getRevision = function() {
    var catalog = this.getCatalog();
    if(!util.has(catalog, "revision")) {
        return "";
    }
    return catalog.revision;
}

Catalog.prototype.getType = function() {
    var catalog = this.getCatalog();
    if(!util.has(catalog, "type")) {
        return null;
    }
    return catalog.type;    
}

Catalog.prototype.hasOverlay = function(overlay) {
    
    var catalog = this.getCatalog();
    
    if(!util.has(catalog, "overlays")) {
        return false;
    }
    
    return (catalog.overlays.indexOf(overlay.getName())>-1);
}

Catalog.prototype.addOverlay = function(overlay) {

    var catalog = this.getCatalog();
    
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
Catalog.prototype.addPackage = function(alias, revision, locator) {
    
    if(this.hasPackage(alias)) {
        throw "package already listed in catalog";
    }

    var catalog = this.getCatalog();
    
    if(!util.has(catalog, "packages")) {
        catalog.packages = {};
    }
    
    catalog.packages[alias] = [
        [revision, locator.getInfo()]
    ];
    
    this.save();
}

// needed
Catalog.prototype.removePackage = function(pkg, revision) {
    
    if(!this.hasPackage(pkg)) {
        throw "package not found in catalog";
    }
    
    var name = pkg;
//    if(pkg instanceof PACKAGE.Package) {
//        name = pkg.getName();
//    }

    var catalog = this.getCatalog();
    
    if(!revision) {
        delete catalog.packages[name];
    } else {
        for( var i=0 ; i<catalog.packages[name].length ; i++ ) {
            if(catalog.packages[name][i][0]==revision) {
                delete catalog.packages[name][i];
                break;
            }
        }
    }
    
    this.save();
}

// needed
Catalog.prototype.hasPackage = function(pkg, revision) {

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

    if(!revision) {
        return util.has(catalog.packages, name);
    }
        
    // also check the revision
    var found = false;
    catalog.packages[name].forEach(function(info) {
        if(found) {
            return;
        }
        if(info[0]==revision) {
            found = true;
        }
    });
    return found;
}

// needed
Catalog.prototype.getLocator = function(name, revision) {

    var catalog = this.getCatalog();

    if(!util.has(catalog, "packages"))
        return false;
    
    if(!util.has(catalog["packages"], name)) {
        return false;
    }
        
    // also check the revision
    var found = false;
    catalog.packages[name].forEach(function(info) {
        if(found) {
            return;
        }
        if(info[0]==revision) {
            found = info[1];
        }
    });
    return LOCATOR.Locator(found);
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

Catalog.prototype.getPackage = function(name, revision) {
    
    var catalog = this.getCatalog();

    if(!util.has(catalog, "packages")) {
        return false;
    }

    if(!util.has(catalog.packages, name)) {
        return false;
    }
    
    var info = catalog.packages[name];
    /*
    [
       [
          "source",
          {
             "locate": "file://./packages/common",
             "package": "common",
             "revision": "latest"
          }
       ],
       [
          "latest",
          {
             "locate": "http://github.com/cadorn/narwhalrunner/zipball/master/",
             "path": "packages/common",
             "package": "common",
             "revision": "latest"
          }
       ]
    ]
    */
    
    var locatorInfo;
    info.forEach(function(revisionInfo) {
        if(locatorInfo) {
            return;
        }
        if(revisionInfo[0]==revision) {
            locatorInfo = revisionInfo[1];
        }
    });
    
    if(!locatorInfo) {
        throw "no locator found for revision: " + revision;
    }
    
    var locator = LOCATOR.Locator(locatorInfo);
    
    // check if the locator is a relative file path.
    // if it is we are seeing a package relative to this
    // catalog which only makes sense if this is a sea catalog.
    
    if(locator.isRelative()) {
        if(!this.sea || this.getType()!="sea") {
            throw "trying to service relative locator for non-sea catalog";
        }
        
        // since a sea catalog works together with a sea/package and packages
        // with the same name can only exist once within a package
        // we can simply locate the package in the sea by name ignoreing the path
        
        return this.sea.getPackage(locator.getPackageName());

    } else {

        return TUSK.getActive().getPlanet().getPackage(locator);
        
    }

    
/*    
    var catalog = this.getCatalog(),
        uri,
        overlayCatalog,
        pkg;
    
    // first check all overlays
    if(util.has(catalog, "overlays")) {
        catalog.overlays.forEach(function(overlayName) {
            if(pkg) {
                return;
            }
            overlayCatalog = CATALOG.getCatalog(overlayName);
            if(overlayCatalog.hasPackage(name)) {
                pkg = overlayCatalog.getPackage(name);
            }
        });
    }
    if(pkg) {
        return pkg;
    }
    
    if(!this.hasPackage(name)) {
        
        // for backwards compatibility
        if(this.getType()=="sea") {
            var catalog = CATALOG.getCatalog("narwhal");
            if(catalog.getPath()!=this.getPath()) {

                print('package not found in sea catalog. will now try default narwhal catalog.');
                return catalog.getPackage(name);
            }
        }
        
        return null;
    }

    // for backwards compatibility
    if(!util.has(catalog.packages[name], "origin")) {
        // the old way
        
        uri = URI.parse(catalog.packages[name].location);
        
    } else {
        // the new way
        
        // To load the package we need to locate the original package
        uri = URI.parse(catalog.packages[name].origin.url);
    }
    
    // Check if the URI is a relative file path
    if(uri.protocol=="file" && uri.domain==".") {
        // The path is relative to this catalog. We can resolve it if
        // we do not have an "origin" property. If we do (as is the case
        // with planet catalogs) we need to let the origin catalog resolve
        // the path (which is likely a sea catalog where packages are located
        // relative to the catalog)
        
        if(util.has(catalog, "origin")) {
           // An origin is set. Follow it if it is a file path
           var originURI = URI.parse(catalog.origin.url);
           if(originURI.protocol!="file") {
               throw "cannot resolve relative package path for package '"+name+"' in catalog '"+this.getPath()+"' as catalog does not have an origin pointing to a local file path";
           }

           var originCatalog = CATALOG.Catalog(originURI);
           
           // Ensure signature of origin catalog matches our origin info
           // TODO: compare more than just name?
           if(originCatalog.getName()!=catalog.origin.name) {
               throw "origin catalog name does not match name in origin info";
           }

           return originCatalog.getPackage(name);

        } else {
            // No origin is set. We can now load the package based on the relative path
            uri = URI.parse("file://" + this.getPath().dirname().join(uri.path.substr(1)));  
            pkg = PACKAGE.Package(uri);
            pkg.originCatalog = this;
            pkg.catalogOrigin = catalog.packages[name].origin;
            return pkg;
        }
    }
    // URI is absolute so we can load the package directly
    pkg = PACKAGE.Package(uri);
    pkg.originCatalog = this;
    pkg.catalogOrigin = catalog.packages[name].origin;
    return pkg;
    
*/    
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
