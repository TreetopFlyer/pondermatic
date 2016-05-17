importScripts(
  "http://treetopflyer.github.io/vcore/lib.js",
  "http://treetopflyer.github.io/NN/lib.js"
);

function error(inM){
  var sum = 0;
  var i, j;
  for(i=0; i<inM.length; i++){
    for(j=0; j<inM[i].length; j++){
      sum += inM[i][j];
    }
  }
  return sum;
}

self.addEventListener('message', function(e) {
  var nn = e.data.network
  var ts = e.data.training
  
  var i;
  for(i=0; i<e.data.iterations; i+=10){
    NN.Network.Batch(nn, ts, 10);
    self.postMessage({type:"progress", iteration:(i+10), error:error(nn.Error)});
  }
  self.postMessage({type:"done", network:nn});
  
  
}, false);