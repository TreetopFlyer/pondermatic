var mongoose = require('mongoose');
var env = require('../environment.js');
var config = require('./config');
var models = require('./models.js');

var UserClass = models.User;
var ProjectClass = models.Project;

console.log(config[env]);
mongoose.connect(config[env]);

var db = {};
db.createUser = function(inName, inID){
    return new Promise(function(inResolve, inReject){
        var user = new UserClass();
        user.profile = {name:inName, id:inID};
        user.save(function(inError){
            if(!inError){
                inResolve(user);
            }else{
                inReject(inError);
            }
        })
    });
};

db.getUser = function(inID){
    return new Promise(function(inResolve, inReject){
        UserClass.findOne({"profile.id":inID}, function(inError, inUser){
            if(!inError && inUser){
                inResolve(inUser);
            }else{
                inReject({error:"user not found"});
            }
        });
    });
};

db.saveUser = function(inUserObject){
    return new Promise(function(inResolve, inReject){
        inUserObject.save(function(inError){
            if(!inError){
                inResolve(inUserObject);
            }else{
                inReject(inError);
            }
        });
    });
};

// this method is strange. there is overlap with db.saveUser
db.createProject = function(inUserObject, inName){
    return new Promise(function(inResolve, inReject){
        var project = new ProjectClass();
        project.profile = {name:inName};
        inUserObject.projects.push(project);
        inUserObject.save(function(inError){
            if(!inError){
                inResolve(project);
            }else{
                inReject(inError);
            }
        });
    });
};

db.getOverview = function(inUserID){
    return new Promise(function(inResolve, inReject){
        UserClass.findOne({"profile.id":inUserID})
        .select({"profile":1, "projects.profile":1, "projects._id":1})
        .exec(function(inError, inUser){
            if(!inError){
                inResolve(inUser);
            }else{
                inReject(inError);
            }
        });
    });
};

module.exports = db;