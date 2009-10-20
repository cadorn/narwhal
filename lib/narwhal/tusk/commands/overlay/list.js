
var ARGS = require('args');

var parser = exports.parser = new ARGS.Parser();

parser.help('List package and catalog overlays');


parser.action(function (options, parentOptions, context) {

    var tusk = context.tusk,
        planet = tusk.getPlanet(),
        theme = tusk.getTheme();
    
    var message,
        message1;
    
    
    message = theme.newMessage({
        "note": "Global Overlays"
    }, "\0bold(\0yellow({note}:\0)\0)", "note").finalize();
    
    message.startGroup();
    
        message1 = theme.newMessage({
            "note": "Catalog"
        }, "\0bold(\0yellow({note}:\0)\0)", "note").finalize();
        
        message1.startGroup();
   
//        planet.forEachOverlay(function(overlay) {

            
//        });
   
        message1.endGroup();
    

        message1 = theme.newMessage({
            "note": "Package"
        }, "\0bold(\0yellow({note}:\0)\0)", "note").finalize();
        
        message1.startGroup();
   
   
        message1.endGroup();
    

/*
    theme.newMessage({
        "config": JSDUMP.parse(config.config),
    }, "{config}").finalize();
*/  
    
    message.endGroup();
    
    
    message = theme.newMessage({
        "note": "Sea Overlays"
    }, "\0bold(\0yellow({note}:\0)\0)", "note").finalize();
    
    message.startGroup();

        message1 = theme.newMessage({
            "note": "Catalog"
        }, "\0bold(\0yellow({note}:\0)\0)", "note").finalize();
        
        message1.startGroup();
   
   
        message1.endGroup();
    

        message1 = theme.newMessage({
            "note": "Package"
        }, "\0bold(\0yellow({note}:\0)\0)", "note").finalize();
        
        message1.startGroup();
   
   
        message1.endGroup();

/*
    theme.newMessage({
        "config": JSDUMP.parse(config.config),
    }, "{config}").finalize();
*/  
    
    message.endGroup();


});


