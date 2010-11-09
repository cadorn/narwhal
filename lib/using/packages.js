
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


// -- cadorn Christoph Dorn Copyright (C) 2010 MIT License

/**
 * This module manages system and using packages for a two-arg require loader.
 * 
 * System packages are in package.json ~ "dependencies" properties
 * Using packages are in package.json ~ "using" properties
 * 
 * TODO: Move all related functionality from ../packages.js into this module
 * TODO: Document NARWHAL_PACKAGE_HOME environment variable
 */

var SYSTEM = require("system");
var JSON = require("json");
var UTIL = require("util");
var URI = require("uri");
var FILE = require("file");
var PACKAGES = require("packages");


/**
 * Recursively collect all dependencies for package at path
 */
exports.getDeepDependencies = function(path) {

    var descriptor = exports.parsePackageDescriptorForPackage(path);
    var info = {
        "system": {},
        "using": {}
    };
    var systemPackages = [];
    if(UTIL.has(descriptor, "using")) {
        UTIL.forEach(descriptor["using"], function(item) {

            var id = exports.idForLocator(item[1]);
            
            if(info["using"][id]) {
                return;
            }

            var path = exports.findPackageForId(id);

            info["using"][id] = {
                "path": path.valueOf(),
                "locator": item[1]
            };

            exports.getDeepDependencies(path);
        });
    }
    if(UTIL.has(descriptor, "dependencies")) {
        if(UTIL.isArrayLike(descriptor["dependencies"])) {
            // ignore all packages specified without a locator
        } else {
            var paths = [];
            UTIL.forEach(descriptor["dependencies"], function(item) {

                var id = exports.idForLocator(item[1]);

                if(info["system"][id]) {
                    // TODO: add to info["system"][id].name if applicable
                    return;
                }

                info["system"][id] = {
                    "name": item[0],
                    "path": path.valueOf(),
                    "locator": item[1]
                };

                var path = exports.findPackageForId(id);
                
                exports.getDeepDependencies(path);
            });
        }
    }
    return info;
}

/**
 * Load all dependency packages (system and using) for package at path
 */
exports.loadForPackage = function(path) {
    
    // TODO: Refactor to use exports.getDeepDependencies() to gather dependencies and then register them below

    var descriptor = exports.parsePackageDescriptorForPackage(path);

    var info = {
        "package": "",
        "packages": {}
    };

    if(descriptor.uid && PACKAGES.uidCatalog[descriptor.uid]) {
        info["package"] = PACKAGES.uidCatalog[descriptor.uid].id;
    } else {
        info["package"] = PACKAGES.registerUsingPackage({
            "location": path.valueOf()
        }, path);
    }

    var systemPackages = [];
    if(UTIL.has(descriptor, "using")) {
        UTIL.forEach(descriptor["using"], function(item) {

            var id = exports.idForLocator(item[1]);
 
            // if package is already registered we skip it
// HACK: Commenting this out may register packages more than once. This needs to be fixed.
//       At the moment this is needed to augment java paths for workers where package may already be registered
// TODO: Augment java paths more directly
//            if(UTIL.has(PACKAGES.usingCatalog, id)) {
//                return;
//            }

            var path = exports.findPackageForId(id);

            // TODO: This function should be implemented in this module
            PACKAGES.registerUsingPackage(item[1], path);

            info["packages"][item[0]] = id;

            // load all dependencies
            exports.loadForPackage(path);
        });
    }
    if(UTIL.has(descriptor, "dependencies")) {
        if(UTIL.isArrayLike(descriptor["dependencies"])) {
            // ignore all packages specified without a locator
        } else {
            var paths = [];
            UTIL.forEach(descriptor["dependencies"], function(item) {
                
                var path = exports.findPackageForLocator(item[1]);
                
                systemPackages.push(path.valueOf());

                // load all dependencies
                exports.loadForPackage(path);
            });
        }
    }
    if(UTIL.len(systemPackages)>0) {
        PACKAGES.registerSystemPackages(systemPackages);
    }
    return info;
}


exports.parsePackageDescriptorForPackage = function(path) {
    
    if(!path.join("package.json").exists()) {
        throw new UsingPackagesError("Path does not point to a package: " + path);
    }

    var descriptor = JSON.decode(path.join("package.json").read().toString());
    if(path.join("package.local.json").exists()) {
        UTIL.deepUpdate(descriptor, JSON.decode(path.join("package.local.json").read().toString()));
    }

    // TODO: Package property conversions for backwards compatibility

    return descriptor;
}


exports.findPackageForLocator = function(locator) {
    return exports.findPackageForId(exports.idForLocator(locator));
}

exports.getPackagesPaths = function() {
    var paths = [];
    if(SYSTEM.sea) {
        paths.push(FILE.Path(SYSTEM.sea));
    }
    if(UTIL.has(SYSTEM.env, "NARWHAL_PACKAGE_HOME")) {
        paths.push(FILE.Path(SYSTEM.env.NARWHAL_PACKAGE_HOME));
    }
    if(!UTIL.len(paths)) {
        throw new UsingPackagesError("No search path for packages! You need to specify SEA or NARWHAL_PACKAGE_HOME environment variables.");
    }
    return paths;
}

exports.findPackageForId = function(id) {
    var found = false;
    exports.getPackagesPaths().forEach(function(path) {
        if(found) return;
        if(path.join(id, "package.json").exists()) {
            found = path.join(id);
        }
    });
    return found;
}

exports.idForLocator = function(locator) {
    var id = [];
    if(UTIL.has(locator, "catalog")) {
        if(!UTIL.has(locator, "name")) {
            throw new UsingPackagesError("Catalog based locator does not specify a 'name' property");
        }
        if(!UTIL.has(locator, "revision")) {
            throw new UsingPackagesError("Catalog based locator does not specify a 'revision' property");
        }
        var uri = URI.parse(locator.catalog);
        if(uri.file!="catalog.json") {
            throw new UsingPackagesError("Catalog URL does not end in /catalog.json");
        }
        id.push(uri.authority);
        id = id.concat(uri.directories);
        id.push(locator.name);
        id.push(exports.directoryForRevision(locator.revision));
    } else
    if(UTIL.has(locator, "location")) {
        var uri = URI.parse(locator.location);
        id.push(uri.authority);
        id = id.concat(uri.directories);
        if(uri.file) id.push(uri.file);
    } else {
        throw new UsingPackagesError("Invalid package locator. Does not contain 'catalog' nor 'location' property.");
    }
    return id.join("/");
}

exports.directoryForRevision = function(revision) {
    if(/^[a-z][\w\d\.]*$/i.test(revision)) {
        return revision;
    } else {
        throw new UsingPackagesError("NYI");
    }
}




var UsingPackagesError = exports.UsingPackagesError = function(message) {
    this.name = "UsingPackagesError";
    this.message = message;

    // this lets us get a stack trace in Rhino
    if (typeof Packages !== "undefined")
        this.rhinoException = Packages.org.mozilla.javascript.JavaScriptException(this, null, 0);
}
UsingPackagesError.prototype = new Error();


