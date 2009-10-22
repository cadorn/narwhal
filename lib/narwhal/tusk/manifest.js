
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var system = require("system");
var fs = require("file");
var json = require("json");
var util = require("util");
var tusk = require("./tusk");



var Manifest = exports.Manifest = function (path) {
    if (!(this instanceof exports.Manifest))
        return new exports.Manifest(path);
    this.path = path;
    this.manifest = (path.exists())?json.decode(path.read({charset:"utf-8"})):{};
}

Manifest.prototype.exists = function() {
    return this.path.exists();
}

Manifest.prototype.save = function() {
    this.path.dirname().mkdirs();
    this.path.write(
        json.encode(this.manifest, null, 4),
        {charset: 'utf-8'}
    );
}


Manifest.prototype.getName = function() {
    return this.manifest.name;
}
Manifest.prototype.getPath = function() {
    return this.path;
}

// needed
Manifest.prototype.addDependency = function(alias, locator) {
    
    if(this.isDependency(alias)) {
        throw "dependency already exists";
    }
    
    if(!util.has(this.manifest, "using")) {
        this.manifest.using = {};
    }
    
    this.manifest.using[alias] = locator.getInfo();
    this.save();
}

// needed
Manifest.prototype.removeDependency = function(name) {
    
    if(!this.isDependency(name)) {
        throw "dependency not found";
    }
    
    delete this.manifest.using[name];
    
    this.save();
}

// needed
Manifest.prototype.isDependency = function(name) {

    if(!util.has(this.manifest, "using")) {
        return false;
    }

    if(!util.has(this.manifest.using, name)) {
        return false;
    }
    
    return true;    
}

Manifest.prototype.getDependencyNames = function() {
    if(!util.has(this.manifest, "using")) {
        return [];
    }
    return util.keys(this.manifest.using);
}

Manifest.prototype.getDependencies = function() {
    if(!util.has(this.manifest, "using")) {
        return [];
    }
    return this.manifest.using;
}


Manifest.prototype.getBuildDependencies = function() {
    if(!util.has(this.manifest, "build") ||
       !util.has(this.manifest.build, "using")) {
        return [];
    }
    return this.manifest.build.using;
}

Manifest.prototype.getBuildTargetNames = function() {
    if(!util.has(this.manifest, "build") ||
       !util.has(this.manifest.build, "targets")) {
        return [];
    }
    return util.keys(this.manifest.build.targets);
}

Manifest.prototype.getBuildTarget = function(name) {
    if(!util.has(this.manifest, "build") ||
       !util.has(this.manifest.build, "targets") ||
       !util.has(this.manifest.build.targets, name)) {
        return null;
    }
    return this.manifest.build.targets[name];
}

Manifest.prototype.getDefaultBuildTargetName = function() {
    if(!util.has(this.manifest, "build") ||
       !util.has(this.manifest.build, "targets") ||
       !util.has(this.manifest.build, "defaultTarget")) {
        
        return null;
    }
    return this.manifest.build.defaultTarget;
}

Manifest.prototype.getPackagesPath = function() {
    // TODO: check manifest for alternative package path
    return this.path.dirname().join("packages");
}
Manifest.prototype.getBinPath = function() {
    // TODO: check manifest for alternative bin path
    return this.path.dirname().join("bin");
}
Manifest.prototype.getLibPath = function() {
    // TODO: check manifest for alternative lib path
    return this.path.dirname().join("lib");
}
Manifest.prototype.getBuildPath = function() {
    // TODO: check manifest for alternative build path
    return this.path.dirname().join("build");
}

