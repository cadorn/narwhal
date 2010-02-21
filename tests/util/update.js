
var assert = require("assert");
var util = require("util");

exports["test returns updated object"] = function() {
    var obj = {};
    var obj2 = { hello: "world" };

    var result = util.update(obj, obj2);

    assert.equal(result, obj);
};

exports["test is variadic"] = function() {
    var obj = util.update({}, { a: 1 }, { b: 2});

    assert.equal(1, obj.a);
    assert.equal(2, obj.b);
};

exports["test last in wins for multiple sources"] = function() {
    var obj = util.update({}, { a: 1 }, { a: 2});

    assert.equal(2, obj.a);
};

exports["test update modifies first argument"] = function() {
    
    var obj1 = {a: 1};
    var obj2 = {a: 2};
    
    var obj = util.update(obj1, obj2);

    assert.deepEqual(obj, obj2);
    assert.deepEqual(obj1, obj2);
};


exports["test object value wins over array value in deepUpdate"] = function() {

    var obj1 = {
        "a": [
            "b"
        ]
    }
    var obj2 = {
        "a": {
            "b1": "c"
        }
    }
    util.deepUpdate(obj1, obj2);

    assert.deepEqual(obj2, obj1);
};

if (module.id == require.main)
    require("test").run(exports);
