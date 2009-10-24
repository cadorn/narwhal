
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };



var system = require("system");
var fs = require("file");
var json = require("json");
var http = require("http");
var zip = require("zip");
var util = require("util");
var UTIL = require("util");
var md5 = require("md5");
var struct = require("struct");
var URI = require("uri");
var CATALOG = require("./catalog");
var SEA = require("./sea");
var tusk = require("./tusk");
var tuskUtil = require("./util");
var manifest = require("./manifest");
var STREAM = require('term').stream;


var FILE = require("file");
var PACKAGES = require("packages");
var TUSK = require("./tusk");
var DEPENDENCY = require("./dependency");


var Package = exports.Package = function (path, locator) {
    if (!(this instanceof exports.Package))
        return new exports.Package(path, locator);

    if(path instanceof fs.Path) {
        this.path = path;
    } else
    // we want to initialize a package by ID
    if(PACKAGES.catalog[path]) {
        this.id = path;
        this.path = PACKAGES.catalog[path].directory;
    } else {
        this.path = fs.Path(path);
    }
    
    this.locator = locator;
    this.ignoreLocalManifest = false;
}

Package.prototype.getPath = function() {
    return this.path;
}

Package.prototype.exists = function() {
    var path = this.getPath();
    return (path.exists() && path.glob('*').length>0);
}

Package.prototype.validate = function() {

    if(!this.exists()) {
        return false;
    }

    var path = this.getPath();

    if(!path.join("package.json").exists()) {
        return false;
    }
    
    return true;
}

Package.prototype.toString = function() {
    var uid = this.getUid();
    if(uid) {
        return "Package(" + uid + ")";
    } else {
        return "Package(" + this.getPath() + ")";
    }
}

Package.prototype.getLocator = function() {
    return this.locator;
}

// needed
Package.prototype.setSea = function(sea) {
    this.sea = sea;

    // determine package ID based on sea path
    if(!this.id) {
        var basePath = sea.getPackagesPath().valueOf();
        
        this.id = this.getPath().valueOf().substr(basePath.length+1);

        if(!this.id) {
            // if the ID is empty it means we have the sea package
            this.id = this.getName();
        } else {
            if(this.id.substr(this.id.length-1,1)=="/") {
                this.id = this.id.substr(0,this.id.length-1);
            }
        }
    }
    return this;
}

// needed
Package.prototype.getSea = function() {
    return this.sea
}

// needed
Package.prototype.getId = function() {

    if(!this.id) {
        throw new TUSK.TuskError("ID should be set for package");
    }

    return this.id;
}


// needed
Package.prototype.save = function() {
    
    if(this.locked) {
        throw "package is locked and cannot be modified";
    }
    
    this.getManifest().save();
}

// needed
Package.prototype.create = function(name) {
    
    if(this.exists()) {
        throw "directory not empty";
    }
    
    var manifest = this.getManifest();
    
    manifest.manifest = {
        name: name
    }
    
    this.validate();
    this.save();
}

Package.prototype.setIgnoreLocalManifest = function(ignore) {
    this.ignoreLocalManifest = ignore;
}

Package.prototype.reload = function() {
    delete this.manifest;
    delete this.localManifest;
}

Package.prototype.getManifest = function(includeLocal) {

    includeLocal = !(includeLocal==false);      // default to: true

    if(!this.manifest) {
        this.manifest = manifest.Manifest(this.getPath().join("package.json"));
    }

    if(!this.localManifest) {
        this.getLocalManifest();
    }

    // overlay local package metadata if the package is not linked into the sea
    if(!this.ignoreLocalManifest && includeLocal && this.localManifest.exists() &&
       this.getPath().canonical().valueOf()==this.getPath().absolute().valueOf()) {

        var mergedManifest = manifest.Manifest(this.getPath().join("package.json"));
        mergedManifest.save = function(){ throw new TUSK.TuskError("cannot save combined manifest"); };
        mergedManifest.manifest = util.copy(this.manifest.manifest);

//dump(mergedManifest.manifest);
//print(this.localManifest.getPath());
//dump(this.localManifest.manifest);
        util.deepUpdate(mergedManifest.manifest, this.localManifest.manifest);
//dump(mergedManifest.manifest);

        return mergedManifest;
        
    } else {
        return this.manifest;
    }
}

Package.prototype.getLocalManifest = function() {
    if(!this.localManifest) {
        this.localManifest = manifest.Manifest(this.getPath().join("package.local.json"));
    }
    return this.localManifest;
}

Package.prototype.getOriginCatalog = function() {
    if(!this.originCatalog) {
        return null;
    }
    return this.originCatalog;
}

Package.prototype.getName = function() {
    return this.getManifest().manifest.name;    
}

Package.prototype.getUid = function() {
    return this.getManifest().manifest.uid;    
}

