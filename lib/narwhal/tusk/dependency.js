
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var FILE = require("file");
var UTIL = require("util");
var URI = require("uri");
var PACKAGE = require("./package");
var CATALOG = require("./catalog");
var LOCATOR = require("./locator");
var PACKAGES = require("packages");
var TUSK = require("./tusk");

exports.Dependency = function (sea, parentPkg, info) {

    // PRIVATE
    
    var name,       // name or alias of a package
        id,         // top-level id of a package
        pathLookup,
        path,       // install path for the package
        locator,    // origin/source info
        isSeaPackage = false;   // whether the dependency is a top-level sea package
    
    var seaCatalog = sea.getCatalog();
    
    // ["<alias>", <locator>]    
    if(UTIL.isArrayLike(info)) {
        name = info[0];
        locator = LOCATOR.Locator(info[1]);
        
        // check if the locator is a catalog pointer and the catalog it is
        // pointing to is the same as the active sea catalog.
        // if it is we want to reference the package included in the sea rather
        // than set up a remote dependency

        var originInfo = seaCatalog.getOriginInfo(),
            locatorUri = locator.getUri();
        
        if(locator.getType()=="catalog" && (
           // published sea catalog
           (UTIL.has(originInfo, "locate") && originInfo.locate==locator.getUrl()) ||
           // unpublished sea catalog
           (locatorUri.protocol=="file" && locatorUri.domain.substr(0,1)=="." &&
            parentPkg.getPath().join("").resolve(locatorUri.domain + locatorUri.path).valueOf()==seaCatalog.getPath().valueOf())
           )) {
            
            name = null;
            isSeaPackage = true;
            info = locator.getPackageName();

        } else {
            id = "dependencies/" + locator.getId();
            pathLookup = function() {
                return sea.getDependenciesPath().join(locator.getId());
            };
        }
    }
        
    if(!name) {
        name = id = info;
        
        // for backwards compatibility we check if the dependency comes from
        // the narwhal catalog
        var narwhalCatalog = sea.getNarwhalCatalog();
        if(narwhalCatalog.hasPackage(name)) {
            locator = LOCATOR.Locator({
                "catalog": narwhalCatalog.getPath().valueOf(),
                "package": name,
                "revision": "latest"
            });
        } else {
            locator = LOCATOR.Locator({
                "locate": "file://" + parentPkg.getPackagesPath().join(name).valueOf(),
                "package": name,
                "revision": "latest"
            });
        }
        pathLookup = function() {
            // local dependency - lookup in catalog
            if(sea.hasPackage(name)) {
                return sea.getPackage(name).getPath();
            } else
            // lookup in installed packages
            if(UTIL.has(PACKAGES.catalog, name)) {
                return PACKAGES.catalog[name].directory;
            } else {
                // if not found in catalog we assume the path relative to the parent package
                return parentPkg.getPackagesPath().join(name);                
            }
            return undefined;
        }
    }
    
    // PUBLIC

    var Dependency = {};
    
    Dependency.getName = function() {
        return name;
    }
    Dependency.getPath = function() {
        if(path) {
            return path;
        }
        return (path = pathLookup());
    }
    Dependency.getId = function() {
        return id;
    }
    Dependency.getInfo = function() {
        return info;
    }
    Dependency.getLocator = function() {
        return locator;
    }
    Dependency.isSeaPackage = function() {
        return isSeaPackage;
    }
    Dependency.getParentPackage = function() {
        return parentPkg;
    }
    Dependency.getPackage = function() {    
        var pkg = PACKAGE.Package(Dependency.getPath());
        pkg.setSea(sea);
        return pkg;
    }
    
    Dependency.install = function(owner, options) {

        print("install dependency " + this.name);    

    }

    return Dependency;
    
    
    // PRIVATE

}
