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
                    var column;
                    var cell;
                    
                    contents = inEvent.target.result.split("\n");
                    contents.pop();
                    limit = contents.length-1;
                    if(limit > 100){
                        limit = 100;
                        alert("limiting to the first 100 rows")
                    }
                    
                    // build table headers
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
                            map:[],
                            uniques:[]
                        };
                    }
                    
                    //build rows
                    table.body = [];
                    for(i=1; i<limit; i++){
                        row = {};
                        row.data = [];
                        row.data = contents[i].split(",");
                        for(j=0; j<row.data.length; j++){
                            
                            cell = {};
                            
                            cell.original = row.data[j];
                            cell.mapped = parseFloat(row.data[j]);
                            column = table.head[j];
                            
                            // if this is a string
                            if(isNaN(cell.mapped)){
                                
                                // and the string isnt in the mapped list
                                if(!column.map[cell.original]){
                                    
                                    // add the key
                                    column.uniques.push(cell.original);
                                    column.map[cell.original] = column.uniques.length;
                                }
                                
                                cell.mapped = column.map[cell.original];
                                
                            }
                            
                            if(column.min > cell.mapped)
                                column.min = cell.mapped;
                            if(column.max < cell.mapped)
                                column.max = cell.mapped;
                            
                            row.data[j] = cell;
                        }
                        row.label = {
                            human : [false, false, false, false],
                            machine : [0, 0, 0, 0]
                        };
                        table.body.push(row);
                    }
                    
                    //remap numbers based on min/max values
                    for(i=0; i<table.body.length; i++){
                        var row = table.body[i];
                        
                        for(j=0; j<row.data.length; j++){
                            column = table.head[j];
                            cell = row.data[j];
                            cell.mapped = (cell.mapped - column.min)/(column.max - column.min)*2 - 1;
                        }
                    }

                    // push into model
                    inScope.$apply(function(){
                        inScope.project.training = table;
                    });
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

App.config(["$interpolateProvider", function(inInterpolate){
    inInterpolate.startSymbol('{[{').endSymbol('}]}');
}]);


App.controller("Controller", ["$scope", "$http", function(inScope, inHTTP){
    
    inScope.upload = function(){
        inHTTP({method:'POST', url:'/api/save', headers:{'Authorization':document.cookie}, data:inScope.project}).then(function(){
            alert("upload done");
        }, function(inData){
            console.log("upload ERROR", inData);
        });
    };
    
    inScope.download = function(){
        inHTTP({method:'GET', url:'/api/load/'+inScope.project._id, headers:{'Authorization':document.cookie}}).then(function(inData){
            if(inData.data){
                inScope.project = inData.data;
            }
        }, function(inData){
            console.log("download ERROR", inData);
        });
    }
    
    inScope.project = {};
    
    inScope.trainingSet = {};
    inScope.prepare = function(){
        var ts;
        var i, j;
        var row;
        var label, data, sum;
        var job;
        
        inScope.project.network = NN.Network.Create(inScope.project.training.head.length, 300, 20, 4);
        
        ts = NN.TrainingSet.Create();
        for(i=0; i<inScope.project.training.body.length; i++){
            row = inScope.project.training.body[i];
            
            sum = 0;
            label = row.label.human;
            for(j=0; j<label.length; j++){
                sum += label[j];
            }
            if(sum == 0){
                continue;
            }
            
            data = [];
            for(j=0; j<row.data.length; j++){
                data.push(parseFloat(row.data[j].mapped) || 0);
            }
            
            NN.TrainingSet.AddPoint(ts, label, data);
        }
        
        inScope.trainingSet = ts;
        console.log("prepare complete");
    };
    
    inScope.train = function(){
        
        
        var worker = new Worker('/static/worker.js');
        worker.addEventListener('message', function(e) {
            switch(e.data.type){
                case "progress":
                    console.log(e.data);
                    break;
                case "done":
                    console.log("network:", e.data.network);
                    inScope.project.network = e.data.network;
                    break;
            }
        }, false);
        
        worker.postMessage({
            network: inScope.project.network,
            training: inScope.trainingSet,
            iterations: 50
        });
        
        console.log("training started");
    };
    
}]);