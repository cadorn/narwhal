
var OVERLAY = require("narwhal/tusk/overlay");
var ARGS = require('args');

var parser = exports.parser = new ARGS.Parser();

parser.help('Add a package or catalog overlay');

parser.arg("overlay");

parser.option('--scope')
    .set()
    .help("Whether to apply the overlay to 'planet', 'sea' or 'package'. Default: 'planet'.");

parser.option('--catalog')
    .set()
    .help('The catalog to overlay.');

parser.helpful();


parser.action(function (options, parentOptions, context) {

    var tusk = context.tusk,
        planet = tusk.getPlanet(),
        theme = tusk.getTheme();
    
    var overlayPointer = options.args[0];
    if(!overlayPointer) {
        theme.newMessage({
            "message": "No overlay specified"
        }, "{message}", "error").finalize();
        return;        
    }
    
    var scope = options.scope || "planet";
    
    if(scope=="planet") {
        if(options.catalog) {

            var overlay = OVERLAY.CatalogOverlay(options.catalog, overlayPointer);

            planet.addOverlay(overlay);

            theme.newMessage({
                "type": "catalog",
                "scope": scope,
                "catalog": overlay.getCatalogUrl(),
                "overlay": overlay.getOverlayUrl(),
                "message": "Added catalog overlay to planet"
            }, "{message}").finalize();
        }
    }    

});


