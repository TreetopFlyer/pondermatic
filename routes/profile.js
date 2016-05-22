var express = require('express');
var router = express.Router();
var db = require('../db/mongoose.js');


router.get("/", function(inReq, inRes){
    
    if(!inReq.Auth.LoggedIn){
        inRes.redirect("/login-fb");
        return;
    }
    
    db.getOverview(inReq.Auth.ID).then(
    function(inResolveData){
        console.log("profile found in db:", inResolveData);
        inRes.render("profile", inResolveData);
    }, function(inRejectData){
        console.log("error obtaining profile", inRejectData);
        inRes.redirect("/");
    });
    
});

router.post("/", function(inReq, inRes){
    if(inReq.body.verb == "create")
    {
        db.getUser(inReq.Auth.ID)
        .then(function(inUser){
            return db.createProject(inUser, inReq.body.name);
        }, function(inUserError){
            console.log("error getting user", inReq.Auth.ID);
        })
        .then(function(){
            return db.getOverview(inReq.Auth.ID);
        }, function(){
            console.log("error creating project", inReq.body.name);
        })
        .then(function(inOverview){
            inRes.render("profile", inOverview);
        }, function(inError){
            console.log("error creating overview", inError);
        });
        
    } else if(inReq.body.verb == "delete"){
        db.getUser(inReq.Auth.ID)
        .then(function(inUser){
            match = inUser.projects.id(inReq.body.id);
            deletedProfile = match.profile;
            match.remove();
            return db.saveUser(inUser);
        })
        .then(function(){
            return db.getOverview(inReq.Auth.ID);
        }, function(){
            console.log("error creating project", inReq.body.name);
        })
        .then(function(inOverview){
            inRes.render("profile", inOverview);
        }, function(inError){
            console.log("error creating overview", inError);
        });
        
    }
});

module.exports = router;