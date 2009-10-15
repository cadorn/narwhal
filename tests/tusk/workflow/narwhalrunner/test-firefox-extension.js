
var ASSERT = require("test/assert");
var UTIL = require("util");

var SEA = require("narwhal/tusk/sea");
var TUSK = require("narwhal/tusk/tusk");
var TUSK_TEST_UTIL = require("../../util.js");


/**
 * @see http://github.com/cadorn/narwhalrunner # Demo: test-firefox-extension
 */
exports.testInstall = function () {

    var defaultTusk = TUSK_TEST_UTIL.setup("default"),
        tusk = defaultTusk;

    var seaPath = TUSK_TEST_UTIL.getBuildPath().join("seas", "nr-test-application");
    if(seaPath.exists()) {
        seaPath.rmtree();
    }
    
    TUSK_TEST_UTIL.runWorkflow(tusk, [
        "tusk cache clear",
        "tusk sea create --name playground " + seaPath.valueOf(),
        function() {
            return (tusk = TUSK.Tusk(defaultTusk.getPlanet(), SEA.Sea(seaPath), defaultTusk.getTheme()));            
        },
        "tusk package install --alias nr-devtools http://github.com/cadorn/narwhalrunner/raw/master/catalog.json devtools",
        "nr add-bin /Applications/Firefox.app/Contents/MacOS/firefox-bin",
        "tusk package install http://github.com/cadorn/narwhalrunner/raw/master/catalog.json test-firefox-extension",
        "tusk package --package test-firefox-extension build"
    ]);
    
    var seaBuildPath = tusk.getSea().getBuildPath();
        seaBinPath = tusk.getSea().getBinPath();

    TUSK_TEST_UTIL.printUserCommands("Run to test:", [
        seaBinPath.join("sea").valueOf() + " nr create-profile --dev test1",
        seaBinPath.join("sea").valueOf() + " nr add-extension -l --profile test1 " + seaBuildPath.join("test-firefox-extension").valueOf(),
        seaBinPath.join("sea").valueOf() + " nr launch --dev --app firefox --profile test1"
    ]);

    TUSK_TEST_UTIL.teardown(defaultTusk);
};


if (require.main === module.id)
    require("os").exit(require("test/runner").run(exports));
