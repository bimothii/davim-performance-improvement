// knnHelper.js
import * as tf from '@tensorflow/tfjs';

export async function shortestDistanceBetweenSegmentsAsync(p1, q1, segmentArray) {
  const u = q1.sub(p1);
  const segmentTensors = segmentArray.map(([p2, q2]) => [tf.tensor(p2), tf.tensor(q2)]);
  const vArray = segmentTensors.map(([p2, q2]) => q2.sub(p2));
  const wArray = segmentTensors.map(([p2, q2]) => p1.sub(p2));

  const a = u.dot(u);
  const bArray = vArray.map(v => u.dot(v));
  const cArray = vArray.map(v => v.dot(v));
  const dArray = wArray.map(w => u.dot(w));
  const eArray = wArray.map((w, idx) => vArray[idx].dot(w));

  const DArray = cArray.map((c, idx) => a * c - bArray[idx] * bArray[idx]);

  const sNArray = [];
  const sDArray = [];
  const tNArray = [];
  const tDArray = [];

  for (let i = 0; i < segmentArray.length; i++) {
    let sN, sD = DArray[i];
    let tN, tD = DArray[i];

    if (DArray[i] < 1e-7) {
      sN = 0;
      sD = 1;
      tN = eArray[i];
      tD = cArray[i];
    } else {
      sN = (bArray[i] * eArray[i] - cArray[i] * dArray[i]);
      tN = (a * eArray[i] - bArray[i] * dArray[i]);
      if (sN < 0) {
        sN = 0;
        tN = eArray[i];
        tD = cArray[i];
      } else if (sN > sD) {
        sN = sD;
        tN = eArray[i] + bArray[i];
        tD = cArray[i];
      }
    }

    if (tN < 0) {
      tN = 0;
      if (-dArray[i] < 0) {
        sN = 0;
      } else if (-dArray[i] > a) {
        sN = sD;
      } else {
        sN = -dArray[i];
        sD = a;
      }
    } else if (tN > tD) {
      tN = tD;
      if ((-dArray[i] + bArray[i]) < 0) {
        sN = 0;
      } else if (-dArray[i] + bArray[i] > a) {
        sN = sD;
      } else {
        sN = -dArray[i] + bArray[i];
        sD = a;
      }
    }

    sNArray.push(sN);
    sDArray.push(sD);
    tNArray.push(tN);
    tDArray.push(tD);
  }

  const scArray = sNArray.map((sN, idx) => (Math.abs(sN) < 1e-7) ? 0 : sN / sDArray[idx]);

  const tcArray = tNArray.map((tN, idx) => (Math.abs(tN) < 1e-7) ? 0 : tN / tDArray[idx]);

  const dPArray = wArray.map((w, idx) => w.add(u.mul(scArray[idx])).sub(vArray[idx].mul(tcArray[idx])));
  const normArray = dPArray.map(dP => dP.norm());

  // Clean up resources
  segmentTensors.forEach(([p2, q2]) => {
    p2.dispose();
    q2.dispose();
  });
  vArray.forEach(v => v.dispose());
  wArray.forEach(w => w.dispose());
  dPArray.forEach(dP => dP.dispose());

  return normArray;
}

export async function findKNN(querySegment, segments, k) {
  const queryP1 = tf.tensor(querySegment[0]);
  const queryQ1 = tf.tensor(querySegment[1]);

  const distances = await shortestDistanceBetweenSegmentsAsync(queryP1, queryQ1, segments);

  const distanceWithIndex = distances.map((distance, index) => ({ index, distance }));

  const sortedDistances = distanceWithIndex.sort((a, b) => a.distance - b.distance);
  const knnIndices = sortedDistances.slice(0, k).map((item) => item.index);

  let res = knnIndices.map((index) => segments[index]);
  console.log(res);
  return res;
}

