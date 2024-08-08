import React, { useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';

const KnnLongestDistance = () => {
  const [result, setResult] = useState([]);
  useEffect(() => {
    const findKnnLongestDistance = async () => {
      // Replace the inputData and queryData tensors with your actual data
      function generateRandomCoordinate() {
        return Math.random() * 10;
      }
      
      function generateRandomLineSegment() {
        return [
          [generateRandomCoordinate(), generateRandomCoordinate(), generateRandomCoordinate()],
          [generateRandomCoordinate(), generateRandomCoordinate(), generateRandomCoordinate()],
        ];
      }
      
      function generateRandomLineSegments(numSegments) {
        const lineSegments = [];
      
        for (let i = 0; i < numSegments; i++) {
          lineSegments.push(generateRandomLineSegment());
        }
      
        return tf.tensor3d(lineSegments);
      }
      
      let inputData = tf.tensor3d([
        [[1, 2, 3], [4, 5, 6]],
        [[7, 8, 9], [10, 11, 12]],
      ]);
      
      const numSegmentsToGenerate = 10; // Adjust this number to generate more or fewer line segments
      const generatedLineSegments = generateRandomLineSegments(numSegmentsToGenerate);
      inputData = tf.concat([inputData, generatedLineSegments], 0);

      const queryData = tf.tensor2d([
        [2, 4, 6],
        [8, 10, 12],
      ]);

      const distances = tf.tidy(() => {
        const longestDistance = (point, lineSegment) => {
            const A = lineSegment.slice([0, 0], [1, 3]).reshape([3]);
            const B = lineSegment.slice([1, 0], [1, 3]).reshape([3]);
          
          const AP = tf.sub(point, A);
          const AB = tf.sub(B, A);
          const t = tf.clipByValue(tf.div(tf.dot(AP, AB), tf.dot(AB, AB)), 0, 1);
          const closestPoint = tf.add(A, tf.mul(t, AB));
          return tf.sub(point, closestPoint).norm();
        };

        const numQueries = queryData.shape[0];
        const numLineSegments = inputData.shape[0];
        const longestDistances = [];
        for (let i = 0; i < numQueries; i++) {
          const point = queryData.slice([i, 0], [1, 3]);
          const distances = [];
          for (let j = 0; j < numLineSegments; j++) {
            const lineSegment = inputData.slice([j, 0, 0], [1, 2, 3]).reshape([2,3]);
            distances.push(longestDistance(point, lineSegment));
          }
          longestDistances.push(tf.stack(distances));
        }
        return tf.stack(longestDistances);
      });

      const k = 2;
      const indices = tf.topk(distances, k, false).indices;
      const indicesArray = await indices.array();
      
      setResult(indicesArray);
    };

    findKnnLongestDistance();
  }, []);

  return (
    <div>
      {result.map((queryResult, queryIndex) => (
        <div key={queryIndex}>
          <h3>Query point {queryIndex + 1} K-furthest neighbors:</h3>
          <ul>
            {queryResult.map((lineSegmentIndex, index) => (
              <li key={index}>Line segment {lineSegmentIndex + 1}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default KnnLongestDistance;
