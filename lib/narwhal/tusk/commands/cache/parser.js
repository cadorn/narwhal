
var FILE = require("file");
var ARGS = require("args");
var parser = exports.parser = new ARGS.Parser();

parser.help('Commands for managing the tusk cache');

var commandsPath = FILE.Path(module.id).dirname();

parser.command('clear', commandsPath + '/clear');

parser.helpful();


parser.action(function (options) {});