Package.prototype.getPackagesPath = function() {
    return this.getManifest().getPackagesPath();
}
Package.prototype.getBinPath = function() {
    return this.getManifest().getBinPath();
}
Package.prototype.getLibPath = function() {
    return this.getManifest().getLibPath();
}


Package.prototype.getModulePath = function(path) {
    return this.getLibPath().join(path + ".js");
}



// DEPRECATED
/*
Package.prototype.getDependencies = function(catalog) {
    var dependencies = [],
        names = this.getManifest().getDependencyNames(),
        pkg;

    names.forEach(function(name) {
        pkg = catalog.getPackage(name);
        if(!pkg) {
            throw "could not find package '"+name+"' in catalog '"+catalog.getPath()+"'";
        }
        dependencies.push(pkg);
    });
    return dependencies;
}
*/

// needed
Package.prototype.getPackage = function(name) {
    var pkg;
    var self = this;
    // TODO: Should this also find packages in packages/ that are not dependencies?
    this.forEachDependency(function(dependency) {
        if(pkg) {
            return;
        }
        if(dependency.getName()==name) {
            pkg = dependency.getPackage();
        }
    });
    return pkg;
}

// needed
Package.prototype.hasPackage = function(name) {
    var found = false;
    // TODO: Should this also find packages in packages/ that are not dependencies?
    this.forEachDependency(function(dependency) {
        if(found) {
            return;
        }
        if(dependency.getName()==name) {
            found = true;
        }
    });
    return found;
}

Package.prototype.reinstall = function(locator) {
    
/*

    if(path.exists()) {
        if(!options.force) {
            throw "package already installed";
        } else {
            // NOTE: path.isLink() does not work with rhino on Mac OS X
            try {
                // try and remove it as a link first
                // if it is a directory this will fail
                // we cannot call path.rmtree() without testing this first as
                // it will delete the tree the link points to
                path.remove();
            } catch(e) {
                if(path.isDirectory()) {
                    path.rmtree();
                }
            }
            print('Deleted link/directory at: ' + path);
        }
    }

 */    
    // TODO: Do we want to remove all un-used dependencies as well?
     
//    this.install(locator);  
}

Package.prototype.install = function(locator, options) {
    
    if(!this.sea) {
        throw new TUSK.TuskError("package not a valid install target - it does not belong to a sea");
    }
    
    options = options || {};
    
    var self = this;

    var path = this.getPath();
    path.dirname().mkdirs();

    var message = TUSK.getActive().getTheme().newMessage({
        "path": path,
        "locator": locator.toString(),
        "note": "Installing package '{locator}' to: {path}"
    }, "{note}", "note").finalize();
    
    message.startGroup();
    
    var pkg = TUSK.getActive().getPlanet().getPackage(locator);

    var installMethod = "copy";
    
    // if we have an original locator we have an overlay and link the package instead
    
    if(pkg.getLocator().getOriginal()) {
        installMethod = "link";
    }
    
    switch(installMethod) {
        case "link":
            if(path.exists() && options.force) {
                TUSK.getActive().getTheme().newMessage({
                    "path": path,
                    "note": "Removing existing package"
                }, "{note} at path: {path}", "note").finalize();
                
                if(path.isLink()) {
                    path.remove();
                } else {
                    throw new TUSK.TuskError("Need to verify rmtree to ensure it is not a link");
//                    path.rmtree();
                }            
            }
            pkg.getPath().symlink(path);
            TUSK.getActive().getTheme().newMessage({
                "sourcePath": pkg.getPath().valueOf(),
                "targetPath": path.valueOf(),
                "note": "Linked package at '{sourcePath}' to: {targetPath}"
            }, "{note}", "note").finalize();
            break;
        case "copy":
        default:
            if(path.exists() && options.force) {
                TUSK.getActive().getTheme().newMessage({
                    "path": path,
                    "note": "Removing existing package"
                }, "{note} at path: {path}", "note").finalize();
                path.rmtree();
            }
            FILE.copyTree(pkg.getPath(), path);
            TUSK.getActive().getTheme().newMessage({
                "sourcePath": pkg.getPath().valueOf(),
                "targetPath": path.valueOf(),
                "note": "Copied package at '{sourcePath}' to: {targetPath}"
            }, "{note}", "note").finalize();
            break;
    }


    // TODO: bin files should only be linked if this package is being installed
    //       as a top-level package into the sea (not if installed as a dependency)
    
    if(UTIL.has(options, "installBinaries") && options.installBinaries) {
    
        // make bins executable and make symlinks
        //  in $SEA/bin
        var bin = this.getBinPath();
        if (bin.isDirectory()) {
            bin.list().forEach(function (name) {
                if(name.substr(0,1)!=".") {
                    var target = bin.join(name);
                    target.chmod(0755);
                    var seaBinPath = self.sea.getBinPath();
                    var source = seaBinPath.join(name);
                    var relative = seaBinPath.to(target);
                    if(!source.exists()) {
                        // TODO: Does not work: target.symlink(source.relative(target));
                        target.symlink(source);
                        
                        TUSK.getActive().getTheme().newMessage({
                            "sourcePath": source.valueOf(),
                            "targetPath": target.valueOf(),
                            "message": "Symlinked binary"
                        }, "{message} '{sourcePath}' to: {targetPath}").finalize();
                    }
                }                
            });
        }
    }
     
    this.installDependencies();

    message.endGroup();
}


