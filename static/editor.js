var App;
App = angular.module("Application", []);
App.directive("projectId", ["$parse", function(inParser){
    return {
        link: function(inScope, inElement, inAttributes){
            
            var id = inAttributes.value
            inParser(inAttributes.projectId).assign(inScope, id);
            inScope.download();
            
        }  
    };
}])
App.directive("importCsv", ["$parse", function(inParser){
    
    console.log("bound!");
    
    return{
        link : function(inScope, inElement, inAttributes){

            function handlerEnter(inEvent){
                if(inEvent){
                    inEvent.preventDefault();
                }
                inElement.addClass("Import");
                inEvent.dataTransfer.effectAllowed = 'copy';
                return false;
            }
            
            function handlerDrop(inEvent){
                inElement.removeClass("Import");
                if(inEvent){
                    inEvent.preventDefault();
                }
                parse(event.dataTransfer.files[0]);
                return false;
            }
            
            function parse(inFile){
                var parser = new FileReader();
                parser.onload = function(inEvent){
                    
                    var i, j;
                    var contents;
                    var table;
                    var row;
                    var limit;
                    
                    contents = inEvent.target.result.split("\n");
                    contents.pop();
                    limit = contents.length-1;
                    if(limit > 100){
                        
                        alert(limit + " is too many rows. reducing to the first 100");
                        
                        limit = 100;
                    }
                    
                    table = {};
                    table.head = contents[0].split(",");
                    var label;
                    for(i=0; i<table.head.length; i++){
                        label = table.head[i];
                        table.head[i] = {
                            active:true,
                            label:label,
                            min:9999999999,
                            max:-9999999999,
                            map:{}
                        };
                    }
                    
                    
                    table.body = [];

                    for(i=1; i<limit; i++){
                        row = {};
                        row.data = [];
                        row.data = contents[i].split(",");
                        for(j=0; j<row.data.length; j++){
                            row.data[j] = parseFloat(row.data[j]) || 0;
                        }
                        row.label = {
                            human : [false, false, false, false],
                            machine : [0, 0, 0, 0]
                        };
                        table.body.push(row);
                    }
                    
                    
                    inScope.$apply(function(){
                        inParser(inAttributes.importCsv).assign(inScope, table);
                        
                        console.log(table);
                        
                    })
                    
                    
                };
                parser.readAsText(inFile);
                
            }
            
            function handlerLeave(){
                inElement.removeClass("Import");
            }
            
            inElement.on("dragenter dragstart dragend dragleave dragover drag drop", function (inEvent) {inEvent.preventDefault();});
            inElement.on('dragenter', handlerEnter);
            inElement.on('dragleave', handlerLeave);
            inElement.on('drop', handlerDrop);
        }
    };
    
}]);

App.factory("FactoryProject", [function(){
    return {
        _id:"default",
        profile:{
            name:"project is downloading"
        },
        training:{
            head:[{
                active:true,
                label:"column header one",
                min:0,
                max:10,
                map:{}
            }],
            body:[{
                data:[0.123],
                label:{human:[0, 0, 0], machine:[0, 0, 0]}
            }]
        },
        network:[]
    }
}]);

/*
App.config(["$httpProvider", function (inHTTP) {
    inHTTP.defaults.withCredentials = true;
}]);
*/

App.controller("Controller", ["$scope", "$http", "FactoryProject", function(inScope, inHTTP, inFactoryProject){
    
    inScope.upload = function(){
        
        console.log("upload called");
        
        inHTTP({method:'POST', url:'/api/save', headers:{'Authorization':document.cookie}, data:inScope.project}).then(function(){
            alert("upload done");
        }, function(inData){
            console.log("upload ERROR", inData);
        });
    };
    
    inScope.download = function(){
        console.log("download called");
        
        inHTTP({method:'GET', url:'/api/load/'+inScope.project._id, headers:{'Authorization':document.cookie}}).then(function(inData){
            inScope.project = inData.data;
            console.log("downloaded data", inData);
        }, function(inData){
            console.log("download ERROR", inData);
        });
    }
    
    inScope.project = inFactoryProject;
    
    console.log("id is", inScope.project._id);
    
}]);