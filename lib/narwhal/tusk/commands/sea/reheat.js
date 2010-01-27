
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var ARGS = require("args");

var CACHE = require("narwhal/cache");

var parser = exports.parser = new ARGS.Parser();

parser.help('Install dependencies and transitive dependencies of the root package based on version information available.');

parser.helpful();

parser.action(function (options, parentOptions, context) {

    CACHE.clear();

    var tusk = context.tusk,
        sea = tusk.getSea(),
        planet = tusk.getPlanet(),
        theme = tusk.getTheme();


    // before we reheat the sea we need to localize all local packages referenced in the sea catalog
    tusk.command("tusk sea localize");


    var message = theme.newMessage({
        "note": "Checking all dependencies for sea"
    }, "{note}", "note").finalize();

    message.startGroup();
            
        sea.forEachDependency(function(dependency) {
            pkg = dependency.getPackage();
            if(!pkg.exists()) {
                pkg.install(dependency.getLocator());
            } else {
                pkg.installDependencies();
            }
        });
                
    message.endGroup();
});
