
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var ARGS = require("args");

var parser = exports.parser = new ARGS.Parser();

parser.help('Install dependencies and transitive dependencies of the root package based on version information available.');

parser.helpful();

parser.action(function (options, parentOptions, context) {

    var tusk = context.tusk,
        sea = tusk.getSea(),
        planet = tusk.getPlanet(),
        theme = tusk.getTheme();


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
