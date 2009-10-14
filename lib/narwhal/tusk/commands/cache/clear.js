
/**
 * @test tests/tusk/commands/cache/clear.js
 */

var ARGS = require('args');
var parser = exports.parser = new ARGS.Parser();

parser.help('Clear the tusk cache');

parser.helpful();

parser.action(function (options, parentOptions, context) {

    context.tusk.getPlanet().clearCache();

});

