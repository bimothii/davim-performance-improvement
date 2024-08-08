import React, { useState, useEffect } from "react";

const MyComponent = () => {
  const [result, setResult] = useState(null);
  const [worker, setWorker] = useState(null);

  // useEffect runs one time after rendering
  useEffect(() => {
    const myWorker = new Worker("worker.js");

    myWorker.onmessage = (event) => {
      console.log("Received result from worker:", event.data);
      setResult(event.data);
    };

    setWorker(myWorker);

    return () => {
      myWorker.terminate();
    };
  }, []);

  const handleClick = () => {
    if (worker) {
      worker.postMessage(5);
    }
  };

  return (
    <div>
      <p>Result from the worker: {result}</p>
      <button onClick={handleClick}>Calculate in Web Worker</button>
    </div>
  );
};

export default MyComponent;
