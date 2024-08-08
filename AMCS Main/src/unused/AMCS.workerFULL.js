import {findRBN, findRBN2, computeDiagonalLength,computeBounds,createLineSegmentKDTree, findKNearestNeighbors, processSegments, distance3D } from './knnHelper';
function rearrangeMatrix2(matrix) {
  // Validate the input is a square matrix
  const size = matrix.length;
  for (const row of matrix) {
    if (row.length !== size) {
      throw new Error("The input matrix must be square and symmetric.");
    }
  }

  // Compute the sum of each row excluding the diagonal element
  const rowSums = matrix.map((row, i) => {
    return row.reduce((sum, value, j) => {
      return sum + (i !== j && isFinite(value) ? value : 0);
    }, 0);
  });

  // Create an array of row indexes
  const rowIndexes = Array.from({ length: size }, (_, i) => i);

  // Sort the row indexes based on the row sums
  rowIndexes.sort((a, b) => rowSums[b] - rowSums[a]);

  return rowIndexes;
}

function rearrangeMatrix(matrix) {
  // Validate the input is a square matrix
  const size = matrix.length;
  for (const row of matrix) {
    if (row.length !== size) {
      throw new Error("The input matrix must be square and symmetric.");
    }
  }

  // Compute the distance of each row from the diagonal element
  const rowDistances = matrix.map((row, i) => {
    return row.reduce((distance, value, j) => {
      return distance + Math.abs(i - j) * value;
    }, 0);
  });

  // Create an array of row indexes
  const rowIndexes = Array.from({ length: size }, (_, i) => i);

  // Sort the row indexes based on the row distances
  rowIndexes.sort((a, b) => rowDistances[a] - rowDistances[b]);

  return rowIndexes;
}


function nestedArraysAreEqual(array1, array2) {
  if (array1.length !== array2.length) {
      return false;
  }

  for (let i = 0; i < array1.length; i++) {
      // Check if elements are arrays
      if (!Array.isArray(array1[i]) || !Array.isArray(array2[i])) {
          return false;
      }

      // Check if nested arrays are equal
      if (!arraysAreEqual(array1[i], array2[i])) {
          return false;
      }
  }

  return true;
}

function arraysAreEqual(array1, array2) {
  if (array1.length !== array2.length) {
      return false;
  }

  for (let i = 0; i < array1.length; i++) {
      if (array1[i] !== array2[i]) {
          return false;
      }
  }

  return true;
}


