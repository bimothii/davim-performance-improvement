const kdtree = require("static-kdtree");
import * as tf from "@tensorflow/tfjs";

// Helper function to calculate distance between two 3D points
function distance3D(point1, point2) {
  return tf.tidy(() => {
    const diff = point1.sub(point2);
    return diff.norm().arraySync();
  });
}

// Helper function to calculate true distance between two 3D line segments
function lineSegmentDistance(line1, line2) {
  return tf.tidy(() => {
    const p0 = line1[0];
    const p1 = line1[1];
    const q0 = line2[0];
    const q1 = line2[1];

    const u = p1.sub(p0);
    const v = q1.sub(q0);
    const w = p0.sub(q0);

    const a = u.dot(u).arraySync();
    const b = u.dot(v).arraySync();
    const c = v.dot(v).arraySync();
    const d = u.dot(w).arraySync();
    const e = v.dot(w).arraySync();
    const D = a * c - b * b;

    let sc,
      sN,
      sD = D;
    let tc,
      tN,
      tD = D;

    if (D < 1e-8) {
      sN = 0;
      sD = 1;
      tN = e;
      tD = c;
    } else {
      sN = b * e - c * d;
      tN = a * e - b * d;
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

    const dp = w.add(u.mul(sc)).sub(v.mul(tc));

    return dp.norm().arraySync();
  });
}

function findKNearestNeighbors(tree, querySegment, lineSegments, K) {
  // Calculate the midpoint of the query line segment
  const midpoint = querySegment[0].add(querySegment[1]).div(2).arraySync();

  // Find K*2 nearest points around the query segment's midpoint
  const nearestPoints = tree.knn(midpoint, K * 2);

  // Find the max radius R from these neighbors
  let maxRadius = 0;
  for (const idx of nearestPoints) {
    const coords = [
      tree.points.get(idx, 0),
      tree.points.get(idx, 1),
      tree.points.get(idx, 2),
    ];
    const point = tf.tensor1d(coords);
    const dist = distance3D(tf.tensor1d(midpoint), point);
    if (dist > maxRadius) {
      maxRadius = dist;
    }
  }

  // Find all points within R + 2 * C where C is the length of each segment
  const searchRadius =
    maxRadius +
    2 * lineSegments[0][0].sub(lineSegments[0][1]).norm().arraySync();
  const pointsWithinRadius = [];
  tree.rnn(midpoint, searchRadius, function (idx) {
    pointsWithinRadius.push(idx);
  });

  // Deduplicate the indices
  const uniqueIndices = Array.from(new Set(pointsWithinRadius));

  console.log("NUM:", uniqueIndices.length);

  // Compute the true distance between the query segment and each segment within that radius
  const distances = uniqueIndices.map((idx) => {
    const segmentIndex = Math.floor(idx / 2);
    const segment = lineSegments[segmentIndex];
    return {
      index: segmentIndex,
      distance: lineSegmentDistance(querySegment, segment),
    };
  });

  // Sort the distances and take the first K nearest segments
  const sortedDistances = distances.sort((a, b) => a.distance - b.distance);
  const nearestSegments = sortedDistances.slice(0, K).map((d) => d.index);

  return nearestSegments;
}

function generateRandomLineSegments(numSegments, C, boxSize) {
  // Generate a tensor with dimensions (numSegments, 3) for startPoint
  const startPoint = tf.randomUniform([numSegments, 3], 0, boxSize);

  // Generate a tensor with dimensions (numSegments, 3) for direction
  const direction = tf.randomUniform([numSegments, 3], -1, 1);

  // Calculate the unit direction
  const directionLength = tf.norm(direction, 1);
  const unitDirection = direction.div(tf.reshape(directionLength, [-1, 1]));

  // Calculate the end point using the starting point, direction, and fixed length
  const endPoint = startPoint.add(unitDirection.mul(tf.scalar(C)));

  // Transpose the tensors and convert each row to a line segment
  const lineSegments = tf
    .transpose(tf.stack([startPoint, endPoint], 2), [0, 2, 1])
    .arraySync()
    .map((segment) => [tf.tensor1d(segment[0]), tf.tensor1d(segment[1])]);

  return lineSegments;
}

function createLineSegmentKDTree(lineSegments) {
  // Convert line segments to a flat array of points (end points of line segments)
  const points = [];
  for (const segment of lineSegments) {
    const startPoint = segment[0].arraySync();
    const endPoint = segment[1].arraySync();
    points.push(startPoint, endPoint);
  }

  // Create the KDTree
  const tree = kdtree(points);
  return tree;
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

let lineSegments;
console.log("Generate");
measureExecutionTime(() => {
  lineSegments = generateRandomLineSegments(numSegments, fixedLength, boxSize);
});

let tree;

console.log("Create");
measureExecutionTime(() => {
  tree = createLineSegmentKDTree(lineSegments);
});

console.log("KNN");
measureExecutionTime(() => {
  let res = findKNearestNeighbors(tree, lineSegments[0], lineSegments, K);
  console.log(res);
});

// Dispose the tree when you are done with it
tree.dispose();
