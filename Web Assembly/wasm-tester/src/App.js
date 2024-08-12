import { useState, useEffect } from "react";
import Module from "./wasm/tree.js";
const App = () => {
  const [num, setNum] = useState(10000);
  const [trials, setTrials] = useState(20);
  let instance;
  let addPoint = null;

  useEffect(() => {
    const loadWasm = async () => {
      try {
        Module()
          .then((inst) => {
            instance = inst;
          })
          .catch((err) => {
            console.error("Error instantiating WebAssembly module:", err);
          });
      } catch (error) {
        console.error("Error loading WebAssembly module:", error);
      }
    };

    loadWasm();
  }, []);

  const runCpu = () => {
    let a = 0;
    for (let i = 0; i < num; i++) a++;
    console.log(a);
  };

  const runWasm = () => {
    const points = Array.from({ length: 30000 }, () => Math.random());
    const ptr = instance._malloc(points.length * 4);
    points.forEach((value, i) => {
      instance.setValue(ptr + i * 4, value, "i32");
    });
    instance.ccall(
      "addPoints",
      "void",
      ["number", "number"],
      [ptr, points.length]
    );
    instance.ccall("printPoints", "void", [], []);
  };

  const simulate = (s) => {
    var fun = null;
    switch (s) {
      case "runCpu":
        fun = runCpu;
        break;
      case "runWasm":
        fun = runWasm;
        break;
      default:
        break;
    }
    const tick = performance.now();
    for (let trial = 0; trial < trials; trial++) fun();
    const tock = performance.now();
    console.log(
      `${s} on average took ${((tock - tick) / trials).toFixed(2)} ms`
    );
  };

  return (
    <div
      className="App"
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <br></br>
      <p>Number to Count To</p>
      <input
        defaultValue={num}
        onChange={(e) => setNum(Number(e.target.value))}
      ></input>
      <p>Trials</p>
      <input
        defaultValue={trials}
        onChange={(e) => setTrials(Number(e.target.value))}
      ></input>
      <br></br>
      <br></br>
      <br></br>

      <button onClick={() => simulate("runCpu")}>Run CPU</button>
      <button onClick={() => simulate("runWasm")}>Run WASM</button>
    </div>
  );
};

export default App;