Package.prototype.installDependencies = function(type) {

    type = type || "package";

    if(!this.sea) {
        throw new TUSK.TuskError("package not associated with a sea");
    }
    
    var helper = TUSK.getActive().getHelper("installDependencies-verifiedPaths", []);
    
    if(helper.indexOf(this.getPath().valueOf())>=0) {
        TUSK.getActive().getTheme().newMessage({
            "package": this.getName(),
            "note": "Skipping redundant "+type+" dependencies check for package: {package}"
        }, "{note}", "note").finalize();
        return;
    }
    
    helper.push(this.getPath().valueOf());

    var message = TUSK.getActive().getTheme().newMessage({
        "package": this.getName(),
        "note": "Checking "+type+" dependencies for package: {package}"
    }, "{note}", "note").finalize();
    
    
    message.startGroup();
    var pkg;
    this.forEachDependency(function(dependency) {
        pkg = dependency.getPackage();
        
        if(!pkg.exists()) {

            var message1 = TUSK.getActive().getTheme().newMessage({
                "id": dependency.getId(),
                "name": dependency.getName(),
                "note": "Dependency '{id}' with alias '{name}' not met"
            }, "\0cyan({note}\0)", "note").finalize();
            
            message1.startGroup();

            pkg.install(dependency.getLocator());
            
            if(type=="build") {
                pkg.installDependencies("build");
            }
            
            message1.endGroup();
            
        } else {
            pkg.installDependencies(type);
        }
    }, type);
    message.endGroup();    
}

// needed
Package.prototype.forEachDependency = function(callback, types, deep, visited) {

    types = types || "package";
    if(!util.isArrayLike(types)) types = [types];
    deep = deep || false;
    visited = visited || [];

    var self = this;
    if(!self.sea) {
        throw new TUSK.TuskError("package not associated with a sea");
    }
    var dependencies;
    
    types.forEach(function(type) {
        dependencies = false;
        if(type=="package") {
            dependencies = self.getManifest().getDependencies();
        } else
        if(type=="build") {
            dependencies = self.getManifest().getBuildDependencies();
        }
        if(dependencies) {
            util.every(dependencies, function(pair) {

                var dep = DEPENDENCY.Dependency(self.sea, self, pair[0], pair[1], type);
                var pkg = dep.getPackage();
         
                if(visited.indexOf(type+":"+pkg.getId())>=0) {
                    return;
                }
                visited.push(type+":"+pkg.getId());

                callback(dep);

                if(deep) {
                    visited = pkg.forEachDependency(callback, types, deep, visited);
                }
            });
        }
    });
        
    return visited;
}


// needed
Package.prototype.getDependency = function(name) {
    var self = this;
    if(!self.sea) {
        throw new TUSK.TuskError("package not associated with a sea");
    }

    var dependencies =  self.getManifest().getDependencies();

    if(!dependencies || !util.has(dependencies, name)) {
        return false;
    }
    
    return DEPENDENCY.Dependency(self.sea, self, name, dependencies[name], "package");
}




Package.prototype.uninstall = function(sea, options) {
    
    var path = this.getPath();
    
    // delete all linked executables
    var bin = this.getBinPath();
    if (bin.isDirectory()) {
        bin.list().forEach(function (name) {
            if(name.substr(0,1)!=".") {
                var seaBinPath = sea.getBinPath();
                var source = seaBinPath.join(name);
                if(source.exists()) {
                    
                    // TODO: only remove the symlink if it in fact points to our bin dir
                    
                    source.remove();
                }
            }                
        });
    }

    // delete package link or source
    if(fs.match(path, sea.getPackagesPath().join('**')) &&
       this.validate()) {
        
        // NOTE: path.isLink() does not work with rhino on Mac OS X
        try {
            // try and remove it as a link first
            // if it is a directory this will fail
            // we cannot call path.rmtree() without testing this first as
            // it will delete the tree the link points to
            path.remove();
        } catch(e) {
            if(path.isDirectory()) {
                path.rmtree();
            }
        }
        print("Deleted directory at: " + path);
               
    } else {
        throw "cannot uninstall package as it is not valid";
    }
    
    STREAM.print("\0red(TODO: remove dependencies if not used by any other package\0)");
}
