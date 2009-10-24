
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };

var system = require('./system');
var util = require('./util');
var json = require('./json');
var fs = require('./file');
var URI = require('./uri');


exports.main = function main() {
    // finds, reads, and analyzes packages,
    // then applies its findings (synthesizes)
    // to the loader and system.
    // this involves a breadth first search for packages
    // and packages within packages (read),
    // and performing engine-specific analysis and
    // synthesis.

    if (system.prefixes === undefined)
        throw new Error(
            "system.prefixes is undefined in packages loader. " +
            "(engine=" + system.engine + ")"
        );

    exports.load(system.prefixes);

};


// HACK: Until I refactor the package dependency loading
var seaDependencyMap;


exports.load = function (prefixes, options) {

    // the packages engine module, if it exists,
    //  performs engine-specific actions on each package.
    var packagesEngine;
    try {
        packagesEngine = require('packages-engine');
    } catch (exception) {
    }

    // depth first search of the packages tree and roots
    var catalog = {};
    
    var pkgCatalog = {"packages": [], "localPackages": {"byId":{}, "byPath":{}}};
    if(util.has(require.loader, "pkgCatalog")) {
        pkgCatalog = require.loader.pkgCatalog;
    }
    seaDependencyMap = {};
    
    var root = exports.read(prefixes, catalog, pkgCatalog, options);

    // a topological sort of the packages based on their
    // stated dependencies and contained engine-specific
    // components
    var order = exports.sortedPackages(catalog);

    // analysis
    var analysis = {};
    exports.analyze(analysis, order);
    // engine-specific analysis
    if (packagesEngine)
        packagesEngine.analyze(analysis, order);

    // synthesis
    exports.synthesize(analysis);
    // engine-specific synthesis
    if (packagesEngine)
        packagesEngine.synthesize(analysis);


    // sort package catalog from longest to shortest path
    pkgCatalog["packages"].sort(function(a, b) {
        if(a[0]==b[0]) return 0;
        if(a[0].length>b[0].length) return -1;
        return 1;
    });
    // set package catalog info in the loader
    // OLD
    require.loader.pkgCatalog = pkgCatalog;
    // NEW
    require.loader.localPackages = pkgCatalog["localPackages"];

//dump(pkgCatalog);

    // preload modules
    analysis.preloadModules.forEach(function(id) {
        system.log.debug("Preloading module: "+id);
        try {
            require(id);
        } catch (e) {
            system.log.warn("Error preloading module: " + id + " " + e);
        }
    });

    // record results
    exports.catalog = catalog;
    exports.usingCatalog = pkgCatalog["localPackages"]["byId"];
    exports.order = order;
    exports.root = root;
    exports.analysis = analysis;
    exports.engines = analysis.engines;
    return exports;
};

