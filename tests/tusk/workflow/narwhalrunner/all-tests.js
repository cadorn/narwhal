
exports.testTestApplication = require("./test-application");
exports.testFirefoxExtension = require("./test-firefox-extension");


if (require.main === module.id)
    require("os").exit(require("test/runner").run(exports));

