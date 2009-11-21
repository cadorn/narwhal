
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


//print(parentPkg.getPath());
//dump(info);
    // PRIVATE
    
    var name,       // name or alias of a package
        id,         // top-level id of a package
        pathLookup,
        path,       // install path for the package
        locator,    // origin/source info
        localPackage = false;   // whether the dependency is a top-level sea package


    var originalLocator = locator = LOCATOR.Locator(info);
    
    // now that we have the specified package descriptor lets resolve it
    if(locator.getType()=="catalog") {
        var catalog = TUSK.getActive().getPlanet().getCatalog(locator, true, parentPkg.getPath().canonical());
        if(!catalog.hasPackage(locator.getName())) {
            throw new TUSK.TuskError("Package '" + locator.getName() + "' not found in catalog '" + locator.getUrl() + "' while resolving dependency '"+name+"' for: " + parentPkg.getPath());
        }

        locator = catalog.getLocator(locator.getName(), locator);

        locator = TUSK.getActive().getPlanet().resolveLocator(locator);
        
        // check if we have a relative package from the sea.
        // this is the same as what 'tusk sea localize' does.
        if(catalog.getPath().valueOf()==sea.getCatalog().getPath().valueOf() && locator.isRelative() && locator.getPath()) {
            originalLocator = locator = LOCATOR.Locator({
                "location": sea.getPath().join(locator.getPath()).valueOf()
            });
        }
    } else
    if(locator.getType()=="location") {
        locator = TUSK.getActive().getPlanet().resolveLocator(locator);

        // check if we have a relative package from the sea.
        if(locator.getName() && locator.getUrl()=="file://"+sea.getPackagePath(locator.getName()).join("/")) {
            // TODO: set a flag to indicate overlay vs setting the orignalLocator which may be the same
            locator.setOriginal(LOCATOR.Locator(originalLocator.getInfo()));
        }
    }


//dump(info);
//print("isRelative: "+originalLocator.isRelative());
//print(locator.getUrl());

    // check for local packages
    if(originalLocator.isRelative() && locator.getUrl()=="file://"+sea.getPath().join("").valueOf()) {
        locator.setOriginal(originalLocator);
        id = locator.getId();
        path = sea.getDependenciesPath().join(id);
        localPackage = true;
    } else {
        // check for 'using' packages that are referring to local packages
        id = originalLocator.getId();
        path = sea.getDependenciesPath().join(id);
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
    Dependency.isLocalPackage = function() {
        return localPackage;
    }
    Dependency.getParentPackage = function() {
        return parentPkg;
    }
    Dependency.getPackage = function() {    
        return PACKAGE.Package(Dependency.getPath(), Dependency.getLocator()).setSea(sea);
    }

    return Dependency;
    
    
    // PRIVATE

}
