
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var UTIL = require('util');
var ARGS = require('args');

var parser = exports.parser = new ARGS.Parser();

parser.help('Rewrite package descriptors to point to local sea packages and store in catalog.local.json');

parser.arg("catalogPath");

parser.helpful();


parser.action(function (options, parentOptions, context) {

    var tusk = context.tusk,
        sea = tusk.getSea(),
        planet = tusk.getPlanet(),
        theme = tusk.getTheme();
    
    
    // TODO: move this to ./parser.js and put "catalog" into "context"
    var catalog;
    if(parentOptions.catalog) {
        catalog = planet.getCatalog(parentOptions.catalog);
    } else {
        catalog = sea.getCatalog();
    }
    
    if(catalog.getPath().basename().valueOf()!="catalog.json") {
        theme.newMessage({
            "path": catalog.getPath().valueOf(),
            "message": "Incorrect catalog file to localize. Expecting 'catalog.json' file path."
        }, "{message} Got: {path}", "error").finalize();
        return;
    }
    
    var message = theme.newMessage({
        "path": catalog.getPath().valueOf(),
        "message": "Localizing catalog"
    }, "{message}: {path}", "note").finalize();

    message.startGroup();
    
    var seaBasePath = sea.getPath(),
        localCatalog = catalog.getLocalCatalog(),
        localCatalogStruct = localCatalog.getCatalog();
    
    catalog.forEachPackageDescriptor(function(name, descriptor) {
        if(seaBasePath.join(descriptor.path).exists()) {
            if(!UTIL.has(localCatalogStruct.packages, name)) {
                localCatalogStruct.packages[name] = {};
            }
            UTIL.update(localCatalogStruct.packages[name], {
                "location": "file://./"
            });
            theme.newMessage({
                "name": name,
                "message": "Localized package"
            }, "{message} with name: {name}").finalize();
        }
    });
    localCatalog.save();
    
    message.endGroup();
});
