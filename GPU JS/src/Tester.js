import { useState, React } from "react";
import { GPU } from "gpu.js";
const createKDTree = require("static-kdtree");
const gpu = new GPU();

function Tester() {
  const [numPoints, setNumPoints] = useState(100000);
  const [numQueries, setNumQueries] = useState(100000);
  const [trials, setTrials] = useState(1);
  const [dimensions, setDimensions] = useState(3);
  const [K, setK] = useState(10);

  const generatePoints = (s) => {
    const points = [];
    for (let i = 0; i < s; i++) {
      const point = [];
      for (let j = 0; j < dimensions; j++) point.push(Math.random() * 1000);
      points.push(point);
    }
    return points;
  };

  const cpuKNN = () => {
    let start = performance.now();
    const points = generatePoints(numPoints);
    const queries = generatePoints(numQueries);
    let end = performance.now();
    console.log("Points Generation Time: ", (end - start).toFixed(2), "ms");
    start = performance.now();
    const tree = createKDTree(points);
    end = performance.now();
    console.log("KD Tree Generation Time: ", (end - start).toFixed(2), "ms");

    start = performance.now();
    for (let i = 0; i < queries; i++) {
      tree.knn(queries[i], K);
    }
    end = performance.now();
    console.log("CPU KNN Time: ", (end - start).toFixed(2), "ms");
    console.log(((end - start) / numQueries).toFixed(6), "ms per query");
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <p>Num Points</p>
      <input
        defaultValue={numPoints}
        onChange={(e) => setNumPoints(Number(e.target.value))}
      />
      <p>Trials</p>
      <input
        defaultValue={trials}
        onChange={(e) => setTrials(Number(e.target.value))}
      />
      <p>Num Queries</p>
      <input
        defaultValue={numQueries}
        onChange={(e) => setNumQueries(Number(e.target.value))}
      />
      <p>K</p>
      <input defaultValue={K} onChange={(e) => setK(Number(e.target.value))} />
      <p>K Nearest</p>
      <button onClick={() => cpuKNN()}>Run CPU with KD Tree</button>
    </div>
  );
}

export default Tester;
