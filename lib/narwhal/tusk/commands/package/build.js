
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var UTIL = require('util');
var OS = require('os');
var ARGS = require('args');
var PACKAGES = require("packages");

var parser = exports.parser = new ARGS.Parser();

parser.arg("target");

parser.option('-l', '--list', 'list')
    .bool()
    .help('List all build targets.');

parser.help('Build a given package.');

parser.helpful();


parser.action(function (options, parentOptions, context) {
    
    var tusk = context.tusk,
        sea = tusk.getSea(),
        theme = tusk.getTheme(),
        message;
    
    var name = parentOptions["package"] || sea.getSeaPackage().getName();
    
    if(!name) {
        theme.newMessage({
            "message": "No package to build specified"
        }, "{message}", "error").finalize();
        return;
    }
    if(!sea.hasPackage(name)) {
        theme.newMessage({
            "package": name,
            "message": "Could not find installed package with name: {package}"
        }, "{message}", "error").finalize();
        return;
    }
    
    
    var pkg = sea.getPackage(name),
        manifest = pkg.getManifest(),
        targets = manifest.getBuildTargetNames();

    if(!targets) {
        theme.newMessage({
            "manifestPath": manifest.getPath().valueOf(),
            "message": "No build targets defined in package manifest: {manifestPath}"
        }, "{message}", "error").finalize();
        return;
    }
    
    if(options.list) {
        
        message = theme.newMessage({
            "note": "Supported build targets:"
        }, "{note}", "note").finalize();
        
        message.startGroup();
        
        targets.forEach(function(name) {
            theme.newMessage({
                "name": name
            }, "{name}").finalize();
        });
        
        message.endGroup();
        return;
    }


    var target = options.args[0];
    if(!target) {
        target = manifest.getDefaultBuildTargetName();
        if(!target) {
            theme.newMessage({
                "manifestPath": manifest.getPath().valueOf(),
                "message": "No default build target specified in package manifest: {manifestPath}"
            }, "{message}", "error").finalize();
            return;
        }
    }
    
    if(!UTIL.has(targets, target)) {
        theme.newMessage({
            "target": target,
            "manifestPath": manifest.getPath().valueOf(),
            "message": "Build target '{target}' not defined in package manifest: {manifestPath}"
        }, "{message}", "error").finalize();
        return;
    }
    
    

    // install all build dependencies for the package to be built
    pkg.installDependencies(["package","build"]);
    
    // load build dependencies
    require('packages').load([
        system.prefix,
        sea.getPath()
    ], {
        includeBuildDependencies: true
    });    

    var targetModule = manifest.getBuildTarget(target);
    
    // targetModule is simply a module path or includes an optional
    // package prefix "<package>:module/path"
    targetModule = targetModule.split(":");
    
    var buildModulePackage    
    
    if(targetModule.length==1) {
        // we have a module path to be resolved relative to the package to be built
        
        buildModulePackage = pkg;
        
    } else
    if(targetModule.length==2) {
        // we have a module path to be resolved relative to a dependency (build or normal)
        // declared for the package to be built
        buildModulePackage = pkg.getPackage(targetModule[0]);
        if(!buildModulePackage && PACKAGES.usingCatalog[name]["packages"][targetModule[0]]) {
            buildModulePackage = sea.getPackage(PACKAGES.usingCatalog[name]["packages"][targetModule[0]]);
        }
        if(!buildModulePackage) {
            theme.newMessage({
                "alias": targetModule[0],
                "message": "Cannot find using package by alias '{alias}'"
            }, "{message}", "error").finalize();
            return;
        }
        targetModule = targetModule[1];
        
        // install all build dependencies for the dependent package
        buildModulePackage.installDependencies(["package","build"]);
        
    } else {
        throw "invalid target module format: " + targetModule.join(":");
    }
    
    
    // load build dependencies
    require('packages').load([
        system.prefix,
        sea.getPath()
    ], {
        includeBuildDependencies: true
    });
    
    
    var modulePath = buildModulePackage.getModulePath(targetModule);
    
    if(!modulePath.exists()) {
        theme.newMessage({
            "target": target,
            "modulePath": modulePath.valueOf(),
            "message": "Build module for target '{target}' not found at: {modulePath}"
        }, "{message}", "error").finalize();
        return;
    }

    message = theme.newMessage({
        "target": target,
        "package": name,
        "modulePath": modulePath.valueOf(),
        "message": "Building"
    }, "{message} '{target}' target for package '{package}' via module: {modulePath}").finalize();
    
    message.startGroup();

    require(targetModule, buildModulePackage.getId()).main({
        "package": name,
        "args": options.args
    });
    
    message.endGroup();
    
});
