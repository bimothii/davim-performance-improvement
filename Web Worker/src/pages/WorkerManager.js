import React, { useState } from "react";
import * as KDTree from "../components/knnHelper.js";

const WorkerManager = () => {
  const [numWorkers, setNumWorkers] = useState(2);
  const [numPoints, setNumPoints] = useState(1000);
  const [K, setK] = useState(5);

  const bruteForce = () => {
    const points = Array.from({ length: numPoints }, () =>
      Array.from({ length: 2 }, () => Math.random() * 1000)
    );
    const kNearest = [];
    const tick = performance.now();
    for (let i = 0; i < numWorkers; i++) {
      const distances = [];
      for (let j = 0; j < points.length; j++) {
        distances.push({
          index: j,
          distance: Math.sqrt(
            Math.pow(points[i][0] - points[j][0], 2) +
              Math.pow(points[i][1] - points[j][1], 2)
          ),
        });
      }
      distances.sort((a, b) => {
        if (a.distance === b.distance) return a.index - b.index;
        return a.distance - b.distance;
      });
      kNearest.push({
        index: i,
        neighbors: distances.slice(1, K + 1).map((d) => {
          return d.index;
        }),
      });
    }
    const tock = performance.now();
    console.log(`Completed in ${(tock - tick).toFixed(2)} ms`);
  };

  const kdTree = () => {
    const points = Array.from({ length: numPoints }, () =>
      Array.from({ length: 2 }, () => Math.random() * 1000)
    );
    const kNearest = [];
    const tick = performance.now();
    const tree = KDTree.buildTree(points, 0);
    for (let i = 0; i < numWorkers; i++) {
      kNearest.push(KDTree.knn(tree, points[i], K));
    }
    const tock = performance.now();
    console.log(`Completed in ${(tock - tick).toFixed(2)} ms`);
  };

  const bruteForceWithWorkers = () => {
    const points = Array.from({ length: numPoints }, () =>
      Array.from({ length: 2 }, () => Math.random() * 1000)
    );
    const kNearest = [];
    const tick = performance.now();
    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker(
        new URL("../components/BruteForcerWorker.js", import.meta.url)
      );
      worker.postMessage({
        points: points,
        start: Math.floor((numPoints / numWorkers) * i),
        end: Math.floor((numPoints / numWorkers) * (i + 1)),
        k: K,
        kNearest: kNearest,
      });
      worker.onmessage = (message) => {
        kNearest.push(message.data);
        if (kNearest.length == numPoints) {
          for (let j = 0; j < numPoints; j++)
            kNearest[j].neighbors.sort((a, b) => {
              return a.index - b.index;
            });
          const tock = performance.now();
          console.log(`Completed in ${(tock - tick).toFixed(2)} ms`);
        }
      };
    }
  };

  const kdTreeWithWorkers = () => {
    const points = createPoints(numPoints);
    const kNearest = [];
    const tick = performance.now();
    const tree = KDTree.buildTree(points, 0);
    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker(
        new URL("../components/KDTreeWorker.js", import.meta.url)
      );
      worker.postMessage({
        points: points,
        tree: tree,
        start: Math.floor((numPoints / numWorkers) * i),
        end: Math.floor((numPoints / numWorkers) * (i + 1)),
        k: K,
        kNearest: kNearest,
      });
      worker.onmessage = (message) => {
        kNearest.push(message.data);
        if (kNearest.length == numPoints) {
          for (let j = 0; j < numPoints; j++)
            kNearest[j].neighbors.sort((a, b) => {
              return a.index - b.index;
            });
          const tock = performance.now();
          console.log(`Completed in ${(tock - tick).toFixed(2)} ms`);
        }
      };
    }
  };

  const createPoints = (n) => {
    return Array.from({ length: n }, () =>
      Array.from({ length: 2 }, () => Math.random() * 1000)
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        margin: "50px",
      }}
    >
      <p>Number of Workers:</p>
      <input
        defaultValue={numWorkers}
        onChange={(e) => setNumWorkers(Number(e.target.value))}
      />
      <p>Number of Points:</p>
      <input
        defaultValue={numPoints}
        onChange={(e) => setNumPoints(Number(e.target.value))}
      />
      <p>K:</p>
      <input defaultValue={K} onChange={(e) => setK(Number(e.target.value))} />
      <br></br>
      <button onClick={() => bruteForce()}>Brute Force</button>
      <button onClick={() => kdTree()}>KD Tree</button>
      <button onClick={() => bruteForceWithWorkers()}>
        Brute Force With Workers
      </button>
      <button onClick={() => kdTreeWithWorkers()}>KD Tree With Workers</button>
      <p>Messages on browser console</p>
    </div>
  );
};

export default WorkerManager;
