
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var UTIL = require("util");
var FILE = require("file");
var TUSK = require("./tusk");


exports.Overlay = function() {

    // PRIVATE


    // PUBLIC

    var Overlay = {};
    
    Overlay.getType = function() {
        return Overlay.type;
    }

    return Overlay;
}



exports.CatalogOverlay = function (catalogURI, overlayURI) {

    // PRIVATE
    
    var catalog = TUSK.getActive().getPlanet().getCatalog(catalogURI);
    var overlay = TUSK.getActive().getPlanet().getCatalog(overlayURI);

    var CatalogOverlay = exports.Overlay();
    CatalogOverlay.prototype = UTIL.copy(CatalogOverlay);
    
    CatalogOverlay.type = "catalog";

    // PUBLIC

    
    CatalogOverlay.getCatalogUrl = function() {
        return catalog.getUrl();
    }
    
    CatalogOverlay.getOverlayUrl = function() {
        return overlay.getUrl();
    }

    return CatalogOverlay;
}
