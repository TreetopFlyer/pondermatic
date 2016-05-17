var unirest = require('unirest');

var neo4j = {};
neo4j.config = {
    username:process.env.DB_ACCESS_USERNAME,
    password:process.env.DB_ACCESS_PASSWORD,
    endpoint:process.env.DB_ACCESS_ENDPOINT
};
neo4j.headers = {
    'Authorization': 'Basic ' + new Buffer(neo4j.config.username+':'+neo4j.config.password).toString('base64'),
    'Content-Type': 'application/json'
}
neo4j.createUser = function(inName, inID){
    return new Promise(function(inResolve, inReject){
        unirest
        .post(neo4j.config.endpoint)
        .headers(neo4j.headers)
        .send({statements: [{statement:"create (u:User {id:\""+inID+"\", name:\""+inName+"\"}) return u"}]})
        .end(function(inResponse){
            if(inResponse.body.errors.length == 0){
                inResolve(inResponse.body.results);
            }else{
                inReject(inResponse.body.results);
            }
        });
    });
};
neo4j.getUser = function(inID){
    return new Promise(function(inResolve, inReject){
        unirest
        .post(neo4j.config.endpoint)
        .headers(neo4j.headers)
        .send({statements: [{statement:"match (u:User {id:\""+inID+"\"}) return u"}]})
        .end(function(inResponse){
            if(inResponse.body.errors.length == 0 && inResponse.body.results[0].data.length == 1){
                inResolve(inResponse.body.results[0].data[0].row[0]);
            }else{
                return inReject(inResponse.body.results);
            }
        });
    });
};

module.exports = neo4j;