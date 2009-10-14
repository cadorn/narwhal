
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var STREAM = require('term').stream;
var TUSK = require("./tusk");
var THEME = require("./theme");
var OS = require("os");
var FILE = require("file");
var ARGS = require("args");

var parser = exports.parser = new ARGS.Parser();

parser.help('A Narwhal project package manager.');

parser.option('--planet').set().help("the planet context for tusk (a file path to /.tusk)");
parser.option('--sea').set().help("the sea context for tusk (a selector: name|index|path)");
parser.option('--theme').set().help("the theme for tusk");

var commandPath = FILE.Path(module.id).dirname().join("commands");
parser.command('cache',  commandPath + '/cache/parser');
parser.command('sea',  commandPath + '/sea/parser');
parser.command('package', commandPath + '/package/parser');
parser.command('config', commandPath + '/config/parser');
parser.command('catalog', commandPath + '/catalog/parser');

parser.helpful();


// run it

exports.main = function (planetPath, seaPath, themeType, args) {

var theme = THEME.Theme(themeType),
    tusk = TUSK.Tusk(planetPath, seaPath, theme);
 
    if(args[0]!="tusk") {
        
        // execute a command from the sea
        
        try {

            var command = tusk.getSea().getBinPath().join("sea").valueOf() + 
                          " " + args.join(" ");
        
            var process = OS.popen(command);
            var result = process.communicate();

            if(theme.getType()=="default") {
                
                STREAM.print(result.stdout.read());
                
            } else {
                theme.newMessage({
                    "status": result.status,
                    "stdout": result.stdout.read(),
                    "stderr": result.stderr.read()
                }, "{stdout}").finalize();
            }
                
            return theme;

        } catch(e) {

            if(theme.getType()=="default") {
                STREAM.print("\0red(" + e + "\0)");
    
                if (e.rhinoException) {
                    e.rhinoException.printStackTrace();
                }
                if (e.javaException) {
                    e.javaException.printStackTrace();
                }
    
                return null;
            } else {
                
                // temporary
                STREAM.print("\0red(" + e + "\0)");
    
                if (e.rhinoException) {
                    e.rhinoException.printStackTrace();
                }
                if (e.javaException) {
                    e.javaException.printStackTrace();
                }
                
                throw new TUSK.TuskError("return proper theme error message");
            }
        }
        
    } else {
        
        // execute a tusk command
 
        try {
            var options = parser.parse(args, {
                preActCallback: function(options, context) {
                    try {
    
                        // initialize tusk for given planet, sea and theme
                        tusk.activate();
    
                        context.tusk = tusk;
                        
                    } catch(e) {
                        STREAM.print("\0red(ERROR: " + e+"\0)");
                        throw e;
                    }
                    return true;
                }
            });
        } catch(e) {
            
            if(theme.getType()=="default") {
                STREAM.print("\0red(" + e + "\0)");
    
                if (e.rhinoException) {
                    e.rhinoException.printStackTrace();
                }
                if (e.javaException) {
                    e.javaException.printStackTrace();
                }
    
                return null;
            } else {
                
                // temporary
                STREAM.print("\0red(" + e + "\0)");
    
                if (e.rhinoException) {
                    e.rhinoException.printStackTrace();
                }
                if (e.javaException) {
                    e.javaException.printStackTrace();
                }
                
                throw new TUSK.TuskError("return proper theme error message");
            }
        }
    
        if (!options.acted) {
            parser.printHelp(options);
        }
    }

    tusk.deactivate();

    return theme;
}
