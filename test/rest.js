var chai = require('chai');
var chaiHTTP = require('chai-http');
var models = require('../db/models.js');
var db = require('../db/mongoose.js');
var Auth = require('../classes/auth.js');
var expressErver = require('../index.js');

chai.should();
chai.use(chaiHTTP);

var testName = "Test User";
var testID = 123;
var testCredentials = "";


describe("REST API", function(){

    before(function(){

        // faking authentication
        testCredentials = Auth.Config.KeyID + "=" + testID + "; " + Auth.Config.KeyIDHash + "=" + Auth.Sign(testID);
        console.log("test credentials are:", testCredentials);

        // faking a user
        models.User.remove({})
        .then(function(){
            console.log("testing cleanup called");
            return db.createUser(testName, testID);
        },
        function(inError){
            console.log("error in test cleanup:", inError);
        })
        .then(function(inUser){
            console.log("test user created");
        }, 
        function(inError){
            console.log("error creating test user");
        });

    });

    describe("Create", function(){

        it("Should create a project on POST", function(inDone){
            chai
            .request(expressErver)
            .post('/api/test-project')
            .set('Authorization', testCredentials)
            .end(function(inError, inResponse){
                console.log(inResponse);
                inDone();
            });
        }); 

    });

    describe("Update", function(){

        it("Should save the project on UPDATE", function(){

        });

    });

    describe("Delete", function(){

        it("Should save the project on UPDATE", function(){

        });

    });

    describe("Read", function(){
        it("Should load the project on GET", function(){

        });
    });

});