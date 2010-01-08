
// Christoph Dorn

var basePath = null;

/* 
 * NOTE: This function is called during the bootstrapping process
 */
exports.setBasePath = function(path) {
    basePath = path;
}

/* 
 * NOTE: This function is called during the bootstrapping process
 */
exports.getPath = function(name, focus) {
    if(!basePath) {
        throw new Error("Cache can only be used with an active SEA!");
    }
    return require("file").join(basePath, ".narwhal", "cache", name + "-" + normalizeFocus(focus));
}

exports.write = function(path, data) {
    var file = require("file").Path(path);
    if(!file.dirname().exists()) {
        file.dirname().mkdirs();
    }
    file.write(data);
}

exports.clear = function() {
    if(!basePath) {
        throw new Error("Cache can only be used with an active SEA!");
    }
    var file = require("file").Path(basePath).join(".narwhal", "cache");
    if(file.exists()) {
        file.listPaths().forEach(function(path) {
            path.remove();
        });
    }
}

function normalizeFocus(focus) {
    if(typeof focus != "string") {
        focus = require("struct").bin2hex(require("md5").hash(require("json").encode(focus)));
    } else {
        focus = focus.replace(/\//g, "-");
    }
    return focus;
}
