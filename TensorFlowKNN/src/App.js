import React, { useState } from "react";
import createKDTree from "static-kdtree";
import * as tf from "@tensorflow/tfjs";

function App() {
  const [numberOfPoints, setNumberOfPoints] = useState(1000000);
  const [numberOfQueries, setNumberOfQueries] = useState(1000);
  const [k, setK] = useState(1);

  const generatePoints = (n) => {
    const points = [];
    for (let i = 0; i < n; i++) {
      points.push([Math.random(), Math.random()]);
    }
    return points;
  };

  const runStaticKDTree = () => {
    let tick = performance.now();
    const points = generatePoints(numberOfPoints);
    const queries = generatePoints(numberOfQueries);
    let tock = performance.now();
    console.log(`Generate Points and Queries: ${(tock - tick).toFixed(2)}ms`);
    tick = performance.now();
    const tree = createKDTree(points);
    tock = performance.now();
    console.log(`Build Static KD Tree: ${(tock - tick).toFixed(2)} ms`);
    tick = performance.now();
    queries.forEach((query) => {
      tree.knn(query, k);
    });
    tock = performance.now();
    console.log(`Static KD Tree: ${(tock - tick).toFixed(2)}ms`);
  };

  const runTensorFlowGPU = () => {
    let tick = performance.now();
    const points = generatePoints(numberOfPoints);
    const queryPoints = generatePoints(numberOfQueries);
    let tock = performance.now();
    console.log(`Generate Points: ${(tock - tick).toFixed(2)}ms`);
    tick = performance.now();
    const queries = tf.tensor2d(queryPoints);
    const data = tf.tensor2d(points);
    tock = performance.now();
    console.log(`Build Query and Data Tensor: ${(tock - tick).toFixed(2)}ms`);
    tick = performance.now();

    const distances = tf.tidy(() => {
      return tf.sqrt(tf.sum(tf.square(tf.sub(data, queries.expandDims(1))), 2));
    });

    const { indices } = tf.topk(distances.neg(), k);
    indices.arraySync();

    tock = performance.now();
    console.log(`TensorFlow GPU: ${(tock - tick).toFixed(2)}ms`);
    tf.dispose();
  };

  return (
    <div
      className="App"
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <br></br>
      <p>Number of Points</p>
      <input
        defaultValue={numberOfPoints}
        onChange={(e) => setNumberOfPoints(e.target.value)}
      ></input>
      <p>Number of Queries</p>
      <input
        defaultValue={numberOfQueries}
        onChange={(e) => setNumberOfQueries(e.target.value)}
      ></input>
      <p>Number of Neighbors</p>
      <input defaultValue={k} onChange={(e) => setK(e.target.value)}></input>
      <button onClick={() => runStaticKDTree()}>Run Static KD Tree</button>
      <button onClick={() => runTensorFlowGPU()}>Run TensorFlow GPU</button>
    </div>
  );
}

export default App;
