
exports.testNarwhalRunner = require("./narwhalrunner");

if (require.main === module.id)
    require("os").exit(require("test/runner").run(exports));

