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
        
        contents = inCSV.split("\n");
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
                human:[true, false, true, false, false],
                machine:[0, 0, 0, 0, 0]
            });
        }
        
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
        saveFile.state.matricies.push(MxN(saveFile.state.headers.length, 500));
        saveFile.state.matricies.push(MxN(500, 20));
        saveFile.state.matricies.push(MxN(20, saveFile.state.labels[0].machine.length));
        
        console.log(saveFile.state);
        
        /*
        //remap numbers based on min/max values
        for(i=0; i<table.body.length; i++){
            var row = table.body[i];
            
            for(j=0; j<row.data.length; j++){
                column = table.head[j];
                cell = row.data[j];
                cell.mapped = (cell.mapped - column.min)/(column.max - column.min)*2 - 1;
            }
        }
        */
    };
    
    //push saveFile.state up to mongo
    saveFile.methods.load = function(){
        inHTTP({method:'GET', url:'/api/load/'+ saveFile.state._id, headers:{'Authorization':document.cookie}})
        .then(function(inData){
            console.log("this is what was loaded", inData.data);
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
    
    //create NN.Network and NN.TrainingSet from saveFile.State
    saveFile.methods.prep = function(){
        var i, j;
        var row, data;
        
        saveFile.job.training = NN.TrainingSet.Create();
        for(i=0; i<saveFile.state.labels.length; i++){
            row = saveFile.state.data[i];
            data = [];
            for(j=0; j<row.length; j++){
                column = saveFile.state.headers[j];
                data[j] = (row[j] - column.min)/(column.max - column.min)*2 - 1;
            }
            NN.TrainingSet.AddPoint(saveFile.job.training, saveFile.state.labels[i].human, data);
        }
        
        saveFile.job.network = NN.Network.Create(1, 1, 1, 1);
        for(i=0; i<saveFile.state.matricies.length; i++){
            saveFile.job.network.Layers[i].Forward.Matrix = saveFile.state.matricies[i];
            saveFile.job.network.Layers[i].Backward.Matrix = M.Transpose(saveFile.state.matricies[i]);
        }
    };
    
    //move the *observation* results from NN.Network to saveFile.State
    saveFile.methods.done = function(){
        
    };
    
    saveFile.methods.init = function(inID){
        saveFile.state._id = inID;
        saveFile.methods.load();
    }
    
    saveFile.state = {
        _id:0,
        profile:{},
        headers:{},
        data:{},
        labels:{},
        matricies:{}
    };
    
    saveFile.job = {
        network:{},
        training:{},
        iterations:500
    };
    
    console.log("returning savefile", saveFile);
    return saveFile;
}]);

App.factory("FactoryWebWorker", ["FactorySaveFile", function(inFactorySaveFile){
    var worker = {};
    
    worker.thread = new Worker('/static/worker.js');
    worker.thread.addEventListener('message', function(e) {
        switch(e.data.type){
            case "progress":
                console.log(e.data);
                break;
            case "done":
                console.log("network:", e.data.network);
                inScope.neuralNetwork = e.data.network;
                inScope.observe();
                break;
        }
    }, false);
    
    worker.methods = {};
    worker.methods.start = function(inJob){
        worker.methods.stop();
        worker.thread.postMessage(inJob);
    };
    worker.methods.stop = function(){
        worker.thread.terminate();
    };
    
    return worker;
}]);

App.config(["$interpolateProvider", function(inInterpolate){
    inInterpolate.startSymbol('{[{').endSymbol('}]}');
}]);


App.controller("Controller", ["$scope", "$http", "FactorySaveFile", function(inScope, inHTTP, inFactorySaveFile){
    
    inScope.saveFile = inFactorySaveFile;
    
    /*
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
    inScope.neuralNetwork = {};
    inScope.trainingSet = {};
    inScope.prepare = function(){
        var ts;
        var i, j;
        var row;
        var label, data, sum;
        var job;
        
        inScope.neuralNetwork = NN.Network.Create(inScope.project.training.head.length, 300, 20, 4);
        
        inScope.trainingSet = NN.TrainingSet.Create();
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
            
            NN.TrainingSet.AddPoint(inScope.trainingSet, label, data);
        }
        
        
        
        console.log("prepare complete", inScope);
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
                    inScope.neuralNetwork = e.data.network;
                    inScope.observe();
                    break;
            }
        }, false);
        
        worker.postMessage({
            network: inScope.neuralNetwork,
            training: inScope.trainingSet,
            iterations: 500
        });
    };
    
    inScope.observe = function(){
        var i, j;
        var body = inScope.project.training.body;
        var row;
        var batch;
        var observations;
        
        batch = [];
        for(i=0; i<body.length; i++){
            row = [];
            for(j=0; j<body[i].data.length; j++){
                row.push(parseFloat(body[i].data[j].mapped) || 0);
            }
            batch.push(row);
        }
        
        observations = NN.Network.Observe(inScope.neuralNetwork, batch);
        
        for(i=0; i<body.length; i++){
            body[i].label.machine = observations[i];
        }
        inScope.$apply();
    }
    */
    
}]);