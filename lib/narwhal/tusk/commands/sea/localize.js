
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var UTIL = require('util');
var ARGS = require('args');

var parser = exports.parser = new ARGS.Parser();

parser.help('Rewrite package descriptors to point to local sea packages via *.local.json files');

parser.helpful();


parser.action(function (options, parentOptions, context) {

    var tusk = context.tusk,
        sea = tusk.getSea(),
        planet = tusk.getPlanet(),
        theme = tusk.getTheme();
    
    
    var catalog = sea.getCatalog(),
        message;
    

    message = theme.newMessage({
        "path": catalog.getPath().valueOf(),
        "message": "Localizing catalog"
    }, "{message}: {path}", "note").finalize();

    message.startGroup();
    
    var seaBasePath = sea.getPath(),
        localCatalog = catalog.getLocalCatalog(),
        localCatalogStruct = localCatalog.getCatalog();
    
    var packages = [];
    
    // rewrite all package locations (for sea packages) in catalog.json
    catalog.forEachPackageDescriptor(function(name, descriptor) {
        if(seaBasePath.join(descriptor.path).exists()) {
            if(!UTIL.has(localCatalogStruct.packages, name)) {
                localCatalogStruct.packages[name] = {};
            }
            UTIL.deepUpdate(localCatalogStruct.packages[name], {
                "location": "file://./"
            });
            theme.newMessage({
                "name": name,
                "message": "Localized package"
            }, "{message} with name: {name}").finalize();
            
            packages.push(name);
        }
    });
    localCatalog.save();
    catalog.reload();

    message.endGroup();

    
    message = theme.newMessage({
        "message": "Localizing sea package dependencies"
    }, "{message}", "note").finalize();
    
    message.startGroup();
    
    packages.forEach(function(pkgName) {
        
        var pkg = sea.getPackage(pkgName);
        pkg.setIgnoreLocalManifest(true);
        pkg.reload();
        
        var message1 = theme.newMessage({
            "name": pkg.getName(),
            "message": "Inspecting dependencies"
        }, "{message} for package: {name}", "note").finalize();
        
        message1.startGroup();
        
        var localPkgManifest;
                
        // remove locations (catalog and location) for dependencies of sea packages pointing to sea packages 
        pkg.forEachDependency(function(dependency) {
            
            if(dependency.getLocator().isNamedOnly() || dependency.getLocator().getUrl()=="file://./") {
                
                if(!localPkgManifest) localPkgManifest = pkg.getLocalManifest();
                
                var info;

                if(dependency.getType()=="package") {
                    info = {"using":{}};
                    info.using[dependency.getName()] = {
                        "catalog": "",
                        "location": ""
                    };
                } else
                if(dependency.getType()=="build") {
                    info = {"build":{"using":{}}};
                    info.build.using[dependency.getName()] = {
                        "catalog": "",
                        "location": ""
                    };
                }
                
                UTIL.deepUpdate(localPkgManifest.manifest, info);
                
                theme.newMessage({
                    "name": dependency.getName(),
                    "message": "Localized dependency"
                }, "{message} with name: {name}").finalize();
            }
        }, ["package", "build"], true);

        if(localPkgManifest) localPkgManifest.save();
        
        message1.endGroup();
    });
    
    message.endGroup();
});
