var App;
App = angular.module("Application", []).config(["$interpolateProvider", function(inInterpolate){
    inInterpolate.startSymbol('{[{').endSymbol('}]}');
}]);

App.directive("projectId", ["$parse", "FactorySaveFile", function(inParser, inFactorySaveFile){
    return {
        link: function(inScope, inElement, inAttributes){
            inFactorySaveFile.methods.init(inAttributes.projectId);
        }  
    };
}]);
App.directive("importCsv", ["$parse", "FactorySaveFile", function(inParser, inSaveFile){

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
                    inSaveFile.methods.parse(inEvent.target.result);
                    inScope.$apply();
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

// Core data structure for project. Has methods to load/save state to server, and send jobs to the web worker
App.factory("FactorySaveFile", ["$http", "FactoryNN", function(inHTTP, inFactoryNN){
    var saveFile = {};
    
    saveFile.methods = {};
    
    // populate saveFile.state with the contents of inCSV plus the matricies required to build the neural network
    saveFile.methods.parse = function(inCSV){
        var i, j;
        var contents;
        var table;
        var row;
        var limit;
        var column;
        var cell;
        
        contents = inCSV.split("\r");
        contents.pop();
        
        limit = contents.length-1;
        if(limit > 100){
            limit = 100;
            alert("limiting to the first 100 rows");
        }
        
        // build table headers
        var headers = [];
        saveFile.state.headers = [];
        headers = contents[0].split(",");
        for(i=0; i<headers.length; i++){
            saveFile.state.headers[i] = {
                active:true,
                label:headers[i],
                min:9999999999,
                max:-9999999999,
                map:[],
                uniques:0
            };
        }
        
        //build rows
        saveFile.state.data = [];
        saveFile.state.labels = [];
        for(i=1; i<limit; i++){
            
            row = contents[i].split(",");
            for(j=0; j<row.length; j++){
                
                var mapped, original, column;
                
                original = row[j];
                mapped = parseFloat(row[j]);
                column = saveFile.state.headers[j];
                
                // if this is a string
                if(isNaN(mapped)){
                    
                    // and the string isnt in the mapped list
                    if(!column.map[original]){
                        // add the key
                        mapped = column.uniques;
                        column.map[original] = column.uniques;
                        column.uniques++;
                    }else{
                        mapped = column.map[original];
                    }
                }
                
                if(column.min > mapped)
                    column.min = mapped;
                if(column.max < mapped)
                    column.max = mapped;
            }

            saveFile.state.data.push(row);
            saveFile.state.labels.push({
                human:[false, false, false, false, false],
                machine:[0, 0, 0, 0, 0]
            });
        }
        
        saveFile.methods.rebuildNetwork();
        saveFile.methods.trainingReset();
    };
    
    saveFile.methods.rebuildNetwork = function(){
        var structure;
        var current;
        structure = [saveFile.state.headers.length];
        for(var i=0; i<saveFile.state.shape.length; i++){
            current = saveFile.state.shape[i]
            if(saveFile.state.shape[i] > 0){
                structure.push(current);
            }
        }
        structure.push(saveFile.state.labels[0].machine.length);
        saveFile.state.matricies = inFactoryNN.buildMatricies(structure);
    };
    
    //push saveFile.state up to mongo
    saveFile.methods.load = function(){
        inHTTP({method:'GET', url:'/api/load/'+ saveFile.state._id, headers:{'Authorization':document.cookie}})
        .then(function(inData){
            saveFile.state = inData.data;
            if(!saveFile.state.shape || saveFile.state.shape.length == 0){
                saveFile.state.shape = [120, 50, 0, 0];
            }
        }, function(inData){console.log("download ERROR", inData);});
    };
    
    //pull saveFile.state down from mongo
    saveFile.methods.save = function(){
        inHTTP({method:'POST', url:'/api/save', headers:{'Authorization':document.cookie}, data:saveFile.state})
        .then(function(){
            alert("upload done");
        }, function(inData){console.log("upload ERROR", inData);});
    };
    
    saveFile.methods.init = function(inID){
        saveFile.state._id = inID;
        saveFile.methods.load();
    }
    
    saveFile.methods.getMappedRow = function(inIndex){
        var j;
        var row = saveFile.state.data[inIndex];
        var mapped = [];
        for(j=0; j<row.length; j++){
            column = saveFile.state.headers[j];
            mapped[j] = ((row[j] - column.min)/(column.max - column.min)*2 - 1) || 0;
        }
        return mapped;
    };
    
    saveFile.state = {
        _id:0,
        profile:{},
        headers:{},
        data:{},
        labels:{},
        matricies:{},
        training:{},
        shape:[1, 2, 3]
    };
    
    saveFile.methods.trainingUpdate = function(inIncrement, inError){
        saveFile.state.training.iterations += inIncrement;
        saveFile.state.training.error = inError;
    }
    saveFile.methods.trainingReset = function(){
        saveFile.state.training = {};
        saveFile.state.training.iterations = 0;
        saveFile.state.training.error = 0;
        saveFile.state.training.rate = 0.1;
    }
    saveFile.methods.trainingReset();
    
    return saveFile;
}]);

// Spawns threads for training neural networks
App.factory("FactoryWebWorker", ["FactorySaveFile", "FactoryNN", function(inFactorySaveFile, inFactoryNN){
    var worker = {};
    
    worker.job = {
        training:{},
        network:{},
        iterations:100
    };
    
    worker.handlers = {
        update:function(inEvent){},
        done:function(inEvent){}
    };
    
    worker.methods = {};
    worker.methods.prep = function(){
        var i, j;
        var row, label, data, sum;
        
        worker.job.training = NN.TrainingSet.Create();
        for(i=0; i<inFactorySaveFile.state.labels.length; i++){
            row = inFactorySaveFile.state.data[i];
            label = inFactorySaveFile.state.labels[i].human;
            sum = 0;
            for(j=0; j<label.length; j++){
                sum += label[j];
            }
            if(sum == 0){
                continue;
            }

            NN.TrainingSet.AddPoint(worker.job.training, label, inFactorySaveFile.methods.getMappedRow(i));
        }
        worker.job.network = inFactoryNN.buildNetwork(inFactorySaveFile.state.matricies);
    };
    worker.methods.done = function(inNetwork){
        var i;
        var input, output;
        
        inFactorySaveFile.state.matricies = inFactoryNN.extractMatricies(inNetwork);
        
        for(i=0; i<inFactorySaveFile.state.data.length; i++){
            input = inFactorySaveFile.methods.getMappedRow(i);
            output = NN.Network.Observe(inNetwork, [input])[0];
            inFactorySaveFile.state.labels[i].machine = output;
        }
    };
    
    worker.methods.start = function(){
        worker.methods.stop();
        worker.thread = new Worker('/static/worker.js');
        worker.thread.addEventListener('message', function(e) {
            switch(e.data.type){
                case "progress":
                    worker.handlers.update(e.data);
                    break;
                case "done":
                    worker.methods.done(e.data.network);
                    worker.handlers.done(e.data);
                    break;
            }
        }, false);
        
        worker.methods.prep();
        worker.thread.postMessage(worker.job);
    };
    worker.methods.stop = function(){
        if(worker.thread){
            worker.thread.terminate();
        }
    };
    
    return worker;
}]);

// Abstracts several methods for creating and training neural networks with the NN library 
App.factory("FactoryNN", [function(){
    var interface = {};
    interface.buildMatrix = function(inIn, inOut){
        var min = [];
        var max = [];
        var i;
        
        inIn++;
        for(i=0; i<inIn; i++){
            min.push(-1);
            max.push(1);
        }
        return M.Box([min, max], inOut);
    };
    interface.buildMatricies = function(inArray){
        var matricies = [];
        for(var i=0; i<inArray.length-1; i++){
            matricies.push(interface.buildMatrix(inArray[i], inArray[i+1]));
        }
        return matricies;
    };
    interface.extractMatricies = function(inNetwork){
        var output = [];
        
        for(var i=0; i<inNetwork.Layers.length; i++){
            output.push(inNetwork.Layers[i].Forward.Matrix);
        }
        
        return output;
    };
    interface.buildNetwork = function(inMatricies){
        var net = {};
        net.Layers = [];
        net.LearningRate = 0.1;
        net.Error = [];
        
        var layer;
        for(i=0; i<inMatricies.length; i++){
            layer = {};
            
            layer.Forward = {};
            layer.Forward.Matrix = M.Clone(inMatricies[i]);
            layer.Forward.StageInput = [];
            layer.Forward.StageAffine = [];
            layer.Forward.StageSigmoid = [];
            layer.Forward.StageDerivative = [];
            
            layer.Backward = {};
            layer.Backward.Matrix = M.Transpose(layer.Forward.Matrix);
            layer.Backward.StageInput = [];
            layer.Backward.StageDerivative = [];
            layer.Backward.StageAffine = [];
            
            net.Layers.push(layer);
        }
        return net;
    };
    return interface;
}]);

App.controller("Controller", ["$scope", "FactorySaveFile", "FactoryWebWorker", function(inScope, inFactorySaveFile, inFactoryWebWorker){
    
    inScope.arr = [120, 50, 0, 0];
    
    inScope.saveFile = inFactorySaveFile;
    
    inScope.clickLabel = function(i, j){
        inScope.saveFile.state.labels[i].human[j] = ! inScope.saveFile.state.labels[i].human[j];
    };
    inScope.clickReset = function(){
        inScope.saveFile.methods.rebuildNetwork();
        inScope.saveFile.methods.trainingReset();
    }
    inScope.handlerUpdate = function(inEvent){
        inScope.saveFile.methods.trainingUpdate(inEvent.stride, inEvent.error);
        inScope.$apply();
        console.log("update", inEvent);
    };
    inScope.handlerDone = function(inEvent){
        console.log("done", inEvent);
        inScope.$apply();
    };
    
    inScope.webWorker = inFactoryWebWorker;
    inScope.webWorker.handlers.update = inScope.handlerUpdate;
    inScope.webWorker.handlers.done = inScope.handlerDone;
    
    inScope.traceState = function(){
        console.log(inScope.saveFile.state);  
    };
    inScope.traceWorker = function(){
        console.log(inScope.webWorker.job); 
    };
    
}]);