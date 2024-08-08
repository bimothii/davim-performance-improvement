const tf = require("@tensorflow/tfjs");
import rbush from 'rbush';
import knn from 'rbush-knn';

// Helper function to calculate Euclidean distance between two points
function euclideanDistance(a, b) {
  const d = a.sub(b).square().sum().sqrt();
  return d.dataSync()[0];
}



// Example data: array of line segments
// Each line segment is represented as a 2x3 tensor
const lineSegments = [
  // Add your line segments here, e.g.:
   //tf.tensor2d([[1, 2, 3], [4, 5, 6]]),
   //tf.tensor2d([[7, 8, 9], [10, 11, 12]]),
];

const startTime = performance.now();

for (let i = 0; i < 200000; i++) {
  const x1 = Math.random();
  const y1 = Math.random();
  const z1 = Math.random();
  const x2 = Math.random();
  const y2 = Math.random();
  const z2 = Math.random();
  const segment = tf.tensor2d([[x1, y1, z1], [x2, y2, z2]]);
  const addedSegment = segment.add(segment);
  lineSegments.push(segment);
}

const endTime = performance.now();
const elapsedTime = endTime - startTime;
console.log("Elapsed time:", elapsedTime, "milliseconds");


// Create an R-Tree with line segment endpoints
const endpoints = lineSegments.flatMap((segment) => segment.arraySync());
const tree = new rbush();
tree.load(endpoints.map((point, index) => ({
  minX: point[0],
  minY: point[1],
  minZ: point[2],
  maxX: point[0],
  maxY: point[1],
  maxZ: point[2],
  index,
})));

// Example query line segment
const queryLineSegment = tf.tensor2d([
  [Math.random(), Math.random(), Math.random()],
  [Math.random(), Math.random(), Math.random()],
]);

const findKNNforSegment = async (queryLineSegment) => {
  console.log("Query line segment:", await queryLineSegment.array());

  const K = 5; // Number of nearest neighbors to find
  const queryPoints = queryLineSegment.arraySync();
  const kTimes2Neighbors = [];

  for (const point of queryPoints) {
    break;
    const queryBBox = {
      minX: point[0],
      minY: point[1],
      minZ: point[2],
      maxX: point[0],
      maxY: point[1],
      maxZ: point[2],
    };

    console.log("Query bounding box:", queryBBox);

    const neighbors = knn(tree, queryBBox, K * 2);
    for (const neighbor of neighbors) {
      const d = euclideanDistance(
        tf.tensor1d(point),
        tf.tensor1d([neighbor.minX, neighbor.minY, neighbor.minZ])
      );
      kTimes2Neighbors.push({ index: Math.floor(neighbor.index / 2), dist: d });
    }
  }

  for (const point of queryPoints) {
    const neighbors = knn(tree, K * 2, point[0],point[1]);
      for (const neighbor of neighbors) {
        const d = euclideanDistance(
          tf.tensor1d(point),
          tf.tensor1d([neighbor.minX, neighbor.minY, neighbor.minZ])
        );
      kTimes2Neighbors.push({ index: Math.floor(neighbor.index / 2), dist: d });
    }
  }

  console.log("Initial candidate neighbors:", kTimes2Neighbors);

  // Find max distance (M) among the initial candidate neighbors
  const maxDistance = Math.max(...kTimes2Neighbors.map((n) => n.dist));
  console.log("Max distance:", maxDistance);

  // Find all line segments within the radius (M + C)
  const C = 1; // Length of a single line segment (assuming all line segments have the same length)
  const radius = maxDistance + C;
  console.log("Search radius:", radius);
  const neighborsWithinRadius = tree.search({
    minX: queryPoints[0][0] - radius,
    minY: queryPoints[0][1] - radius,
    minZ: queryPoints[0][2] - radius,
    maxX: queryPoints[1][0] + radius,
    maxY: queryPoints[1][1] + radius,
    maxZ: queryPoints[1][2] + radius,
  });

  console.log("Neighbors within radius:", neighborsWithinRadius);

  // Extract unique line segment indices from the neighborsWithinRadius
  const uniqueSegmentIndices = [...new Set(neighborsWithinRadius.map((n) => Math.floor(n.index / 2)))];
  console.log("Unique segment indices:", uniqueSegmentIndices);

  // Calculate true shortest distance between the query line segment and the unique candidate line segments
  const knnDistances = [];
  for (const i of uniqueSegmentIndices) {
    const segment = lineSegments[i];
    console.log(`Calculating true distance for segment ${i}`);
    const trueDistance = calculateTrueDistance(queryLineSegment, segment);
    knnDistances.push({ index: i, distance: trueDistance });
  }

  console.log("KNN distances:", knnDistances);

  // Sort the distances and select the K nearest neighbors
  knnDistances.sort((a, b) => a.distance - b.distance);
  const KNN = knnDistances.slice(0, K);

  console.log("K Nearest Neighbors:", KNN);
  return KNN;
};


