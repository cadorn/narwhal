
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


// -- cadorn Christoph Dorn Copyright (C) 2010 MIT License

/**
 * This module manages system and using packages for a two-arg require loader.
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
 * Load all packages (system and using) for package descriptor
 */
exports.loadForDescriptor = function(path) {

    var descriptor = exports.parsePackageDescriptor(path);
    var info = {
        "package": PACKAGES.registerUsingPackage({
            "location": path.dirname().valueOf()
        }, path.dirname()),
        "packages": {}
    };
    if(UTIL.has(descriptor, "using")) {
        UTIL.forEach(descriptor["using"], function(item) {

            var id = exports.idForLocator(item[1]);
            var path = exports.findPackageForId(id);

            // TODO: This function should be implemented in this module
            PACKAGES.registerUsingPackage(item[1], path);

            info["packages"][item[0]] = id;

            // load all dependencies
            exports.loadForDescriptor(path.join("package.json"));
        });
    }
    return info;
}


exports.parsePackageDescriptor = function(path) {
    
    if(!path.exists()) {
        throw new UsingPackagesError("Path does not exist: " + path);
    }

    // TODO: Package property conversions for backwards compatibility
    
    return JSON.decode(path.read().toString());    
}


exports.findPackageForLocator = function(locator) {
    return exports.findPackageForId(exports.idForLocator(locator));
}

exports.findPackageForId = function(id) {
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
    var found = false;
    paths.forEach(function(path) {
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
    } else {
        throw new UsingPackagesError("NYI");
    }
    return id.join("/");
}

exports.directoryForRevision = function(revision) {
    if(/^[a-z][\w\d]*$/i.test(revision)) {
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


