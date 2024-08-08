import React, { useState } from 'react';

function LineSegmentUploader({setStreamLines,setSegments,setMatrix}) {
  const [lines, setLines] = useState([]);
  const [file, setFile] = useState(null);

  const handleFileUpload = (event) => {
    setFile(event.target.files[0]);
  };

  function createZeroMatrix(n) {
    let matrix = new Array(n);
    for (let i = 0; i < n; i++) {
      matrix[i] = new Array(n);
      for (let j = 0; j < n; j++) {
        matrix[i][j] = 0;
      }
    }
    return matrix;
  }
  

  const handleUpload  = (event) => {
    const reader = new FileReader();
    let segments = [];
    reader.readAsText(file);
    reader.onload = (event) => {
        
      const text = event.target.result;
      const linesArray = text.trim().split('\n').map(line => {
        const coords = line.trim().split(' ').map(parseFloat);
        const points = [];
        for (let i = 0; i < coords.length; i += 4) {
            let start = [coords[i], coords[i+1], coords[i+2]];
            let end = [coords[i+4], coords[i+5], coords[i+6]];

            segments.push({
                startPoint: start,
                endPoint: end,
                color: 'blue',
            });
          points.push(start);
          points.push(end);
        }
        //console.log(points);
        
        return points;
      });
      setMatrix(createZeroMatrix(segments.length));
      setSegments(segments);
      setStreamLines(linesArray);
      setLines(linesArray);
    };
  };

  return (
    <div>
      <input type="file" onChange={handleFileUpload} />
      <button onClick={handleUpload}>Upload</button>
      <br/>
      Streamlines: {lines.length}
      {/* {lines.map((line, i) => (
        <div key={i}>
          {line.map((point, j) => (
            <span key={j}>[{point.join(', ')}]</span>
          ))}
        </div>
      ))} */}
    </div>
  );
}

export default LineSegmentUploader;
