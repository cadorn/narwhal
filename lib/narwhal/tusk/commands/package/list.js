
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
        id,
        name,
        info,
        message,
        data,
        line,
        seaBasePath = sea.getPath();

    sea.forEachInstalledPackage(function(pkg) {
        packages[(id = pkg.getId())] = {
            "id": id,
            "name": pkg.getName(),
            "type": "system",
            "path": pkg.getPath().valueOf(),
            "relativePath": formatRelativePath(seaBasePath, pkg.getPath()),
            "installed": true,
            "dependency": false
        }
    });

    pkg = sea.getSeaPackage();
    packages[(id = pkg.getId())] = {
        "id": id,
        "name": pkg.getName(),
        "type": "local",
        "path": pkg.getPath().valueOf(),
        "relativePath": "./",
        "locator": sea.getCatalog().getLocator(pkg.getName()).toString(),
        "installed": true,
        "dependency": false
    }

    sea.forEachDependency(function(dependency) {
        pkg = dependency.getPackage();
        id = pkg.getId();

        info = {
            "id": id,
            "name": pkg.getName(),
            "type": (dependency.isLocalPackage())?"local":"dependency",
            "path": pkg.getPath().valueOf(),
            "relativePath": formatRelativePath(seaBasePath, pkg.getPath()),
            "locator": dependency.getLocator().toString(),
            "dependency": true,
            "dependencyType": dependency.getType(),
            "installed": pkg.exists()
        }
        if(UTIL.has(packages, id)) {
            UTIL.update(packages[id], info);
        } else {
            // try and match path to get proper package name
            var found = false;
            UTIL.every(packages, function(pkgInfo) {
                if(found) {
                    return;
                }
                if(pkgInfo[1].path==info.path) {
                    found = true;
                    packages[id] = pkgInfo[1];
                    UTIL.update(packages[id], info);
                    delete packages[pkgInfo[0]];
                }
            });
            
            packages[id] = info;
        }
    }, ["build", "package"], true);

    var tips = {
        "installDependencies": false
    };
    UTIL.keys(packages).forEach(function(name) {
        info = packages[name];

        line = "";
        message = theme.newMessage(info);

        if(info.installed) {
            if(info.locator) {
                if(info.type=="local") {
                    line += "\0green({id}\0) - {relativePath} \0yellow(<- {name}\0)";
                } else {
                    line += "\0green({id}\0) - {relativePath} \0magenta(<- {locator}\0)";
                }
            } else {
                line += "\0green({id}\0) - {relativePath}";
            }
        } else
        if(info.dependency) {
            
            line += "\0bold({dependencyType}\0): ";
            line += "\0bold({id}\0) - {relativePath} \0magenta(<- {locator}\0)";

            tips.installDependencies = true
        }

        message.setTermString(line).finalize();
    });

    if(tips.installDependencies) {
        theme.newMessage({
            "tip": "Use 'tusk sea reheat' to install missing dependencies for sea"
        }, "TIP: {tip}", "info").finalize();
    }

    return;    
});


function formatRelativePath(basePath, path) {
    var basePath = basePath.valueOf();
    var path = path.valueOf();
    if(path.substr(0,basePath.length)==basePath) {
        return "." + path.substr(basePath.length);
    }
    return path;
}
