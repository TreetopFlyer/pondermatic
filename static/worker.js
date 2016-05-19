importScripts(
  "http://treetopflyer.github.io/vcore/lib.js",
  "http://treetopflyer.github.io/NN/lib.js"
);

function error(inM){
  var sum = 0;
  var i, j;
  for(i=0; i<inM.length; i++){
    for(j=0; j<inM[i].length; j++){
      sum += Math.abs(inM[i][j]);
    }
  }
  return sum;
}

self.addEventListener('message', function(e) {
  var nn = e.data.network;
  var ts = e.data.training;
  var it = e.data.iterations;
  var i;
  var stride = 10;
  
  for(i=0; i<it; i+=stride){
    NN.Network.Batch(nn, ts, stride);
    self.postMessage({type:"progress", iteration:(i+stride), error:error(nn.Error)});
  }
  self.postMessage({type:"done", network:nn});
  
  
}, false);