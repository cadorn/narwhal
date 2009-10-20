
var FILE = require("file");
var ARGS = require("args");
var parser = exports.parser = new ARGS.Parser();

parser.help('Overlay specific commands');

var commandsPath = FILE.Path(module.id).dirname();

parser.command('list', commandsPath + '/list');
parser.command('add', commandsPath + '/add');


parser.helpful();

parser.action(function (options) {});