/*** read
    recursively loads all package data from package.json files
    and packages/ directories.
*/
exports.read = function read(prefixes, catalog, pkgCatalog, options) {
    // construct an object graph from package json files
    // through a breadth first search of the root package and
    // its transitive packages/ directories.

    if (!catalog)
        throw new Error("must pass a package data object as the second argument to packages.read.");

    var visitedPackages = {};
    var root;

    prefixes = util.copy(prefixes);
    if (typeof prefixes == 'string')
        prefixes = [prefixes];

    // queue-based breadth-first-search of the package
    // tree starting with the "root"
    while (prefixes.length) {
        var queue = [fs.path(prefixes.shift())];
        while (queue.length) {

            var item = queue.shift(),
                packageDirectory,
                name,
                dependencyInfo = null;

            if(util.isArrayLike(item)) {
                packageDirectory = item[0];
                dependencyInfo = item[1];
                name = dependencyInfo.name;
            } else {
                packageDirectory = item;
                name = packageDirectory.basename();
            }
            
            // check for cyclic symbolic linkage
            var canonicalPackageDirectory = packageDirectory.canonical();
            if (Object.prototype.hasOwnProperty.call(visitedPackages, canonicalPackageDirectory)) 
                continue;
            visitedPackages[canonicalPackageDirectory] = true;

            // check for duplicate package names
            if (Object.prototype.hasOwnProperty.call(catalog, name)) {
                continue;
            }


                if (!packageDirectory.join('package.json').isFile()) {
                    //system.log.warn('No package.json in ' + packageDirectory);
                    continue;
                }

                var packageDatum;
                var pkgCatalogDatum;
                try {
                    var packageDatumJson = packageDirectory.join('package.json').read().toString();
                    packageDatum = json.parse(packageDatumJson || '{}');


                    // look for local, user overrides
                    var local = packageDirectory.join('local.json');
                    if (local.isFile()) {
                        local = json.parse(local.read().toString());
                        for (var name in local) {
                            if (Object.prototype.hasOwnProperty.call(local, name)) {
                                packageDatum[name] = local[name];
                            }
                        }
                    }

                    // overlay local package file
                    var localOverlay = packageDirectory.join('package.local.json');
                    if (localOverlay.isFile()) {
                        util.deepUpdate(packageDatum, json.parse(localOverlay.read().toString()));
                    }
    
                    name = packageDatum.name || name;


                    exports.readUsing(options, pkgCatalog, packageDirectory.join("using"));


                    // rewrite the package name again if it is a dependency                    
                    if(dependencyInfo) {
                        name = dependencyInfo.name;
                    }


                    // if this is the sea package we record it's name
                    var isSeaPackage = false;
                    
                    if(packageDirectory.valueOf()==system.env["SEA"]) {
                        pkgCatalog.seaPackage = name;
                        isSeaPackage = true;
                    }

                    catalog[name] = packageDatum;
                    packageDatum.directory = packageDirectory.join('');

                    // prepare package info for resolving package aliases
                    // if we already have info we replace it (for now)
                    // TODO: determine "lib" path based on packageDatum
                    var found = false;
                    pkgCatalogDatum = {"name": name, "libPath": packageDatum.directory.join("lib"), "packages": {}};
                    pkgCatalog["packages"].forEach(function(pkgInfo) {
                        if(found) {
                            return;
                        }
                        if(pkgInfo[0]==packageDatum.directory.valueOf() && pkgInfo[1].name==name) {
                            pkgCatalogDatum = pkgInfo[1];
                            found = true;
                        }
                    });
                    if(!found) {
                        pkgCatalog["packages"].push([packageDatum.directory.valueOf(), pkgCatalogDatum]);
                    }

                    if(util.has(packageDatum, "using")) {
                        util.every(packageDatum.using, function(pair) {
                            pkgCatalogDatum["packages"][pair[0]] = exports.normalizePackageDescriptor(pair[1]);
                        });
                    }
                    
                    if(util.has(options, "includeBuildDependencies") &&
                       options.includeBuildDependencies &&
                       util.has(packageDatum, "build") &&
                       util.has(packageDatum.build, "using")) {

                        util.every(packageDatum.build.using, function(pair) {
                            pkgCatalogDatum["packages"][pair[0]] = exports.normalizePackageDescriptor(pair[1]);
                        });
                    }

                    
                    
                    // NEW
                    pkgCatalog["localPackages"]["byPath"][packageDatum.directory.dirname().valueOf()] = name;
                    if(!util.has(pkgCatalog["localPackages"]["byId"], name)) {
                        pkgCatalog["localPackages"]["byId"][name] = {
//                            "name": packageDatum.name,
                            "directory": packageDatum.directory,
                            "libPath": packageDatum.directory.join("lib")
                        };
                    }
                    pkgCatalog["localPackages"]["byId"][name]["packages"] = pkgCatalogDatum["packages"];
                    // END NEW

//print("NAME: "+name);                    
                    
                    
                    // normalize authors
                    if (packageDatum.author)
                        packageDatum.author = new exports.Author(packageDatum.author);
                    if (!packageDatum.contributors)
                        packageDatum.contributors = [];
                    packageDatum.contributors = packageDatum.contributors.map(function (contributor) {
                        return new exports.Author(contributor);
                    });
    
                    // enqueue sub packages
                    var packagesDirectories = packageDatum.packages;
                    if (typeof packagesDirectories == "string")
                        packagesDirectories = [packagesDirectories];
                    if (packagesDirectories === undefined)
                        packagesDirectories = ["packages"];
                    packagesDirectories.forEach(function (packagesDirectory) {
                        packagesDirectory = packageDirectory.join(packagesDirectory);
                        if (packagesDirectory.isDirectory()) {
                            packagesDirectory.listPaths().forEach(function (packageDirectory) {
                                if (packageDirectory.isDirectory()) {
                                    queue.push(packageDirectory);
                                }
                            });
                        }
                    });
    
                    // the first package we encounter gets
                    // top-billing, the root package
                    if (!root)
                        root = packageDatum;
    
                } catch (exception) {
                    system.log.error("Could not load package '" + name + "'. " + exception);
//                    throw exception;
                }
        }
    }

    return root;
};

