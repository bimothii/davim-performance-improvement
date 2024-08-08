import { useState, React } from "react";
import { GPU } from "gpu.js";
const gpu = new GPU();

function Tester() {
  const [startSize, setStartSize] = useState(20);
  const [endSize, setEndSize] = useState(500);
  const [sizeStep, setSizeStep] = useState(20);
  const [trials, setTrials] = useState(20);
  const [K, setK] = useState(10);
  const generateMatrices = (s) => {
    const matrices = [[], []];
    for (let y = 0; y < s; y++) {
      matrices[0].push([]);
      matrices[1].push([]);
      for (let x = 0; x < s; x++) {
        matrices[0][y].push(Math.random());
        matrices[1][y].push(Math.random());
      }
    }
    return matrices;
  };

  const gpuMatrix = (matrices, s) => {
    const kernel = gpu
      .createKernel(function (a, b) {
        let sum = 0;
        for (let i = 0; i < this.constants.size; i++) {
          sum += a[this.thread.y][i] * b[i][this.thread.x];
        }
        return sum;
      })
      .setConstants({ size: s })
      .setOutput([s, s]);
    const newMatrix = kernel(matrices[0], matrices[1]);
  };

  const cpuMatrix = (matrices, s) => {
    const newMatrix = [];
    for (let r = 0; r < s; r++) {
      newMatrix.push([]);
      for (let c = 0; c < s; c++) {
        let sum = 0;
        for (let i = 0; i < s; i++) {
          sum += matrices[0][r][i] * matrices[1][i][c];
        }
        newMatrix[r].push(sum);
      }
    }
  };

  const generatePoints = (s) => {
    const points = [];
    for (let i = 0; i < s; i++) {
      points.push([Math.random() * 1000, Math.random() * 1000]);
    }
    return points;
  };

  const cpuDistance = (points, s) => {
    const distances = [];
    for (let i = 0; i < s; i++) {
      distances.push([]);
      for (let j = 0; j < s; j++) {
        distances[i].push({
          index: j,
          distance:
            Math.sqrt(Math.pow(points[i][0] - points[j][0]), 2) +
            Math.pow(points[i][1] - points[j][1], 2),
        });
      }
    }
  };

  const gpuDistance = (points, s) => {
    const kernel = gpu
      .createKernel(function (points) {
        const i = this.thread.x;
        const j = this.thread.y;
        return Math.sqrt(
          Math.pow(points[i][0] - points[j][0], 2) +
            Math.pow(points[i][1] - points[j][1], 2)
        );
      })
      .setOutput([s, s]);
    const distances = kernel(points);
  };

  const simulateProgram = (type) => {
    let fun = null;
    switch (type) {
      case "gpuMatrix":
        fun = gpuMatrix;
        break;
      case "cpuMatrix":
        fun = cpuMatrix;
        break;
      case "cpuDistance":
        fun = cpuDistance;
        break;
      case "gpuDistance":
        fun = gpuDistance;
        break;
      default:
        break;
    }

    const times = [];
    for (let s = startSize; s <= endSize; s += sizeStep) {
      let data = null;
      switch (type) {
        case "gpuMatrix":
        case "cpuMatrix":
          data = generateMatrices(s);
          break;
        case "cpuDistance":
        case "gpuDistance":
          data = generatePoints(s);
          break;
        default:
          break;
      }
      const start = performance.now();
      for (let q = 0; q < trials; q++) fun(data, s);
      const end = performance.now();
      times.push(((end - start) / trials).toFixed(2));
      console.log(s + " " + times[times.length - 1]);
    }

    let message = "";
    for (let i = 0; i < times.length; i++) message += times[i] + "\n";
    console.log(message);
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <p>Start Size</p>
      <input
        defaultValue={startSize}
        onChange={(e) => setStartSize(Number(e.target.value))}
      />
      <p>End Size</p>
      <input
        defaultValue={endSize}
        onChange={(e) => setEndSize(Number(e.target.value))}
      />
      <p>Size Step</p>
      <input
        defaultValue={sizeStep}
        onChange={(e) => setSizeStep(Number(e.target.value))}
      />
      <p>Trials</p>
      <input
        defaultValue={trials}
        onChange={(e) => setTrials(Number(e.target.value))}
      />
      <p>K</p>
      <input defaultValue={K} onChange={(e) => setK(Number(e.target.value))} />
      <p>Multiplying Two Matrices</p>
      <button onClick={() => simulateProgram("gpuMatrix")}>Run GPU</button>
      <button onClick={() => simulateProgram("cpuMatrix")}>Run CPU</button>
      <p>K Nearest</p>
      <button onClick={() => simulateProgram("gpuDistance")}>Run GPU</button>
      <button onClick={() => simulateProgram("cpuDistance")}>Run CPU</button>
    </div>
  );
}

export default Tester;
