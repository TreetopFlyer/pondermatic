var App;
App = angular.module("Application", []);
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

App.factory("FactoryTraining", [function(){
    var training = {};
    
    training.iterations = 0;
    training.error = 0;
    
    return training;
}]);

App.factory("FactorySaveFile", ["$http", function(inHTTP){
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
        function MxN(inIn, inOut){
            var min = [];
            var max = [];
            var i;
            
            inIn++;
            for(i=0; i<inIn; i++)
            {
                min.push(-1);
                max.push(1);
            }
            return M.Box([min, max], inOut);
        }
        
        saveFile.state.matricies = [];
        saveFile.state.matricies.push(MxN(saveFile.state.headers.length, 100));
        saveFile.state.matricies.push(MxN(100, 50));
        saveFile.state.matricies.push(MxN(50, 10));
        saveFile.state.matricies.push(MxN(10, saveFile.state.labels[0].machine.length));
    };
    
    //push saveFile.state up to mongo
    saveFile.methods.load = function(){
        inHTTP({method:'GET', url:'/api/load/'+ saveFile.state._id, headers:{'Authorization':document.cookie}})
        .then(function(inData){
            saveFile.state = inData.data;
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
    }
    
    saveFile.state = {
        _id:0,
        profile:{},
        headers:{},
        data:{},
        labels:{},
        matricies:{},
        training:{}
    };
    
    saveFile.methods.trainingUpdate = function(inIncrement, inError){
        saveFile.state.training.iterations += inIncrement;
        saveFile.state.training.error = inError;
    }
    saveFile.methods.trainingReset = function(){
        saveFile.state.training = {};
        saveFile.state.training.iterations = 0;
        saveFile.state.training.error = 0;
    }
    saveFile.methods.trainingReset();
    
    return saveFile;
}]);

App.factory("FactoryWebWorker", ["FactorySaveFile", function(inFactorySaveFile){
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
            data;
            sum = 0;
            for(j=0; j<label.length; j++){
                sum += label[j];
            }
            if(sum == 0){
                continue;
            }

            NN.TrainingSet.AddPoint(worker.job.training, label, inFactorySaveFile.methods.getMappedRow(i));
        }
        
        worker.job.network = NN.Network.Create(1, 1, 1, 1, 1);
        for(i=0; i<inFactorySaveFile.state.matricies.length; i++){
            worker.job.network.Layers[i].Forward.Matrix = inFactorySaveFile.state.matricies[i];
            worker.job.network.Layers[i].Backward.Matrix = M.Transpose(inFactorySaveFile.state.matricies[i]);
        }
        
        console.log(worker.job);
    };
    worker.methods.done = function(inNetwork){
        var i;
        var input, output;
        
        inFactorySaveFile.state.matricies = [];
        for(i=0; i<inNetwork.Layers.length; i++){
            inFactorySaveFile.state.matricies[i] = inNetwork.Layers[i].Forward.Matrix;
        }
        
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

App.config(["$interpolateProvider", function(inInterpolate){
    inInterpolate.startSymbol('{[{').endSymbol('}]}');
}]);


App.controller("Controller", ["$scope", "FactorySaveFile", "FactoryWebWorker", function(inScope, inFactorySaveFile, inFactoryWebWorker){
    
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