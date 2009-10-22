
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var ARGS = require('args');

var parser = exports.parser = new ARGS.Parser();

parser.help('Add a catalog with the given name.');

parser.arg("name");
parser.arg("url");

parser.helpful();


parser.action(function (options, parentOptions, context) {

    var tusk = context.tusk,
        planet = tusk.getPlanet(),
        theme = tusk.getTheme();
    
    var name = options.args[0];
    if(!name) {
        theme.newMessage({
            "message": "No name for catalog provided"
        }, "{message}", "error").finalize();
        return;
    }
    
    var url = options.args[1];
    if(!url) {
        theme.newMessage({
            "message": "No url for catalog provided"
        }, "{message}", "error").finalize();
        return;
    }

    if(planet.hasCatalog(name)) {
        theme.newMessage({
            "name": name,
            "message": "Existing catalog"
        }, "There is an existing catalog for name: {name}", "error").finalize();
        return;
    }

    var catalog = planet.getCatalog(url);
    if(!catalog) {
        theme.newMessage({
            "url": url,
            "message": "Could not locate catalog"
        }, "{message} at url: {url}", "error").finalize();
        return;
    }
    
    planet.addCatalog(name, url);

    theme.newMessage({
        "name": name,
        "url": url,
        "message": "Added catalog"
    }, "{message} '{url}' with name '{name}'").finalize();
});
