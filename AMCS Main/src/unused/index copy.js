const kdtree = require('static-kdtree');
const tf = require('@tensorflow/tfjs');

// Helper function to calculate distance between two 3D points
function distance3D(point1, point2) {
  return Math.sqrt(
    Math.pow(point1[0] - point2[0], 2) +
    Math.pow(point1[1] - point2[1], 2) +
    Math.pow(point1[2] - point2[2], 2)
  );
}

// Helper function to calculate true distance between two 3D line segments
function lineSegmentDistance(line1, line2) {
    const p0 = line1[0];
    const p1 = line1[1];
    const q0 = line2[0];
    const q1 = line2[1];
  
    const u = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const v = [q1[0] - q0[0], q1[1] - q0[1], q1[2] - q0[2]];
    const w = [p0[0] - q0[0], p0[1] - q0[1], p0[2] - q0[2]];
  
    const a = dotProduct(u, u);
    const b = dotProduct(u, v);
    const c = dotProduct(v, v);
    const d = dotProduct(u, w);
    const e = dotProduct(v, w);
    const D = a * c - b * b;
  
    let sc, sN, sD = D;
    let tc, tN, tD = D;
  
    if (D < 1e-8) {
      sN = 0;
      sD = 1;
      tN = e;
      tD = c;
    } else {
      sN = (b * e - c * d);
      tN = (a * e - b * d);
      if (sN < 0) {
        sN = 0;
        tN = e;
        tD = c;
      } else if (sN > sD) {
        sN = sD;
        tN = e + b;
        tD = c;
      }
    }
  
    if (tN < 0) {
      tN = 0;
      if (-d < 0) {
        sN = 0;
      } else if (-d > a) {
        sN = sD;
      } else {
        sN = -d;
        sD = a;
      }
    } else if (tN > tD) {
      tN = tD;
      if (-d + b < 0) {
        sN = 0;
      } else if (-d + b > a) {
        sN = sD;
      } else {
        sN = -d + b;
        sD = a;
      }
    }
  
    sc = Math.abs(sN) < 1e-8 ? 0 : sN / sD;
    tc = Math.abs(tN) < 1e-8 ? 0 : tN / tD;
  
    const dp = [
      w[0] + (sc * u[0]) - (tc * v[0]),
      w[1] + (sc * u[1]) - (tc * v[1]),
      w[2] + (sc * u[2]) - (tc * v[2])
    ];
  
    return Math.sqrt(dotProduct(dp, dp));
  }
  
  function dotProduct(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  

// Function to create a KD-tree from an array of line segments
function createLineSegmentKDTree(lineSegments) {
    const points = [];
    for (const segment of lineSegments) {
      points.push(segment[0]); // Start point
      points.push(segment[1]); // End point
    }
    return kdtree(points);
  }
  
  // Function to find K nearest neighbors for a query line segment, given a KD-tree of line segment end points
  function findKNearestNeighbors(tree, querySegment, lineSegments, K) {
    // Calculate the midpoint of the query line segment
    const midpoint = [
      (querySegment[0][0] + querySegment[1][0]) / 2,
      (querySegment[0][1] + querySegment[1][1]) / 2,
      (querySegment[0][2] + querySegment[1][2]) / 2,
    ];
  
    // Find K*2 nearest points around the query segment's midpoint
    const nearestPoints = tree.knn(midpoint, K * 2);
  
    // Find the max radius R from these neighbors
    let maxRadius = 0;
    for (const idx of nearestPoints) {
      const point = [
        tree.points.get(idx, 0),
        tree.points.get(idx, 1),
        tree.points.get(idx, 2),
      ];
      const dist = distance3D(midpoint, point);
      if (dist > maxRadius) {
        maxRadius = dist;
      }
    }
  
    // Compute the radius for the extended search (R + 2 * C)
    const C = distance3D(querySegment[0], querySegment[1]);
    const searchRadius = maxRadius + 2 * C;
  
    // Find all points within the search radius
    const pointsWithinRadius = [];
    tree.rnn(midpoint, searchRadius, function(idx) {
      pointsWithinRadius.push(idx);
    });
    console.log("NUM:",pointsWithinRadius.length);
    // Compute the true distance between the query segment and each segment within that radius
    const distances = [];
    const uniqueSegmentIndices = new Set();
    for (const idx of pointsWithinRadius) {
      const segmentIndex = Math.floor(idx / 2);
      if (!uniqueSegmentIndices.has(segmentIndex)) {
        uniqueSegmentIndices.add(segmentIndex);
        const segment = lineSegments[segmentIndex];
        const trueDistance = lineSegmentDistance(querySegment, segment);
        distances.push({ index: segmentIndex, distance: trueDistance });
      }
    }
  
    // Sort the distances and find K nearest segments
    distances.sort((a, b) => a.distance - b.distance);
    const kNearestNeighbors = distances.slice(0, K).map((d) => lineSegments[d.index]);
  
    return kNearestNeighbors;
  }
  
  
  


function generateRandomLineSegments(numSegments, C, boxSize) {
    const lineSegments = [];
  
    for (let i = 0; i < numSegments; i++) {
      // Generate a random starting point within the bounding box
      const startPoint = [
        Math.random() * boxSize,
        Math.random() * boxSize,
        Math.random() * boxSize,
      ];
  
      // Generate a random unit direction vector
      const direction = [
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      ];
      const directionLength = Math.sqrt(direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2);
      const unitDirection = direction.map(d => d / directionLength);
  
      // Calculate the end point using the starting point, direction, and fixed length
      const endPoint = [
        startPoint[0] + unitDirection[0] * C,
        startPoint[1] + unitDirection[1] * C,
        startPoint[2] + unitDirection[2] * C,
      ];
  
      // Add the line segment to the list
      lineSegments.push([startPoint, endPoint]);
    }
  
    return lineSegments;
  }

  function measureExecutionTime(func) {
    const startTime = performance.now(); // start the timer
  
    // call the function
    func();
  
    const endTime = performance.now(); // stop the timer
    const executionTime = endTime - startTime; // calculate the time difference
  
    console.log(`Execution time: ${executionTime} milliseconds`);
  }
  
    
  const numSegments = 200000;
  const fixedLength = 10;
  const boxSize = 100;
  const K = 5;
  
  let lineSegments = generateRandomLineSegments(numSegments, fixedLength, boxSize);

  
  let tree;

  console.log("Create")
  measureExecutionTime(()=>{
    tree = createLineSegmentKDTree(lineSegments);
  });
  
  console.log("KNN")
  measureExecutionTime(()=>{
    let res = findKNearestNeighbors(tree, lineSegments[0], lineSegments, K);
    console.log(res);
  ``});
  

// Dispose the tree when you are done with it
tree.dispose();