/*** verify
    scans a package object for missing dependencies and throws away
    any package that has unmet dependencies.
*/
exports.verify = function verify(catalog) {
    for (var name in catalog) {
        if (Object.prototype.hasOwnProperty.call(catalog, name)) {
            try {
                scan(catalog, name);
            } catch (exception) {
                if (typeof exception == "string") {
                } else {
                    throw exception;
                }
            }
        }
    }
};

var scan = function scan(catalog, name) {
    var packageDatum = catalog[name];
    if (!packageDatum)
        throw name;
    try {
        if (packageDatum.dependencies) {
            packageDatum.dependencies.forEach(function (dependency) {
                scan(catalog, dependency);
            });
        }
    } catch (exception) {
        /*
        // This is nasty - cannot be suppressed
        // Use "tusk package list" to see installed
        // (and working - i.e. all dependencies are met) packages
        
        if (typeof exception == "string")
            system.log.error(
                "Threw away package " + name +
                " because it depends on " + exception +
                "."
            );
        */
        delete catalog[name];
        throw name;
    }
};

/*** sortedPackages
    returns an array of packages in order from the most
    dependent to least dependent, sorted based on
    their transitive dependencies.
*/
exports.sortedPackages = function (graph) {
    var sorted = [];
    var arrived = {};
    var departed = {};
    var t = 0;

    // linearize the graph nodes
    var nodes = [];
    for (var name in graph) {
        if (Object.prototype.hasOwnProperty.call(graph, name)) {
            graph[name].name = name;
            nodes.push(graph[name]);
        }
    }

    while (nodes.length) {
        var node = nodes.shift();
        var name = node.name;
        if (Object.prototype.hasOwnProperty.call(arrived, name))
            continue;

        var stack = [node];
        while (stack.length) {
            var node = stack[stack.length - 1];
            var name = node.name;

            if (Object.prototype.hasOwnProperty.call(arrived, name)) {
                departed[name] = t++;
                sorted.push(stack.pop());
            } else {
                arrived[name] = t++;
                var dependencies = node.dependencies || [];
                var length = dependencies.length;
                for (var i = 0; i < length; i++) {
                    var dependency = dependencies[i];
                    
                    if (Object.prototype.hasOwnProperty.call(arrived, dependency)) {
                        if (!Object.prototype.hasOwnProperty.call(departed, dependency)) {
                            throw new Error("Dependency cycle detected among packages: " + stack.map(function (node) {
                                return node.name;
                            }).join(" -> ") + " -> " + dependency);
                        }
                        continue;
                    }
                    if (!Object.prototype.hasOwnProperty.call(graph, dependency)) {
/*
                        print(
                            "Throwing away package '" + name +
                            "' because it depends on the package '" + dependency +
                            "' which is not installed."
                        );
*/
                        delete graph[name];
                        continue;
                    }
                    stack.push(graph[dependency]);
                }
            }

        };
    }

    return sorted;
};

/*** analyze
    constructs prioritized top-level module paths
    based on the given sorted package array.    
*/
exports.analyze = function analyze(analysis, catalog) {
    analysis.libPaths = [];
    analysis.preloadModules = [];
    analysis.engines = {};
    catalog.forEach(function (info) {

        // libraries
        if (typeof info.lib == 'string')
            info.lib = [info.lib];
        if (!info.lib)
            info.lib = ['lib'];

        // resolve the lib paths
        for (var i = 0; i < info.lib.length; i++) {
            info.lib[i] = info.directory.resolve(info.lib[i]);
        }

        if (!info.engine) {

            // engines
            var engines = 'engines';
            var engineLibs = [];
            if (info.engines)
                engines = info.engines;
            system.engines.forEach(function (engine) {
                var engineDir = info.directory.join(engines, engine, 'lib');
                if (engineDir.isDirectory()) 
                    engineLibs.push(engineDir);
            });

            for (var i = 0; i < engineLibs.length; i++) {
                engineLibs[i] = info.directory.resolve(engineLibs[i]);
            }

            analysis.libPaths.unshift.apply(
                analysis.libPaths,
                engineLibs.concat(info.lib)
            );

        } else {
            // the package is an engine.  install its lib path
            //  if it is active.

            var name = info.engine || info.name;
            analysis.engines[name] = info;
            if (util.has(system.engines, name)) {
                analysis.libPaths.unshift.apply(
                    analysis.libPaths,
                    info.lib
                );
            }

        }
        
        // add any preload librarys to analysis
        if (info.preload)
            analysis.preloadModules.unshift.apply(analysis.preloadModules, info.preload);
    });
};

