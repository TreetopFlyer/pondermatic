var express = require('express');
var router = express.Router();
var db = require('../db/mongoose.js');
var unirest = require('unirest');

// unirest GET requst as a promise
var GETPromise = function(inURL, inQuery){
    return new Promise(function(inResolve, inReject){
        unirest.get(inURL).query(inQuery).end(inResolve);
    });
}

router.get("/logout-fb", function(inReq, inRes){
    inReq.Auth.LogOut();
    inRes.redirect("/");
});

router.get("/login-fb", function(inReq, inRes){
    
    var code, error;
    var profile;

    // redirect people trying to log in that have already logged in
    if(inReq.Auth.LoggedIn){
        console.log("already logged in");
        console.log(inReq.Cookies);
        inRes.redirect("/profile");
        return;
    }
    
    code = inReq.query.code;
    error = inReq.query.error;
    profile = {};
    if(!code){
        //// redirect to oauth dialogue
        var url = process.env.FB_API_OAUTH + "?client_id=" + process.env.FB_APP_ID + "&redirect_uri=" + process.env.FB_APP_URL
        console.log("starting oAuth", url);
        inRes.redirect(url);
        
    }else{
        console.log("code recieved, getting token");
        
        GETPromise(process.env.FB_API_TOKEN,{
            //// exchange code for token
            "client_id":process.env.FB_APP_ID,
            "client_secret":process.env.FB_APP_SECRET,
            "redirect_uri":process.env.FB_APP_URL,
            "code":code
            
        }).then(function(inResponse){
            //// get user profile with token
            console.log("access token recieved", inResponse.body.access_token, "getting profile")
            return GETPromise(process.env.FB_API_PROFILE, {
            "access_token":inResponse.body.access_token});
            
        }).then(function(inResponse){
            //// see if profile already exists...
            profile = JSON.parse(inResponse.body);
            console.log("profile recieved", profile);
            return db.getUser(profile.id);
            
        }).then(function(inResponse){
            //// ...if so, do login and show profile
            console.log("showing profile page", profile);
            inReq.Auth.LogIn(profile.id);
            inRes.redirect("/profile");
            
        }, function(inResponse){
            //// ...otherwise, create the profile...
            console.log("creating profile");
            return db.createUser(profile.name, profile.id);
            
        }).then(function(inResponse){
            //// ...and then login and show profile
            console.log("new profile was created. redirecting to profile page");
            inReq.Auth.LogIn(profile.id);
            inRes.redirect("/profile");
            
        });
    }
});

module.exports = router;