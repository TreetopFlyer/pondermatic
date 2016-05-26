var chai = require('chai');
var chaiHTTP = require('chai-http');
var models = require('../db/models.js');

var db = require('../db/mongoose.js');
chai.should();
chai.use(chaiHTTP);


function verifyUser(inUser, inName, inID){
    inUser.should.be.an("object");
    inUser.profile.should.be.an("object");
    inUser.profile.name.should.equal(inName);
    inUser.profile.id.should.equal(inID);
    
    inUser.projects.should.be.an("array");
}

describe("User capabilities", function(){
    
    before(function(){
        models.User.remove({}).then(function(inSuccess){
            console.log("wipeout success");
        }, function(inFailure){
            console.log("wipeout failure");
        });
    });
    
    describe("User CRUD", function(){
        
        it("should create a user given a name and id", function(){
            return db.createUser("test user", "123")
            .then(function(inUser){
                verifyUser(inUser, "test user", "123");
            }, function(inError){
                throw inError;
            });
        });
        
        it("should retrieve a user given their id", function(){
            return db.getUser("123")
            .then(function(inUser){
                verifyUser(inUser, "test user", "123");
            }, function(inError){
                throw inError;
            });
        });
        
        it("should save changes to the user", function(){
            return db.getUser("123")
            .then(function(inUser){
                inUser.profile.name = "test user modified";
                return db.saveUser(inUser);
            }, function(inError){
                throw inError;
            })
            .then(function(inUser){
                return db.getUser("123");
            }, function(inError){
                throw inError;
            })
            .then(function(inUser){
                verifyUser(inUser, "test user modified", "123");
            }, function(inError){
                throw inError;
            });
        });
        
        it("should create a project given a name", function(){
           return db.getUser("123").then(function(inUser){
               return db.createProject(inUser, "test project");
           }, function(inError){
               throw inError;
           })
           .then(function(inProject){
               inProject.profile.name.should.equal("test project");
           }, function(inError){
               throw inError;
           });
        });
        
    })
    

    
})