
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };

var UTIL = require("util");
var URI = require("uri");
var LOCATOR = require("../../locator");
var PACKAGE = require("../../package");
var TUSK_UTIL = require("../../util");
var ARGS = require("args");


var parser = exports.parser = new ARGS.Parser();

parser.help('Downloads and installs a package and its dependencies into the sea');

parser.args('package');

parser.option('-f', '--force', 'force')
    .bool()
    .help('Replace package if it already exists');

parser.option('--alias')
    .set()
    .help('Optional alias for the package dependency.');

parser.option('--add', 'add')
    .bool()
    .help('Add the package to the sea catalog if not already added.');

parser.helpful();

exports.install = function (options, parentOptions, context) {

    var tusk = context.tusk,
        sea = tusk.getSea(),
        planet = tusk.getPlanet(),
        theme = tusk.getTheme();


    var uri;
    if(options.args.length && !/^-/.test(options.args[0])) {
        uri = options.args.shift();
    } else {
        theme.newMessage({
            "message": "No URI or package name provided"
        }, "{message}", "error").finalize();
        theme.newMessage({
            "tip": "Use 'tusk sea reheat' to install dependencies for sea"
        }, "TIP: {tip}", "info").finalize();
        return;
    }
    
    
    // install a package into the sea keeping track of it in package.local.json
    // if a package is to be added to a sea permanently use "tusk package add ..."
    
    // check if we have a URL or a package name
    var uri = URI.parse(uri),
        locator,
        info,
        packageName;
    if(!uri.protocol) {
        // we have a package name
        // lookup the package in the appropriate catalog
        // TODO: add support for other catalogs than just sea catalog
        
        packageName = uri.path;
        locator = sea.getCatalog().getLocator(packageName);
        info = locator.getInfo();
        
    } else {
        // we have a URL
        
        uri = URI.parse(TUSK_UTIL.normalizeURI(uri.url, {allow: ["file", "http"]}));
    
        // build a locator
        if(uri.file=="catalog.json") {
            if(!options.args[0]) {
                theme.newMessage({
                    "message": "No package specified for catalog"
                }, "{message}", "error").finalize();
                return;
            }
            info = {
                "catalog": uri.url,
                "name": options.args[0]
            };
        } else {
            info = {
                "locate": uri.url
            };
        }
        
        locator = LOCATOR.Locator(info);
    }


    // get a reference to the package
    // download it if necessary
    var pkg = planet.getPackage(locator);
    
    if(!pkg.validate()) {
        theme.newMessage({
            "path": pkg.getPath(),
            "message": "Package not valid"
        }, "{message}: {path}", "error").finalize();
        return;
    }
    
    if(!packageName) {
        packageName = pkg.getName();
    }
    
    // update locator with package name if applicable
    if(!UTIL.has(info, "name")) {
        info["name"] = packageName;
        locator = LOCATOR.Locator(info);
    }

    var message,
        alias = options.alias || packageName;
    
    var targetPkg,
        targetPkgManifest;
    
    targetPkg = sea.getSeaPackage();
    targetPkgManifest = targetPkg.getLocalManifest();

    message = theme.newMessage({
        "locator": locator.toString(),
        "seaPath": sea.getPath(),
        "name": alias,
        "message": "Installing package"
    }, "Installing package '\0magenta({locator}\0)' with alias '{name}' into sea: {seaPath}").finalize();

    message.startGroup();

    // check if dependency already exists
    if(targetPkgManifest.isDependency(alias)) {
        if(options.force) {
            targetPkgManifest.removeDependency(alias);
            theme.newMessage({
                "name": alias,
                "note": "Removed existing dependency"
            }, "{note}: {name}", "note").finalize();
        } else {
            theme.newMessage({
                "name": alias,
                "message": "Package already exists as dependency"
            }, "{message}: {name}", "error").finalize();
            return;
        }
    }

    targetPkgManifest.addDependency(alias, locator);
    
    // now install the package
    var dependency = targetPkg.getDependency(alias);
    
    dependency.getPackage().install(dependency.getLocator(), {
        force: options.force,
        installBinaries: true
    });
}


parser.action(exports.install);
