var express = require('express');
var router = express.Router();
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

router.use(function(inReq, inRes, inNext){
	var cookies;
    var i;
    var split, key, value;
	cookies = inReq.headers.cookie;
	inReq.Cookies = {};
	if(cookies){
		cookies = cookies.split("; ");
		for(i=0; i<cookies.length; i++){
			split = cookies[i].indexOf("=");
			key = cookies[i].substring(0, split);
			value = cookies[i].substring(split+1);
			inReq.Cookies[key] = value;
		}
	}
	inNext();
});
router.use(function(inReq, inRes, inNext){
	inReq.Auth = {};
	inReq.Auth.LogIn = function(inID){
		inRes.cookie(Auth.Config.KeyID, inID);
		inRes.cookie(Auth.Config.KeyIDHash, Auth.Sign(inID));
	};
	inReq.Auth.LogOut = function(){
		inRes.clearCookie(Auth.Config.KeyID);
		inRes.clearCookie(Auth.Config.KeyIDHash);
	};
	inReq.Auth.ID = inReq.Cookies[Auth.Config.KeyID];
	inReq.Auth.IDHash = inReq.Cookies[Auth.Config.KeyIDHash];
	if(inReq.Auth.ID === undefined || inReq.Auth.IDHash === undefined){
		inReq.Auth.LoggedIn = false;
	}else{
		inReq.Auth.LoggedIn = Auth.Verify(inReq.Auth.ID, inReq.Auth.IDHash);
	}
	inNext();
});

module.exports = router;