
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var FILE = require("file");
var UTIL = require("util");
var CONFIG = require("./config");
var TUSK = require("./tusk");
var SEA = require("./sea");
var PACKAGE = require("./package");
var CATALOG = require("./catalog");
var LOCATOR = require("./locator");
var MD5 = require("md5");
var URI = require("uri");
var HTTP = require("http");
var ZIP = require("zip");
var STRUCT = require("struct");



exports.Planet = function (planetPath) {

    // PRIVATE
    
    if(!(planetPath instanceof FILE.Path)) {
        planetPath = FILE.Path(planetPath);
    }
    
    var config = getConfig();
    var packageMetadata = getPackageMetadata();
    
    
    // PUBLIC

    var Planet = {};
    
    Planet.exists = function() {
        return (planetPath.exists() && planetPath.glob('*').length>0);
    }
    
    Planet.getPath = function() {
        return planetPath;
    }

    Planet.getConfig = function() {
        return config;
    }

    Planet.init = function() {
        if(Planet.exists()) {
            throw "directory not empty: " + planetPath;
        }
        planetPath.mkdirs();
        config.save();
    }
    
    Planet.destroy = function(prefixPath) {
        if(!prefixPath || !prefixPath.valueOf() || 
           planetPath.valueOf().substr(0,prefixPath.valueOf().length)!=prefixPath.valueOf()) {
            throw "sanity check failed for prefixPath: " + prefixPath;
        }
        planetPath.rmtree();
    }
    
    Planet.newSea = function(path) {
        var sea = SEA.Sea(path);
        sea.setPlanet(Planet);
        return sea;
    }

    Planet.addSea = function(sea) {
        getConfig().addSea(sea.getPath());
    }

    Planet.removeSea = function(path) {
        getConfig().removeSea(path);
    }

    Planet.getSeas = function() {
        if(!config.exists() || !UTIL.has(config.config, "seas")) {
            return [];
        }
        
        var seas = [];
        config.config.seas.forEach(function(path) {
            seas.push(SEA.Sea(path));
        });
        return seas;
    }
    
    Planet.getSeaForSelector = function(selector) {
        var path;
        // check if we have a numeric sea number
        if( selector+1 > 1 ) {
            var list = Planet.getSeas();
            if(selector>=1 && selector <= list.length) {
                return list[selector-1];
            }
        } else
        // check if we have a sea path
        if((path = FILE.Path(selector)) && path.exists()) {
            return SEA.Sea(path);
        } else {
            var list = Planet.getSeas();
            for(  var i=0 ; i<list.length ; i++ ) {
                if(list[i].getName()==selector) {
                    return list[i];
                }
            }
        }
        return null;
    }
    
    Planet.getCacheDirectory = function() {
        var path = planetPath.join("cache");
        path.mkdirs();
        return path;
    }
    
    Planet.getCatalogDirectory = function() {
        var path = planetPath.join("catalogs");
        path.mkdirs();
        return path;
    }
    
    Planet.clearCache = function() {
        var path = Planet.getCacheDirectory();
        
        var message = TUSK.getActive().getTheme().newMessage({
            "path": path.valueOf(),
            "note": "Clearing cache"
        }, "{note} at path: {path}", "note").finalize();
        
        message.startGroup();

        path.rmtree();

        TUSK.getActive().getTheme().newMessage({
            "path": path.valueOf(),
            "message": "Cleared cache"
        }, "\0green(Done\0)").finalize();
        
        message.endGroup();
    }
    
    Planet.addOverlay = function(overlay) {
        return packageMetadata.addOverlay(overlay);
    }
    
    Planet.forEachOverlay = function(callback, type) {
        return packageMetadata.forEachOverlay(callback, type);
    }
    
    Planet.getCatalogPath = function(uri) {
        if(! (uri instanceof URI.URI)) {
            uri = URI.parse(uri);
        }
        return Planet.getCatalogDirectory().join(
            uri.domain.split(".").reverse().join(".") + uri.path.replace(/\//g, "."));
    }

    // for aliased catalogs
    Planet.hasCatalog = function(name) {
        return config.hasCatalog(name);
    }

    // for aliased catalogs
    Planet.addCatalog = function(name, url) {
        return config.addCatalog(name, url);
    }

    Planet.forEachCatalog = function(callback, types) {
        types = types || "named";
        if(!UTIL.isArrayLike(types)) types = [types];
        
        if(UTIL.has(types, "named")) {
            var catalogs = config.getCatalogs();
            if(!catalogs) return;
            UTIL.every(catalogs, function(item) {
                callback(Planet.getCatalog(item[1]), item[0]);
            });
        }
        if(UTIL.has(types, "transitive")) {
            Planet.getCatalogDirectory().listPaths().forEach(function(dir) {
                if(dir.isFile()) {
                    var catalog = Planet.getCatalog(dir.valueOf());
                    if(UTIL.has(catalog.getCatalog(), "location")) {
                       catalog = Planet.getCatalog(catalog.getCatalog().location);
                    }
                    callback(catalog);
                }
            });
        }
    }
    
    Planet.getCatalog = function(selector, includeOverlay, basePath) {

        var locator = selector;
        if(! (locator instanceof LOCATOR.Locator)) {
            locator = LOCATOR.Locator({"catalog": selector, "name":""});
        }
        includeOverlay = !(includeOverlay==false);      // default to: true

        if(includeOverlay) {
            locator = Planet.resolveLocator(locator);
        }
        
        selector = locator.getUrl();
        
        var catalog = false,
            path;
        
        if(!selector) {
            catalog = TUSK.getActive().getSea().getCatalog();
        } else
        if(selector=="narwhal") {
  
            throw new TUSK.TuskError("need to re-arrange narwhal catalog");            
//            return CATALOG.Catalog(TUSK.getNarwhalHomePath().join("catalog.json"));
        } else
        // check aliased catalogs
        if(Planet.hasCatalog(selector)) {
            catalog = Planet.getCatalog(config.getCatalog(selector));
        } else
        // check if selector is an absolute file path
        if((path = FILE.Path(selector)).exists()) {
            catalog = CATALOG.Catalog(path);
        } else {
        
            var uri = URI.parse(selector);
            
            if(uri.protocol=="http" || uri.protocol=="https") {
                
                var catalogPath = Planet.getCatalogPath(uri);
                if(!catalogPath.exists()) {
        
                    TUSK.getActive().getTheme().newMessage({
                        "url": uri.url,
                        "path": catalogPath.valueOf(),
                        "note": "Downloading '{url}' to: {path}"
                    }, "{note}", "note").finalize();
        
                    catalogPath.write(HTTP.read(uri.url, 'b'), 'b');
        
                    if(!catalogPath.exists() || catalogPath.size()==0) {
                        throw new TUSK.TuskError("error downloading catalog from: " +uri.url);
                    }
                }
        
                catalog = CATALOG.Catalog(catalogPath, uri.url);
            
            } else
            // absolute path to catalog
            if(uri.protocol=="file" && FILE.isAbsolute(uri.url.substr(7)) &&
               (path = FILE.Path(uri.url.substr(7))).exists()) {
                catalog = CATALOG.Catalog(path);
            } else
            // relative path to catalog
            if(uri.protocol=="file" && basePath && !FILE.isAbsolute(uri.url.substr(7)) &&
               (path = basePath.join(uri.url.substr(7))).exists()) {
                catalog = CATALOG.Catalog(path);
            } else {
                throw new TUSK.TuskError("NYI: Fetch catalog for selector: "+selector);
            }
            if(!catalog) {
                throw new TUSK.TuskError("Could not find catalog for selector: "+ selector);
            }
        }
        
        // add overlay to catalog if applicable
        var originalLocator = locator.getOriginal();
        if(originalLocator) {
            catalog.setFallbackCatalog(Planet.getCatalog(originalLocator, false));
        }

        return catalog;
    }
    
    Planet.resolveLocator = function(locator) {
        
        // TODO: Recursive overlays by chaining Locator(..., <child>)
        
        // rewrite the locator if we have a location overlay    
        if(packageMetadata.hasOverlay(locator.getUrl(), "location")) {
            locator = LOCATOR.Locator({
                "location": packageMetadata.getOverlay(locator.getUrl(), "location").getOverlayUrl(),
                "path": locator.getPath()
            }, locator);
        } else
        if(packageMetadata.hasOverlay(locator.getUrl(), "catalog")) {
            locator = LOCATOR.Locator({
                "catalog": packageMetadata.getOverlay(locator.getUrl(), "catalog").getOverlayUrl(),
                "name": locator.getName()
            }, locator);
        }
        
        return locator;
    }
    
    Planet.getPackage = function(locator) {

        locator = Planet.resolveLocator(locator);

        if(locator.getType()=="catalog") {

            var url = locator.getUrl();
    
            // before we download the catalog let's check if it is the
            // same catalog that our active sea is using.
            
            var catalog = TUSK.getActive().getSea().getCatalog(),
                catalogData = catalog.getCatalog();

            if(UTIL.has(catalogData, "location") && catalogData.location==url) {
                // the catalog we are trying to reference matches the sea catalog.
                // we are going to use the sea catalog to locate the package
                // instead of downloading the catalog.
                // a sea catalog provides a means to reference packages included
                // in a master package/sea individually.
            } else {
                
                // locate catalog
                catalog = Planet.getCatalog(url);
            }
            
            var name = locator.getName();
            
            if(!catalog.hasPackage(name)) {
                throw "package '" + name + "' not found in catalog";
            }

            return catalog.getPackage(name);

        } else        
        if(locator.getType()=="location") {

            var uri = locator.getUri();
            
            // see if we have a local file path
            if(uri.protocol=="file") {
                
                packagePath = FILE.Path(uri.path);
                
            } else {
                
                // we have a package on a URL we need to download
                
                var url = locator.getUrl();
                var key = STRUCT.bin2hex(MD5.hash(url));
                var packagePath = Planet.getCacheDirectory().join(key);
                if(!packagePath.exists()) {
                    var zipFile = FILE.Path(packagePath + ".zip");
                    if(zipFile.exists()) {
                        zipFile.remove();
                    }
        
                    TUSK.getActive().getTheme().newMessage({
                        "url": url,
                        "path": zipFile.valueOf(),
                        "note": "Downloading '{url}' to: {path}"
                    }, "{note}", "note").finalize();
        
                    zipFile.write(HTTP.read(url, 'b'), 'b');
                    
                    if(!zipFile.exists() || zipFile.size()==0) {
                        throw "error downloading package from: " + url;
                    }
        
                    TUSK.getActive().getTheme().newMessage({
                        "path": packagePath.valueOf(),
                        "note": "Extracting to: {path}"
                    }, "{note}", "note").finalize();
        
                    new ZIP.Unzip(zipFile).forEach(function (entry) {
                        if (entry.isDirectory())
                            return;
                        var parts = FILE.split(entry.getName());
                        parts.shift(); // name-project-comment ref dirname
                        var path = packagePath.join(FILE.join.apply(null, parts));
                        path.dirname().mkdirs();
                        path.write(entry.read('b'), 'b');
                    });
                    
                    if(!packagePath.exists() || !packagePath.isDirectory()) {
                        throw "error extracting zip file: " + zipFile;
                    }
                }
            }
            
            var subPath = locator.getPath();
            if(subPath) {
                packagePath = packagePath.join(subPath);
                if(!packagePath.exists()) {
                    throw "no package found at sub path: " + packagePath;
                }
            }

            return PACKAGE.Package(packagePath, locator);
        }
    }

    return Planet;
    
    
    // PRIVATE
    
    function getConfig() {
        
        // TEMPORARY: migration: rename tusk.json to user.json
        if(planetPath.join("tusk.json").exists()) {
            planetPath.join("tusk.json").rename("user.json");
        }
        
        return CONFIG.TuskConfig(planetPath.join("user.json"));
    }
    
    function getPackageMetadata() {
        return CONFIG.PackageMetadata(planetPath.join("package.local.json"));
    }
}

