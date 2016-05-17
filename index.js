require('dotenv').config();
var express = require('express');
var handlebars = require('express-handlebars');
var authentication = require('./middleware/auth.js');
var login = require('./routes/login.js');
var server = express();

server.engine('handlebars', handlebars({defaultLayout:'main'}));
server.set('view engine', 'handlebars');

server.use("/static", express.static(__dirname+"/static"));
server.use("/", authentication);
server.use("/", login);

server.get("/", function(inReq, inRes){
    inRes.render("home");
});

server.listen(80);