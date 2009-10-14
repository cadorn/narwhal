
var ASSERT = require("test/assert");
var FILE = require("file");
var UTIL = require("util");

var TUSK_TEST_UTIL = require("../../util.js");


exports.test = function () {

    var tusk = TUSK_TEST_UTIL.setup();

    var path = tusk.getPlanet().getCacheDirectory();
    
    TUSK_TEST_UTIL.expectResult(tusk,
        {},
        "tusk cache clear",
        [[{type: "message"}, [
            {
                "path": path.valueOf(),
                "message": "Cleared cache"
            },
        ]]]);

    var tmpPath = path.join("tmp");
    
    ASSERT.isFalse(tmpPath.exists());
    
    path.mkdirs();
    tmpPath.touch();
    
    ASSERT.isTrue(tmpPath.exists());
    
    TUSK_TEST_UTIL.expectResult(tusk,
        {},
        "tusk cache clear",
        [[{type: "message"}, [
            {
                "path": path.valueOf(),
                "message": "Cleared cache"
            },
        ]]]);
    
    ASSERT.isFalse(tmpPath.exists());

    TUSK_TEST_UTIL.teardown(tusk);
};



if (require.main === module.id)
    require("os").exit(require("test/runner").run(exports));

