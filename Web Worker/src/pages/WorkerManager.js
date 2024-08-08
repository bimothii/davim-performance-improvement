import React, { useState, useEffect } from "react";

const WorkerManager = () => {
  const [numWorkers, setNumWorkers] = useState(2);
  const [numPoints, setNumPoints] = useState(1000);
  const [K, setK] = useState(5);

  const run = () => {
    const points = Array.from({ length: numPoints }, () =>
      Array.from({ length: 2 }, () => Math.random() * 1000)
    );
    const kNearest = [];
    let finishedWorkers = 0;
    const tick = performance.now();
    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker(
        new URL("../components/worker.js", import.meta.url)
      );
      worker.postMessage({
        points: points,
        start: Math.floor((numPoints / numWorkers) * i),
        end: Math.floor((numPoints / numWorkers) * (i + 1)),
        k: K,
      });
      worker.onmessage = (message) => {
        console.log(`Worker ${i} completed`);
        for (let j = 0; j < message.data.length; j++) {
          kNearest.push(message.data[j]);
        }
        finishedWorkers++;
        if (finishedWorkers === numWorkers) {
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
      <button onClick={() => run()}>Run</button>
    </div>
  );
};

export default WorkerManager;
