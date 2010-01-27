

function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var assert = require("assert");
var util = require("util");

exports["test completes key"] = function() {
    assert.equal("world", util.complete({}, { hello: "world" }).hello);
};

exports["test does not complete key"] = function() {
    assert.equal("usa", util.complete({
        hello: "usa"
    }, {
        hello: "world"
    }).hello);
};

exports["test deep complete"] = function() {
    
    var subject = {
        "key1": "val1",
        "key2": {
            "key3": "val3"
        }
    };
    
    util.deepComplete(subject, {
        "key1": "val1new",
        "key2": {
            "key4": "val4"
        },
        "key5": "val5"
    });
    
    assert.deepEqual(subject, {
        "key1": "val1",
        "key2": {
            "key3": "val3",
            "key4": "val4"
        },
        "key5": "val5"
    });

};


if (require.main == module.id)
    require("test").run(exports);
