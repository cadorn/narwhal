
var FILE = require("file");
var SEA = require("../../sea");
var ARGS = require('args');
var parser = exports.parser = new ARGS.Parser();

parser.help('Add an existing sea.');
parser.arg("path");
parser.helpful();

parser.action(function (options, parentOptions, context) {
    
    var tusk = context.tusk,
        planet = tusk.getPlanet(),
        theme = tusk.getTheme();

        
    var path;
    if (options.args.length && !/^-/.test(options.args[0]))
        path = options.args.shift();
    else
        path = FILE.cwd();
    path = FILE.path(path).absolute();


    var newSea = SEA.Sea(path);

    if(!newSea.exists()) {
        theme.newMessage({
            "path": path.valueOf(),
            "message": "Directory does not exist"
        }, "{message}: {path}", "error").finalize();
        return;
    }

    if(!newSea.validate()) {
        theme.newMessage({
            "path": path.valueOf(),
            "message": "Directory does not appear to be a valid sea"
        }, "{message}: {path}", "error").finalize();
        return;
    }

    newSea.setPlanet(planet);
    newSea.register();

    theme.newMessage({
        path: newSea.getPath().valueOf(),
        "message": "Added sea"
    }, "{message} at: {path}").finalize();

});