/*** synthesize
    applies the results of the analysis on the current
    execution environment.
*/
exports.synthesize = function synthesize(analysis) {
    exports.addJsPaths(analysis.libPaths);
};

/*** addJsPaths
*/
exports.addJsPaths = function addJsPaths(jsPaths) {
    // add package paths to the loader
    if (require.paths)
        require.paths.splice.apply(
            require.paths, 
            [0, require.paths.length].concat(jsPaths)
        );
};

exports.normalizePackageDescriptor = function(descriptor) {
    if(!descriptor) return descriptor;
    var uri,
        path = "";
    if(util.has(descriptor, "location") && descriptor.location) {
        uri = URI.parse(descriptor.location);
        if(util.has(descriptor, "path")) path = descriptor.path;
    } else
    if(util.has(descriptor, "catalog") && descriptor.catalog) {
        uri = URI.parse(descriptor.catalog);
        if(util.has(descriptor, "name")) path = descriptor.name;
    } else {
        dump(descriptor);
        throw "invalid package descriptor";
    }
    var id = fs.Path(uri.domain + uri.path).dirname();
    if(path) id = id.join(path);
    id = id.valueOf();
    if(id.charAt(0)=="/") id = id.substr(1);
    return id;
}

exports.readUsing = function(options, pkgCatalog, basePath, subPath) {
    subPath = subPath || fs.Path("./");

    var path = basePath.join(subPath);

    if(!path.isDirectory()) {
        return;
    }
        
    // when a package.json file is encountered we have arrived at a package.
    // based on the path we can determine the package name (top-level id)
    if(path.join("package.json").exists()) {

        var packageDatumJson = path.join("package.json").read().toString();
        var packageDatum = json.parse(packageDatumJson || '{}');
        
        var id = subPath.valueOf();
        pkgCatalog["localPackages"]["byPath"][path.valueOf()] = id;
        if(!util.has(pkgCatalog["localPackages"]["byId"], id)) {
            pkgCatalog["localPackages"]["byId"][id] = {
                "libPath": path.join("lib").valueOf(),
                "directory": path,
                "packages": {}
            };
        }

        if(util.has(packageDatum, "using")) {
            util.every(packageDatum.using, function(pair) {
                pkgCatalog["localPackages"]["byId"][id]["packages"][pair[0]] = exports.normalizePackageDescriptor(pair[1]);
            });
        }
        
        if(util.has(options, "includeBuildDependencies") &&
           options.includeBuildDependencies &&
           util.has(packageDatum, "build") &&
           util.has(packageDatum.build, "using")) {

            util.every(packageDatum.build.using, function(pair) {
                pkgCatalog["localPackages"]["byId"][id]["packages"][pair[0]] = exports.normalizePackageDescriptor(pair[1]);
            });
        }
        
        // once a package is encountered we do not traverse deeper
    } else {
        // we did not find a package - traverse the path deeper
        path.listPaths().forEach(function(dir) {
            exports.readUsing(options, pkgCatalog, basePath, subPath.join(dir.basename()));
        });
    }
}

exports.Author = function (author) {
    if (!(this instanceof exports.Author))
        return new exports.Author(author);
    if (typeof author == "string") {
        var match = author.match(exports.Author.regexp);
        this.name = match[1].trim();
        this.url = match[2];
        this.email = match[3];
    } else {
        this.name = author.name;
        this.url = author.url;
        this.email = author.email;
    }
};

exports.Author.prototype.toString = function () {
    return [
        this.name,
        this.url ? "(" + this.url + ")" : undefined,
        this.email ? "<" + this.email + ">" : undefined
    ].filter(function (part) {
        return !!part;
    }).join(' ');
};

exports.Author.regexp = new RegExp(
    "(?:" +
        "([^\\(<]*)" +
        " ?" + 
    ")?" +
    "(?:" +
        "\\(" +
            "([^\\)]*)" +
        "\\)" +
    ")?" +
    " ?" +
    "(?:<([^>]*)>)?"
);

