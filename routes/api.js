var express = require('express');
var router = express.Router();
var db = require('../db/mongoose.js');

router.get("/create", function(inReq, inRes){
    db.getUser(inReq.Auth.ID).then(function(inResolveData){
        return db.createProject(inResolveData, "that proj");
    }).then(function(inResolveData){
        inRes.json(inResolveData);
    });
});

router.get("/save", function(inReq, inRes){

});

router.get("/load", function(inReq, inRes){

});


module.exports = router;