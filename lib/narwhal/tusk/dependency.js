
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var FILE = require("file");
var UTIL = require("util");
var URI = require("uri");
var PACKAGE = require("./package");
var CATALOG = require("./catalog");
var LOCATOR = require("./locator");
var PACKAGES = require("packages");
var TUSK = require("./tusk");

exports.Dependency = function (sea, parentPkg, name, info, type) {

    // PRIVATE
    
    var name,       // name or alias of a package
        id,         // top-level id of a package
        pathLookup,
        path,       // install path for the package
        locator,    // origin/source info
        isSeaPackage = false;   // whether the dependency is a top-level sea package


    var originalLocator = locator = LOCATOR.Locator(info);
    
    // now that we have the specified package descriptor lets resolve it
    if(locator.getType()=="catalog") {
        var catalog = TUSK.getActive().getPlanet().getCatalog(locator);
        if(!catalog.hasPackage(locator.getName())) {
            throw new TUSK.TuskError("Package '" + locator.getName() + "' not found in catalog: " + locator.getUrl());
        }
        locator = catalog.getLocator(locator.getName(), locator);
    } else
    if(locator.getType()=="location") {
        locator = TUSK.getActive().getPlanet().resolveLocator(locator);
    }


    // check if we have a dependency local to the sea
    if(locator.isNamedOnly()) {
        path = sea.getPackage(locator.getName()).getPath();
        id = locator.getName();
        isSeaPackage = true;
    } else
    if(locator.isRelative()) {
        path = sea.getPackage(name).getPath();
        id = name;
        isSeaPackage = true;
    } else
    if((locator.getName() && locator.getUrl()=="file://"+sea.getPackagePath(locator.getName()).join("")) ||
       (locator.getUrl()=="file://"+sea.getPath().join("").valueOf())) {
        
        path = sea.getPackage(name).getPath();
        id = name;
        isSeaPackage = true;
        
    } else {
        path = sea.getDependenciesPath().join(originalLocator.getId());
        id = "dependencies/" + originalLocator.getId();
    }
    
//print(" dependency: name["+name+"] id["+id+"] path["+path+"]");    
    
    
    // PUBLIC

    var Dependency = {};
    
    Dependency.getName = function() {
        return name;
    }
    Dependency.getPath = function() {
        return path;
    }
    Dependency.getType = function() {
        return type;
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
        return PACKAGE.Package(Dependency.getPath()).setSea(sea);
    }

    return Dependency;
    
    
    // PRIVATE

}
