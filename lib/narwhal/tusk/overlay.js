
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var UTIL = require("util");
var URI = require("uri");
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

    catalogURI = URI.parse(catalogURI);
    overlayURI = URI.parse(overlayURI);
    
    var CatalogOverlay = exports.Overlay();
    CatalogOverlay.prototype = UTIL.copy(CatalogOverlay);
    
    CatalogOverlay.type = "catalog";

    // PUBLIC

    
    CatalogOverlay.getCatalogUrl = function() {
        return catalogURI.url;
    }
    
    CatalogOverlay.getOverlayUrl = function() {
        return overlayURI.url;
    }

    CatalogOverlay.getOverlayProtocol = function() {
        return overlayURI.protocol;
    }

    CatalogOverlay.getOverlayPath = function() {
        return FILE.Path(overlayURI.path);
    }

    return CatalogOverlay;
}




exports.LocationOverlay = function (locationURI, overlayURI) {

    // PRIVATE
    
    // TODO: Validate & format locationURI && overlayURI. Assuming full URL's for now.
    
    locationURI = URI.parse(locationURI);
    overlayURI = URI.parse(overlayURI);
    
    var LocationOverlay = exports.Overlay();
    LocationOverlay.prototype = UTIL.copy(LocationOverlay);
    
    LocationOverlay.type = "location";

    // PUBLIC

    
    LocationOverlay.getLocationUrl = function() {
        return locationURI.url;
    }
    
    LocationOverlay.getOverlayUrl = function() {
        return overlayURI.url;
    }

    LocationOverlay.getOverlayProtocol = function() {
        return overlayURI.protocol;
    }

    LocationOverlay.getOverlayPath = function() {
        return FILE.Path(overlayURI.path);
    }

    return LocationOverlay;
}
