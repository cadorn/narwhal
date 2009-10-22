
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };

/**
 * @test tests/tusk/commands/package/list.js
 */

var UTIL = require("util");
var ARGS = require('args');

var parser = exports.parser = new ARGS.Parser();

parser.help('List all installed packages');

parser.helpful();

parser.action(function (options, parentOptions, context) {
    var self = this;

    var tusk = context.tusk,
        sea = tusk.getSea(),
        theme = tusk.getTheme();
    
    var packages = {},
        pkg,
        name,
        info,
        message,
        data,
        line;

    sea.forEachInstalledPackage(function(pkg) {
        name = pkg.getName();
        packages[name] = {
            "name": name,
            "path": pkg.getPath().valueOf(),
            "installed": true,
            "dependency": false
        }
    });

    pkg = sea.getSeaPackage();
    packages[pkg.getName()] = {
        "name": pkg.getName(),
        "path": pkg.getPath().valueOf(),
        "locator": sea.getCatalog().getLocator(pkg.getName()),
        "installed": true,
        "dependency": false
    }

    sea.forEachDependency(function(dependency) {
        pkg = dependency.getPackage();
        name = dependency.getName();
        info = {
            "name": name,
            "path": pkg.getPath().join("").valueOf(),
            "locator": dependency.getLocator(),
            "dependency": true,
            "installed": pkg.exists()
        }
        if(UTIL.has(packages, name)) {
            UTIL.update(packages[name], info);
        } else {
            // try and match path to get proper package name
            var found = false;
            UTIL.every(packages, function(pkgInfo) {
                if(found) {
                    return;
                }
                if(pkgInfo[1].path==info.path) {
                    found = true;
                    packages[name] = pkgInfo[1];
                    UTIL.update(packages[name], info);
                    delete packages[pkgInfo[0]];
                }
            });
            
            packages[name] = info;
        }
    }, "package", true);

    var tips = {
        "installDependencies": false
    };
    UTIL.keys(packages).forEach(function(name) {
        info = packages[name];
        var locator = info.locator;
        if(info.locator) {
            info.locator = info.locator.toString();
        }        
        line = "";
        message = theme.newMessage(info);
        
        if(info.installed) {
            if(info.locator) {
                if(locator.isRelative()) {
                    line += "\0green({name}\0) - {path} \0yellow(<- {locator}\0)";
                } else {
                    line += "\0green({name}\0) - {path} \0magenta(<- {locator}\0)";
                }
            } else {
                line += "\0green({name}\0) - {path}";
            }
        } else
        if(info.dependency) {
            if(info.locator) {
                line += "\0bold({name}\0) - {path} \0magenta(<- {locator}\0)";
                tips.installDependencies = true
            } else {
                line += "\0bold({name}\0) - TODO: give reason why not installed (e.g. threw away package ...)";
            }
        }

        message.setTermString(line).finalize();
    });

    if(tips.installDependencies) {
        theme.newMessage({
            "tip": "Use 'tusk package install -f' to install missing dependencies for sea"
        }, "TIP: {tip}", "info").finalize();
    }

    return;    
});