function calculateTrueDistance(segment1, segment2) {
  //console.log("segment1:", await segment1.array());
  //console.log("segment2:", await segment2.array());

  const P0 = segment1.slice([0, 0], [1, 3]);
  const P1 = segment1.slice([1, 0], [1, 3]);
  const Q0 = segment2.slice([0, 0], [1, 3]);
  const Q1 = segment2.slice([1, 0], [1, 3]);

  //console.log("P0:", await P0.array());
  //console.log("P1:", await P1.array());
  //console.log("Q0:", await Q0.array());
  //console.log("Q1:", await Q1.array());

  const dP = P1.sub(P0);
  const dQ = Q1.sub(Q0);
  const diff = P0.sub(Q0);

  //console.log("dP:", await dP.array());
  //console.log("dQ:", await dQ.array());
  //console.log("diff:", await diff.array());

  const D = dP.matMul(dQ.transpose()).arraySync()[0][0];

  //console.log("D:", D);

  if (D === 0) {
    // Line segments are parallel or coincident
    const distance1 = tf.norm(P0.sub(Q0), 2, 1).array();
    const distance2 = tf.norm(P0.sub(Q1), 2, 1).array();
    const distance3 = tf.norm(P1.sub(Q0), 2, 1).array();
    const distance4 = tf.norm(P1.sub(Q1), 2, 1).array();
    const minDistance = Math.min(distance1, distance2, distance3, distance4);
    //console.log("Line segments are parallel or coincident. minDistance:", minDistance);
    return minDistance;
  }

  const S = (-dQ.matMul(diff.transpose()).arraySync()[0][0]) / D;
  const T = (dP.matMul(diff.transpose()).arraySync()[0][0]) / D;

  //console.log("S:", S);
  //console.log("T:", T);

  if (S < 0 || S > 1 || T < 0 || T > 1) {
    // Line segments do not intersect
    const distance1 = tf.norm(P0.sub(Q0), 2, 1).array();
    const distance2 = tf.norm(P0.sub(Q1), 2, 1).array();
    const distance3 = tf.norm(P1.sub(Q0), 2, 1).array();
    const distance4 = tf.norm(P1.sub(Q1), 2, 1).array();
    const minDistance = Math.min(distance1, distance2, distance3, distance4);
    //console.log("Line segments do not intersect. minDistance:", minDistance);
    return minDistance;
  }

  // Line segments intersect
  //console.log("Line segments intersect. distance:", 0);
  return 0;
}












async function calculateTrueDistanceOLD(segment1, segment2) {
  const P0 = segment1.slice([0, 0], [1, 3]);
  const P1 = segment1.slice([1, 0], [1, 3]);
  const Q0 = segment2.slice([0, 0], [1, 3]);
  const Q1 = segment2.slice([1, 0], [1, 3]);

  const dP = P1.sub(P0);
  const dQ = Q1.sub(Q0);
  const r = tf.cross(dP, dQ);
  const rDotR = tf.dot(r, r).arraySync()[0];
  
  if (rDotR === 0) {
  // Line segments are parallel
  const num = tf.dot(Q0.sub(P0), dP).arraySync()[0];
  const denom = tf.dot(dP, dP).arraySync()[0];
  const t = num / denom;
  const closestPoint = P0.add(dP.mul(tf.scalar(t)));
  const distance = tf.norm(closestPoint.sub(Q0));
  return (await distance.array())[0];
  }
  
  const diff = P0.sub(Q0);
  const t = tf.dot(dQ, tf.cross(diff, dQ)).div(rDotR);
  const u = tf.dot(dP, tf.cross(diff, dP)).div(rDotR);
  
  if (t.arraySync()[0] >= 0 && t.arraySync()[0] <= 1 && u.arraySync()[0] >= 0 && u.arraySync()[0] <= 1) {
  // Line segments intersect
  return 0;
  }
  
  // Line segments do not intersect and are not parallel
  const tClip = tf.clipByValue(t, 0, 1);
  const uClip = tf.clipByValue(u, 0, 1);
  
  const P = P0.add(dP.mul(tClip));
  const Q = Q0.add(dQ.mul(uClip));
  
  const distance = tf.norm(P.sub(Q));
  return (await distance.array())[0];
  }
  
  //const startTime = performance.now();
  //findKNNforSegment(queryLineSegment);
  //const endTime = performance.now();
  //const elapsedTime = endTime - startTime;
  //console.log("Elapsed time:", elapsedTime, "milliseconds");
  