require('dotenv').config();
var db = require('./db/mongoose.js');

db.getOverview("10206393212062648").then(function(inResolve){
    console.log("in resolve:", inResolve);
}, function(inReject){
    console.log("in reject:", inReject);
});