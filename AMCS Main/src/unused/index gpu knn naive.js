import { findKNN } from './knnHelper.js';

function generateRandomSegments(n) {
  const segments = [];

  for (let i = 0; i < n; i++) {
    const p = [Math.random() * 10, Math.random() * 10, Math.random() * 10];
    const q = [Math.random() * 10, Math.random() * 10, Math.random() * 10];
    segments.push([p, q]);
  }

  return segments;
}

const segments = generateRandomSegments(2000);

const querySegment = [
  [1, 1, 1],
  [1, 2, 1],
];

const k = 3;

(async () => {
  console.time('findKNN');
  const knn = await findKNN(querySegment, segments, k);
  console.timeEnd('findKNN');

  console.log('K Nearest Neighbors:');
  console.log(knn);
})();
