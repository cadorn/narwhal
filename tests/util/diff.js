
// -- cadorn Christoph Dorn Copyright (C) 2009-2010 MIT License

var assert = require("assert");
var util = require("util");

exports["test deep diff"] = function() {
    
    var compare = {
        "key1": "val1",
        "key2": "val2",
        "key3": {
            "key4": "val4",
            "key5": [
                "val5",
                "val6"
            ],
            "key7": "val7",
            "key8": [
                "val8"
            ]
        },
        "key9": "val9",
        "key10": {
            "key11": "val11"
        }
    };
    
    var to = {
        "key2": "val2",
        "key3": {
            "key4": "val4",
            "key5": [
                "val5"
            ],
            "key8": [
                "val8"
            ]
        },
        "key10": {
            "key11": "val11"
        }
    }

    var to2 = {
        "key9": "val9"
    }
    
    // return all properties in "compare" not present/different in/to "to" and "to2"
    
    assert.deepEqual(util.deepDiff(compare, to, to2), {
        "key1": "val1",
        "key3": {
            "key5": [
                "val5",
                "val6"
            ],
            "key7": "val7"
        }
    });

};

if (require.main == module.id)
    require("test").run(exports);
