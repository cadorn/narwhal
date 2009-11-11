
var ARGS = require('args');

var parser = exports.parser = new ARGS.Parser();

parser.help('List all known catalogs.');

parser.helpful();


parser.action(function (options, parentOptions, context) {

    var tusk = context.tusk,
        planet = tusk.getPlanet(),
        theme = tusk.getTheme();
    
    var found = false;
    planet.forEachCatalog(function(catalog, name) {
        
        var line = "\0yellow({name}\0) : {url}";
        
        var message = theme.newMessage({
            "name": name || "",
            "url": catalog.getUrl()
        });
        var data = message.getData();
        
        if(catalog.hasFallbackCatalog()) {
            data["fallbackUrl"] = catalog.getFallbackCatalog().getUrl();
            line += " \0magenta(<- {fallbackUrl}\0)";
        }

        message.setTermString(line).finalize();
        
        found = true;
        
    }, ["named", "transitive"]);

    if(!found) {
        theme.newMessage({
            "note": "No catalogs found"
        }, "{note}", "note").finalize();
    }

});


/*
var fs = require('file');
var util = require('util');
var args = require('args');
var json = require('json');
var stream = require('term').stream;
var CATALOG = require('../../catalog');

var parser = exports.parser = new args.Parser();

parser.help('List all known catalogs.');


parser.action(function (options) {
    
    var catalogs = CATALOG.list();
    var c;
    
    stream.print("\0bold(\0yellow(Sea:\0)\0)");

    if(seaPath = system.env["SEA"]) {
    
        catalogs.sea.forEach(function(path) {
            var catalog = CATALOG.Catalog(path);
            stream.print("  " + catalog.getPath() + " (" + catalog.getName() + ") \0green((" + (c=catalog.getPackageCount()) + " package"+((c==1)?"":"s")+")\0)");
        });
        
    } else {
        stream.print("  (no sea active)");
    }

    stream.print("\0bold(\0yellow(Planet:\0)\0)");
/*
    catalogs.narwhal.forEach(function(path) {
        var catalog = CATALOG.Catalog(path);
        stream.print("  \0green(" + catalog.getName() + "\0): " + catalog.getPath() + " \0green((" + (c=catalog.getPackageCount()) + " package"+((c==1)?"":"s")+")\0)");
    });
*/
/*
    catalogs.planet.forEach(function(path) {
        var catalog = CATALOG.Catalog(path),
            originCatalog = catalog.getOriginCatalog();

        stream.print("  \0green(" + catalog.getName() + "\0): " + catalog.getPath() + 
                     " \0green((" + (c=catalog.getPackageCount()) + " package"+((c==1)?"":"s")+")\0)" +
                     " \0"+(originCatalog.exists()?"magenta":"red")+"(<-" +
                     " " + originCatalog.getURL() + "\0)" +
                     (catalog.hasOriginUpdates()?" \0cyan((HAS UPDATES)\0)":""));
    });

});

*/
