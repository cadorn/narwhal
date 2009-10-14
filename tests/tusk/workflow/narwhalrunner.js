
var ASSERT = require("test/assert");
var UTIL = require("util");

var SEA = require("narwhal/tusk/sea");
var TUSK = require("narwhal/tusk/tusk");
var TUSK_TEST_UTIL = require("../util.js");


/**
 * @see http://github.com/cadorn/narwhalrunner # Demo: test-application
 */
exports.testTestApplication = function () {

    var defaultTusk = TUSK_TEST_UTIL.setup("default"),
        tusk = defaultTusk;

    var seaPath = TUSK_TEST_UTIL.getBuildPath().join("seas", "nr-test-application");
    if(seaPath.exists()) {
        seaPath.rmtree();
    }

    var commands = [
        "tusk cache clear",
        "tusk sea create --name playground " + seaPath.valueOf(),
        function() {
            tusk = TUSK.Tusk(defaultTusk.getPlanet(), SEA.Sea(seaPath), defaultTusk.getTheme());            
        },
        "tusk package install --alias nr-devtools http://github.com/cadorn/narwhalrunner/raw/master/catalog.json devtools",
        "nr add-bin /Applications/Firefox.app/Contents/MacOS/firefox-bin",
        "tusk package install http://github.com/cadorn/narwhalrunner/raw/master/catalog.json test-application",
        "tusk package --package test-application build"
    ];

    commands.forEach(function(command) {
        if(typeof command == "function") {
            command();
        } else {
            TUSK_TEST_UTIL.print("Running: \0bold(\0cyan(" + command + "\0)\0)");
            tusk.command(command);
        }
    });

    TUSK_TEST_UTIL.teardown(defaultTusk);
};

if (require.main === module.id)
    require("os").exit(require("test/runner").run(exports));
