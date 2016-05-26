var mongoose = require('mongoose');

var Project = new mongoose.Schema({
    profile:{
        name:String,
    },
    headers:[],
    data:[],
    labels:[],
    matricies:[],
    training:{},
    shape:[]
});

var User = new mongoose.Schema({
    profile:{
        name:String,
        id:String
    },
    projects:[Project]
});

exports.Project = mongoose.model("Project", Project);
exports.User = mongoose.model("User", User);