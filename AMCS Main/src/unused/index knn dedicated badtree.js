// import React from 'react';
// import { createRoot } from "react-dom/client";
// import App from './App';

// const container = document.getElementById("root");
// const root = createRoot(container);

// root.render(<App />);

const tf = require("@tensorflow/tfjs");
const KDTree = require("kdtree.js");

// Helper function to calculate Euclidean distance between two points
function euclideanDistance(a, b) {
  const d = a.sub(b).square().sum().sqrt();
  return d.dataSync()[0];
}

// Example data: array of line segments
// Each line segment is represented as a 2x3 tensor
const lineSegments = [
  // Add your line segments here, e.g.:
  // tf.tensor2d([[1, 2, 3], [4, 5, 6]]),
  // tf.tensor2d([[7, 8, 9], [10, 11, 12]]),
];

// Create a KDTree with line segment endpoints
const endpoints = lineSegments.flatMap((segment) => segment.arraySync());
const kdTree = new KDTree(endpoints, euclideanDistance, [0, 1, 2]);

// Example query line segment
const queryLineSegment = tf.tensor2d([
  [13, 14, 15],
  [16, 17, 18],
]);

// Find initial candidate neighbors
const K = 5; // Number of nearest neighbors to find

const findKNNforSegment = (queryLineSegment)=>{
  const kTimes2Neighbors = kdTree.nn(queryLineSegment.arraySync().flat(), K * 2);

  // Find max distance (M) among the initial candidate neighbors
  const maxDistance = Math.max(...kTimes2Neighbors.map((n) => n.dist));

  // Find all line segments within the radius (M + C)
  const C = 1; // Length of a single line segment (assuming all line segments have the same length)
  const radius = maxDistance + C;
  const neighborsWithinRadius = kdTree.within(queryLineSegment.arraySync().flat(), radius);

  // Extract unique line segment indices from the neighborsWithinRadius
  const uniqueSegmentIndices = [...new Set(neighborsWithinRadius.map((n) => Math.floor(n.node / 2)))];

  // Calculate true shortest distance between the query line segment and the unique candidate line segments
  const knnDistances = uniqueSegmentIndices.map((i) => {
    const segment = lineSegments[i];
    // Add your function to calculate the true shortest distance between line segments
    const trueDistance = calculateTrueDistance(queryLineSegment, segment);
    return { index: i, distance: trueDistance };
  });

  // Sort the distances and select the K nearest neighbors
  knnDistances.sort((a, b) => a.distance - b.distance);
  const KNN = knnDistances.slice(0, K);

  console.log("K Nearest Neighbors:", KNN);
  return KNN;
}


async function calculateTrueDistance(segment1, segment2) {
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

findKNNforSegment(queryLineSegment);