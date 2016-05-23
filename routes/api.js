var express = require('express');
var router = express.Router();
var db = require('../db/mongoose.js');

router.get("/create/:name", function(inReq, inRes){
    db.getUser(inReq.Auth.ID)
    .then(function(inUser){
        return db.createProject(inUser, inReq.params.name);
    })
    .then(function(inResolveData){
        inRes.json(inResolveData);
    });
});

/*
router.post("/save-copy/:name", function(inReq, inRes){
    var creationResponse;
    db.getUser(inReq.Auth.ID)
    .then(function(inUser){
        return db.createProject(inUser, inReq.params.name);
    })
    .then(function(inResolveData){
        
        creationResponse = inResolveData;
        
        inUser.projects.id(inResolveData._id).remove();
        inUser.projects.push(inReq.body);
        return db.saveUser(inUser);
        
        inRes.json(creationResponse);
    }).then(function(inResolveData){
        
    });
});
*/

router.post("/save", function(inReq, inRes){

    db.getUser(inReq.Auth.ID)
    .then(function(inUser){
        inUser.projects.id(inReq.body._id).remove();
        inUser.projects.push(inReq.body);
        return db.saveUser(inUser);
    }, function(){

    })
    .then(function(inResolveData){
        inRes.json(inResolveData);
    }, function(inRejectData){
        console.log(inRejectData);
    });
});

router.get("/load/:id", function(inReq, inRes){
    
    console.log("load called for", inReq.params.id);
    
    db.getUser(inReq.Auth.ID)
    .then(function(inUser){
        inRes.json(inUser.projects.id(inReq.params.id));
    }, function(inError){
        console.log(inError);
    });
});

router.get("/delete/:id", function(inReq, inRes){
    
    var match;
    var deletedProfile = {};
    
    db.getUser(inReq.Auth.ID)
    .then(function(inUser){
        match = inUser.projects.id(inReq.params.id);
        deletedProfile = match.profile;
        match.remove();
        return db.saveUser(inUser);
    })
    .then(function(inResolveData){
            inRes.json(deletedProfile);
        }, function(inRejectData){
            inRes.json(inRejectData);
    });
});

module.exports = router;