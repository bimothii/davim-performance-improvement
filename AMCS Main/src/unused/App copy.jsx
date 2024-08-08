import React, { useState } from "react";
import Matrix from "./Matrix";
import LineSegments from './LineSegments';
import LineSegmentUploader from './LineSegmentUploader'
import LargeImageDisplay from './LargeImageDisplay';
import KnnLongestDistance from "./KNNLongestDistance";

const segmentsBU = [
    {
      startPoint: [0, 0, 0],
      endPoint: [1, 1, 1],
      color: 'red',
    },
    {
      startPoint: [1, 0, 0],
      endPoint: [0, 1, 1],
      color: 'green',
    },
    {
      startPoint: [0, 1, 0],
      endPoint: [1, 0, 1],
      color: 'blue',
    },
  ];

const adjacencyMatrix = [
  [0, 1, 0, 0],
  [1, 0, 1, 0],
  [0, 1, 0, 1],
  [0, 0, 1, 0],
];

const App2 = () => {
    const [selectRegion, setSelectRegion] = useState({
        start: null, end: null 
    });

    const [streamLines, setStreamLines] = useState([]);

    const [segments, setSegments] = useState([]);

    const [matrix, setMatrix] = useState([[]]);

  return (
    <div className="App">
        <LineSegmentUploader setStreamLines={setStreamLines} setSegments={setSegments} setMatrix={setMatrix} />
      <h1>Adjacency Matrix</h1>
      <Matrix matrix={adjacencyMatrix} onSelectRegion={setSelectRegion}/>

    <div style={{ width: '100vw', height: '100vh' }}>
      <LineSegments segments={segments} selectRegion={selectRegion} />
    </div>

    </div>
  );
};

const AppPic = () => {
  return (
    <div className="App">
      <LargeImageDisplay imageUrl="https://i.imgur.com/sKV54PO.jpeg" />
    </div>
  );
};



function App() {
  return (
    <div>
      <h1>KNN Longest Distance Example</h1>
      <KnnLongestDistance />
    </div>
  );
}

export default App;
