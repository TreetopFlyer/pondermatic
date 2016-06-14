var sha1 = require("sha1");

var Auth = {};
Auth.Config = {};
Auth.Config.HashSecret = process.env.FB_APP_SECRET
Auth.Config.KeyID = "Auth.ID";
Auth.Config.KeyIDHash = "Auth.IDHash";
Auth.Sign = function(inMessage){
	return sha1(Auth.Config.HashSecret + inMessage);
};
Auth.Verify = function(inMessage, inSignedMessage){
	if(Auth.Sign(inMessage) === inSignedMessage){
		return true;
	}else{
		return false;
	}
};
Auth.Salt = function(inString){
    Auth.Config.HashSecret = inString;
	return Auth;
};

module.exports = Auth;