self.addEventListener('message', (event) => {
  console.log("worker started")
    let {doSort, param, segments2, algorithm, distanceMetric, exclude,streamlines2,sortType} = event.data;
    console.log("ex: ", exclude);
    let streamlines = streamlines2;
    let segments = segments2;
    if (doSort)
      streamlines.map(sl => {
        sl.push(0)
        return sl;
      });

    let lineSegments = processSegments(segments);
   
      let KR = Number(param);
      if (algorithm=='RBN'){
        const bounds = computeBounds(lineSegments);
        KR = KR * computeDiagonalLength(bounds);
      }
      let tgraph = [];
      let dgraph = [];

      let minDist = 10000, maxDist = 0;

      let lastProgress = 0;
      let pixels = [];
      let tree = createLineSegmentKDTree(lineSegments);
      let tree2 = createLineSegmentKDTree(lineSegments);

      let sum,sumSquared;
      const matrix = Array(streamlines.length).fill().map(() => Array(streamlines.length).fill(0));

      for (let i=0; i <  lineSegments.length; i++){
        //for (let i=0; i <  2; i++){
        const segment = lineSegments[i];
        const fun = (algorithm=='RBN')? findRBN2:findKNearestNeighbors;
        
        let funRes = fun(tree, segment, lineSegments, KR,distanceMetric);
        let neighbors = funRes[0];

        const probability = 0.01;
        if (Math.random() < probability){
          let funRes2 = fun(tree2, segment, lineSegments, KR,distanceMetric);
          let neighbors2 = funRes2[0];

          /*if (!arraysAreEqual(neighbors,neighbors2)){
            console.log("CONSISTENCY CHECK FAILED!!!");
            //console.log(neighbors, neighbors2)
          }else
            console.log("passed")*/
        }

        let distances = funRes[1];
        if (exclude > 0 && algorithm == "KNN"){
          let excluded = 0;
          const sIdx = segments[i].globalIdx;
          neighbors.forEach(n => {
            if (Math.abs(n-sIdx)<= exclude && segments[i].lineIDx==segments[n].lineIDx)
              excluded += 1;
          });
          //console.log(excluded);

          funRes = fun(tree, segment, lineSegments, KR+excluded,distanceMetric);
          let neighbors = funRes[0];
          distances = funRes[1];
          
        }

        if (exclude > 0){
          neighbors = neighbors.filter((n)=>{
            const sIdx = segments[i].globalIdx;
            return (Math.abs(n-sIdx) > exclude || segments[i].lineIDx != segments[n].lineIDx);
          })
        }

        if (!doSort){
          //console.log(distances)
          minDist = distances.reduce((min,num)=>Math.min(min,num),minDist);
          maxDist = distances.reduce((max,num)=>Math.max(max,num),maxDist);
          tgraph.push(neighbors);
          dgraph.push(distances);
        }else{
          sum = 0;
          sumSquared = 0;
        }
        const lIdx = segments[i].lineIDx;
        neighbors.forEach((n,idx) => {
          //segments[n].color = 'blue';
          //console.log(sIdx, segments[n].globalIdx, matrix)
          matrix[lIdx][segments[n].lineIDx]+=1;

          //console.log(sIDx,segments[n].globalIdx, matrix[sIdx][segments[n].globalIdx])
          if (doSort){
            //streamlines[segments[i].lineIDx][2] += 1;
            
            sum += distance3D(segments[i].midPoint, segments[n].midPoint);
            
            //const idx = segments[n].globalIdx;
            //sum += idx;
            //sumSquared += idx*idx;
          }else
            pixels.push([i,n,distances[idx]]);
          //pixels.push([n,i]);
        });

        
        
        if (doSort){
          const mean = sum/neighbors.length;
          //streamlines[segments[i].lineIDx][2] += sumSquared / neighbors.length - mean * mean;

          streamlines[segments[i].lineIDx][2] += sum / neighbors.length;
        }
        

        const progress = Math.floor(i / lineSegments.length * 100);
        if (progress % 10 === 0 && progress !== lastProgress) {
          //setProgress(progress);
          lastProgress = progress;
          self.postMessage({
            type: "progress",
            progress:progress
          });
          //console.log(progress);
        }
      }

      
      //console.log(matrix);
      
      if (doSort){
        const indexes = rearrangeMatrix(matrix);
        if (sortType==1)
          streamlines = indexes.map((newIndex) => streamlines[newIndex]);
        else
          streamlines = streamlines.sort((a, b) =>{ return  a[2] - b[2]});

        tgraph = []
        lastProgress = 0;
        pixels = [];
        const segments2 = [];
        //console.log(JSON.parse(JSON.stringify(arr[0])), JSON.parse(JSON.stringify(arr))[0]);
        //swap all here
        //console.log("be4:", streamlines);
        
        //streamlines = streamlines.sort((a, b) =>{ return  b[2] - a[2]});
        //streamlines = streamlines.sort((a, b) =>{ return  a[2] - b[2]});
        
        //console.log("after:",streamlines);
        let lIdx = 0;
        streamlines = streamlines.map(sl=>{
          const startIdx = segments2.length;
          for(let i=sl[0]; i<=sl[1];i++){
            if (!segments[i]){
              //console.log(segments[i],i);
              continue;
            }
            const seg = segments[i];
            seg.globalIdx=segments2.length;
            seg.lineIDx=lIdx;
            segments2.push(seg);
          }
          const endIdx = segments2.length-1;
          lIdx++;
          //console.log(startIdx,endIdx);
          return [startIdx,endIdx];
        })

        //console.log(streamlines);
        //console.log(segments.length, segments2.length);
        segments = segments2;
        //
        lineSegments = processSegments(segments);
        tree = createLineSegmentKDTree(lineSegments);
        for (let i=0; i <  lineSegments.length; i++){
          //for (let i=0; i <  2; i++){
          const segment = lineSegments[i];
          const fun = (algorithm=='RBN')? findRBN2:findKNearestNeighbors;

          let neighbors = fun(tree, segment, lineSegments, KR,distanceMetric);
          if (exclude > 0 && algorithm == "KNN"){
            let excluded = 0;
            const sIdx = segments[i].globalIdx;
            neighbors.forEach(n => {
              if (Math.abs(n-sIdx)<= exclude && segments[i].lineIDx==segments[n].lineIDx)
                excluded += 1;
            });
            //console.log(excluded);
            neighbors = fun(tree, segment, lineSegments, KR+excluded,distanceMetric);
          }
  
          if (exclude > 0){
            neighbors = neighbors.filter((n)=>{
              const sIdx = segments[i].globalIdx;
              return (Math.abs(n-sIdx) > exclude || segments[i].lineIDx != segments[n].lineIDx);
            })
          }
          tgraph.push(neighbors);
          neighbors.forEach((n,idx) => {
            //segments[n].color = 'blue';
            pixels.push([i,n]);
            //pixels.push([n,i]);
          });
          
          const progress = Math.floor(i / lineSegments.length * 100);
          if (progress % 10 === 0 && progress !== lastProgress) {
            //setProgress(progress);
            lastProgress = progress;
            self.postMessage({
              type: "progress",
              progress:progress
            });
            //console.log(progress);
          }
        }
      }

      let graphSize = 0;
        tgraph.forEach(edges=>{
          graphSize += edges.length;
        })

        console.log('GRAPH SIZE: ', graphSize);

      console.log(minDist);
      console.log(maxDist);
      //console.log(streamlines.length, streamlines2.length);
      console.log("ended");
      const msg = {
        type: "final",
        tgraph:tgraph,
        minDist:minDist,
        maxDist:maxDist,
        dgraph:dgraph,
        pixels:pixels
      };
      if (doSort){
        msg.segments = segments;
        msg.streamlines = streamlines;
      }
      self.postMessage(msg);
});