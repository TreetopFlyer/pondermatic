require('dotenv').config();
var express = require('express');
var handlebars = require('express-handlebars');
var bodyParser = require('body-parser');
var authentication = require('./middleware/auth.js');

var login = require('./routes/login.js');
var api = require('./routes/api.js');
var profile = require('./routes/profile.js');
var editor = require('./routes/editor.js');

var server;
server = express();
server.engine('handlebars', handlebars({defaultLayout:'main'}));
server.set('view engine', 'handlebars');

server.use(bodyParser.json({limit:"50mb"}));
server.use(bodyParser.urlencoded({extended: true}));


/*
server.use( bodyParser.json({limit:1024*1024*20}) );
server.use( bodyParser.urlencoded({ extended:true,limit:1024*1024*20,type:'application/x-www-form-urlencoding' }) );
*/

server.use("/static", express.static(__dirname+"/static"));
server.use("/", authentication);
server.use("/", login);
server.use("/api", api);
server.use("/profile", profile);
server.use("/editor", editor);

server.get("/", function(inReq, inRes){
    inRes.render("home");
});

server.listen(80);