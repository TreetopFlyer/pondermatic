require('dotenv').config();
var db = require('./db/mongoose.js');

var id, name;

id = "123";
name = "Tester";

/*
db.getUser(id).then(
    function(inResolveData){
        console.log("user found", inResolveData);
        
    },
    function(inRejectData){
        console.log("user NOT found", inRejectData);
        return db.createUser(name, id);
}).then(
    function(inResolveData){
        console.log("user created", inResolveData);
        return db.createProject(inResolveData, "a project");
    }, function(inRejectData){
        console.log("user was NOT created", inRejectData);
}).then(
    function(inResolveData){
        console.log("project created", inResolveData);
    }, function(inRejectData){
        console.log("error creating project", inRejectData);
});
*/


db.getUser("10206393212062648").then(function(inResolveObject){
    console.log(inResolveObject);
    return db.createProject(inResolveObject, "anotha one");
}).then(function(inResolveObject){
    console.log("project created");
}, function(inRejectObject){
    console.log("failed to create project", inRejectObject);
});

/*
db.listProjects("10206393212062648").then(function(inResolveObject){
    console.log(inResolveObject);
});
*/


