
// -- kriskowal Kris Kowal Copyright (C) 2009-2010 MIT License
// -- tschaub
// -- cadorn Christoph Dorn Copyright (C) 2010 MIT License

var fs = require('./file');
var system = require('./system');

/*** analyze
*/
exports.analyze = function (analysis, sortedPackages) {
    analysis.javaPaths = analysis.javaPaths || [];
    var javaPaths = analysis.javaPaths;
    sortedPackages.forEach(function (packageData) {
        /* migration */
        if (packageData.jars)
            packageData.java = packageData.jars;
        /* /migration */
        if (typeof packageData.java == 'string')
            packageData.java = [packageData.java];
        if (!packageData.java)
            packageData.java = [];
        for (var i = 0; i < packageData.java.length; i++)
            packageData.java[i] = packageData.directory.resolve(packageData.java[i]);
        /* new approach */
        var jarsDirectory = packageData.directory.join('jars');
        if (jarsDirectory.isDirectory()) {
            jarsDirectory.listPaths().forEach(function (jarDirectory) {
                packageData.java.push(jarDirectory);
            });
        }
        packageData.java.forEach(function(jarDirectory) {
            if(javaPaths.indexOf(""+jarDirectory)==-1 && fs.Path(jarDirectory).exists())
                javaPaths.unshift(""+jarDirectory);
        });
    });
};

/*** synthesize
*/
exports.synthesize = function (analysis) {
    exports.addJavaPaths(analysis.javaPaths);
};

var loader = Packages.java.lang.ClassLoader.getSystemClassLoader();
// so that replacing Packages does not implicitly dispose of the
//  only means of creating new Packages objects.

/*** addJavaPaths
*/
exports.addJavaPaths = function addJavaPaths(javaPaths) {
    if (!javaPaths || javaPaths.length === 0)
        return;

    // after reinstalling Packages once, the Packages object
    // is no longer a Packages constructor function.
    // If that's the case, abandone hope.
    if (/*typeof Packages == "object"  this no longer works in latest builds of Rhino || */
            system.appEngine)
        return;

    var context = Packages.org.mozilla.javascript.Context.getCurrentContext();
    
    /* set up jar loader */
    var urls = Packages.java.lang.reflect.Array.newInstance(java.net.URL, javaPaths.length);
    for (var i = 0; i < javaPaths.length; i++) {
        urls[i] = (new java.io.File(javaPaths[i])).toURL();
    };

    var newLoader;

    // check to see if class loader is already in place
    if (context.getApplicationClassLoader().getClass() == Packages.java.net.URLClassLoader) {
        var existingLoader = context.getApplicationClassLoader(),
            existingUrls = existingLoader.getURLs(),
            existingUrlsMap = {},
            createNew = false;
        for (var i = 0; i < existingUrls.length; i++) {
            existingUrlsMap[existingUrls[i].toString()] = true;
        }
        // only create new loader if urls have changed
        for (var i = 0; i < urls.length; i++) {
            if(!existingUrlsMap[urls[i].toString()]) {
                createNew = true;
                break;
            }
        }
        if(!createNew) return;
        newLoader = new Packages.java.net.URLClassLoader(urls, existingLoader.getParent());
    } else {
        newLoader = new Packages.java.net.URLClassLoader(urls, loader);
    }

    try {
        /* intall jar loader */
        //Packages.java.lang.Thread.currentThread().setContextClassLoader(loader);
        context.setApplicationClassLoader(newLoader);
        // keep a reference to rhino's original "Packages" variable
        // this is passed to workers in narwhal/engines/rhino/lib/worker-engine
        if(!global.OriginalPackages) {
            global.OriginalPackages = Packages;
        }
        // must explicitly be made global when each module has it's own scope
        global.Packages = new global.OriginalPackages(newLoader);
        installed = true;
    } catch (e) {
        print("warning: couldn't install jar loader: " + e);
    }
};

