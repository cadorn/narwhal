
var assert = require("test/assert");
var util = require("util");

exports.testCreate = require("./create");
exports.testInit = require("./init");
exports.testList = require("./list");

if (require.main === module.id)
    require("os").exit(require("test/runner").run(exports));
