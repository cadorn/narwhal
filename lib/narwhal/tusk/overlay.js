
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

    // TODO: Validate & format catalogURI && overlayURI. Assuming full URL's for now.
    
    var CatalogOverlay = exports.Overlay();
    CatalogOverlay.prototype = UTIL.copy(CatalogOverlay);
    
    CatalogOverlay.type = "catalog";

    // PUBLIC

    
    CatalogOverlay.getCatalogUrl = function() {
        return catalogURI;
    }
    
    CatalogOverlay.getOverlayUrl = function() {
        return overlayURI;
    }

    return CatalogOverlay;
}




exports.LocationOverlay = function (locationURI, overlayURI) {

    // PRIVATE
    
    // TODO: Validate & format locationURI && overlayURI. Assuming full URL's for now.
    
    var LocationOverlay = exports.Overlay();
    LocationOverlay.prototype = UTIL.copy(LocationOverlay);
    
    LocationOverlay.type = "location";

    // PUBLIC

    
    LocationOverlay.getLocationUrl = function() {
        return locationURI;
    }
    
    LocationOverlay.getOverlayUrl = function() {
        return overlayURI;
    }

    return LocationOverlay;
}
