// import React from 'react';
// import { createRoot } from "react-dom/client";
// import App from './App';

// const container = document.getElementById("root");
// const root = createRoot(container);

// root.render(<App />);

import * as tf from '@tensorflow/tfjs';

// Calculate the true shortest distance between two 3D line segments
async function shortestDistanceBetweenSegmentsAsync(p1, q1, p2, q2) {
    const u = q1.sub(p1);
    const v = q2.sub(p2);
    const w = p1.sub(p2);
  
    const a = u.dot(u);
    const b = u.dot(v);
    const c = v.dot(v);
    const d = u.dot(w);
    const e = v.dot(w);
    const D = a * c - b * b;
  
    let sc, sN, sD = D;
    let tc, tN, tD = D;

  if (D < 1e-7) {
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
    if ((-d + b) < 0) {
      sN = 0;
    } else if (-d + b > a) {
      sN = sD;
    } else {
      sN = -d + b;
      sD = a;
    }
  }

  sc = (Math.abs(sN) < 1e-7) ? 0 : sN / sD;
  tc = (Math.abs(tN) < 1e-7) ? 0 : tN / tD;

  const dP = w.add(u.mul(sc)).sub(v.mul(tc));
  return dP.norm();
}

// Find the k-nearest neighbors for a query 3D line segment
async function findKNN(querySegment, segments, k) {
    const queryP1 = tf.tensor(querySegment[0]);
    const queryQ1 = tf.tensor(querySegment[1]);
  
    const distancePromises = segments.map(async (segment, index) => {
      const p2 = tf.tensor(segment[0]);
      const q2 = tf.tensor(segment[1]);
      const distance = await shortestDistanceBetweenSegmentsAsync(queryP1, queryQ1, p2, q2);
      return { index, distance };
    });
  
    const distances = await Promise.all(distancePromises);
  
  
    const sortedDistances = distances.sort((a, b) => a.distance - b.distance);
    const knnIndices = sortedDistances.slice(0, k).map((item) => item.index);
  
    let res =  knnIndices.map((index) => segments[index]);
    console.log(res);
    return res;
  }

// Example usage
const querySegment = [
  [1, 1, 1],
  [1, 2, 1],
];

const segments = [
  [
    [2, 3, 1],
    [3, 3, 1],
],
[
  [5, 5, 5],
  [6, 6, 6],
],
[
  [0, 0, 0],
  [1, 0, 0],
],
[
  [3, 3, 3],
  [3, 4, 3],
],
[
  [1, 3, 0],
  [1, 4, 0],
],
];

const k = 2;
const knn = findKNN(querySegment, segments, k);

console.log('k-nearest line segments:', knn);
