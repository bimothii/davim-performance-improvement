import React, { useState, useEffect } from 'react';
import PopupComponent from './Popup';
import OpacityTable from './OpacityTable';

const LineSegmentUploader= React.memo(({setShowPlotView,showPlotView,setRadius,setTubeRes,swapLayout,setSwapLayout,drawAll, setDrawAll, manualUpdate,setManualUpdate,setStreamLines,
    setSegments, setExclude,settings, setSettings, setSphereRadius, sphereRadius, setObjFile,
    selectionMode, setSelectionMode, shapeMode, setShapeMode, transformMode, setTransformMode, setManualStart, manualProgress, intensity,setIntensity}) => {
  const [lines, setLines] = useState([]);
  const [skipLines, setSkipLines] = useState(0);
  const [skipSegments, setSkipSegments] = useState(0);
  const [file, setFile] = useState(null);
  const [exclude, setExclude2] = useState(-1);
  const [plotview] = useState(true);

  const [numSegments,setNumSegments] = useState(0)

  const handleFileUpload = (event) => {
    setFile(event.target.files[0]);
  };

  const handleOBJUpload = (event) => {
    const fileURL = URL.createObjectURL(event.target.files[0]);
    setObjFile(fileURL);
    return;

    const reader = new FileReader();
    let segments = [];
    reader.readAsText(event.target.files[0]);
    reader.onload = (event) => {
      const text = event.target.result;
      setObjFile(text);
    }
    
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
      let globalIdx = 0, lineIDx = 0;
      const text = event.target.result;
      const streamlines = [];
      let endIDx = 0;
      let lineSkipCount = 0;
      let linesArray = text.trim().split('\n').map(line => {
        lineSkipCount++;
        if (lineSkipCount > 1 && lineSkipCount % skipLines === 0){
          //console.log(lineSkipCount,skipLines,lineSkipCount % skipLines);
          return [];
      }
        //console.log("HHHHERR");
        const coords = line.trim().split(' ').map(parseFloat);
        const streamline = [endIDx];
        const points = [];
        //let segSkipCount = 0;
        let ss = 1;
        if (skipSegments > 1)
          ss = skipSegments;
        for (let i = 0; i < coords.length; i += 4*ss) {
          //segSkipCount++;
          //if (segSkipCount > 0 && segSkipCount % skipSegments === 0)
          //  continue;

            let start = [coords[i], coords[i+1], coords[i+2]];
            let end = [coords[i+4*ss], coords[i+4*ss+1], coords[i+4*ss+2]];
            let midpoint = [  (start[0] + end[0]) / 2,
              (start[1] + end[1]) / 2,
              (start[2] + end[2]) / 2
            ];
            if (!(start.every((num) => !isNaN(num)) &&
              end.every((num) => !isNaN(num)) ))
              continue;

            segments.push({
                startPoint: start,
                endPoint: end,
                midPoint: midpoint,
                color: 'yellow',
                lineIDx:lineIDx,
                globalIdx: globalIdx,
              neighbors: []
            });
          points.push(start);
          points.push(end);

          globalIdx++;
          endIDx = globalIdx;
        }
        streamline.push(endIDx);
        streamlines.push(streamline);
        endIDx++;
        //console.log(points);
        //console.log(points);
        lineIDx++;
        return [points];
      }); 


      // Step 1: Calculate centroids and pairwise distances
      //const centroids = streamlines.map(s => computeCentroid(segments, s));
      const pairwiseDistances = computePairwiseDistances(segments, streamlines);

      // Step 2: Rearrange the streamlines
      let flag = false;
      const rearrangedStreamlines = rearrangeStreamlinesKNN(streamlines, pairwiseDistances, flag,5);

      console.log(streamlines, rearrangedStreamlines)
      // Step 3: Rebuild segments and update streamlines
      const { newSegments, updatedStreamlines } = rebuildSegmentsAndStreamlines(segments, streamlines, rearrangedStreamlines);

      // Update state or variables with new data
      //setSegments(newSegments);
      //setStreamLines(updatedStreamlines);

      linesArray = linesArray.filter(l=>l.length>0);

      //setMatrix(createZeroMatrix(segments.length));
      
      setSegments(segments);
      setStreamLines(streamlines);
      
      setNumSegments(segments.length)
      //console.log(segments);
      //console.log("Streamlines:", streamlines);
      
      
      //console.log(linesArray.length)
      setShowSettings(false);
      setLines(linesArray);
    };
  };

  //------
  function rearrangeStreamlinesKNN(streamlines, distances, flag, k, memorySize = 10) {
    // Compute KNN distances
    let knnDistances = streamlines.map((_, idx) => {
      let dists = distances[idx].map((d, i) => ({ index: i, distance: d }));
      dists.sort((a, b) => a.distance - b.distance);
      return dists.slice(1, k + 1).reduce((sum, d) => sum + d.distance, 0);
    });
  
    // Pair streamlines with their KNN distances
    let pairedStreamlines = streamlines.map((s, idx) => ({ streamline: s, distanceSum: knnDistances[idx] }));
  
    if (flag) {
      // Sort by ascending order for flag = true
      pairedStreamlines.sort((a, b) => a.distanceSum - b.distanceSum);
    } else  {
      let remainingStreamlines = new Set(streamlines.map((_, idx) => idx));
      let arrangedStreamlines = [];
      let recentSelections = []; // Memory of recent selections
  
      // Start with a randomly selected streamline for more variety
      let currentIdx = Array.from(remainingStreamlines)[Math.floor(Math.random() * remainingStreamlines.size)];
      arrangedStreamlines.push(streamlines[currentIdx]);
      recentSelections.push(currentIdx);
      remainingStreamlines.delete(currentIdx);
  
      while (remainingStreamlines.size > 0) {
        let candidates = [];
  
        remainingStreamlines.forEach(idx => {
          if (!recentSelections.includes(idx)) {
            candidates.push({
              index: idx,
              distance: distances[currentIdx][idx]
            });
          }
        });
  
        // Sort candidates by distance, descending
        candidates.sort((a, b) => b.distance - a.distance);
  
        // Select one of the top candidates, but not the farthest to avoid ping-ponging
        let selectIndex = Math.min(candidates.length - 1, Math.floor(Math.random() * Math.min(memorySize, candidates.length)));
        let selected = candidates[selectIndex];
  
        arrangedStreamlines.push(streamlines[selected.index]);
        currentIdx = selected.index;
        recentSelections.push(currentIdx);
        if (recentSelections.length > memorySize) {
          recentSelections.shift(); // Maintain memory size
        }
        remainingStreamlines.delete(currentIdx);
      }
  
      return arrangedStreamlines;
    }
  
    return pairedStreamlines.map(p => p.streamline);
  }

  function computeCentroid(segments, streamline) {
    let sumX = 0, sumY = 0, sumZ = 0;
    let count = 0;
    for (let i = streamline[0]; i < streamline[1]; i++) {
      const midPoint = segments[i].midPoint;
      sumX += midPoint[0];
      sumY += midPoint[1];
      sumZ += midPoint[2];
      count++;
    }
    return [sumX / count, sumY / count, sumZ / count];
  }
  function distance(point1, point2) {
    return Math.sqrt(
      Math.pow(point1[0] - point2[0], 2) +
      Math.pow(point1[1] - point2[1], 2) +
      Math.pow(point1[2] - point2[2], 2)
    );
  }

  function averagePairwiseDistance(segments, streamline1, streamline2) {
    let totalDistance = 0;
    let count = 0;
  
    for (let i = streamline1[0]; i < streamline1[1]; i++) {
      for (let j = streamline2[0]; j < streamline2[1]; j++) {
        totalDistance += distance(segments[i].midPoint, segments[j].midPoint);
        count++;
      }
    }
  
    return count > 0 ? totalDistance / count : 0;
  }
  
  function computePairwiseDistances(segments, streamlines) {
    let distances = Array(streamlines.length).fill(null).map(() => Array(streamlines.length).fill(0));
  
    for (let i = 0; i < streamlines.length; i++) {
      for (let j = i + 1; j < streamlines.length; j++) {
        const dist = averagePairwiseDistance(segments, streamlines[i], streamlines[j]);
        distances[i][j] = dist;
        distances[j][i] = dist; // Since the distance is symmetric
      }
    }
  
    return distances;
  }
  
  
  function computePairwiseDistancesFAST(segments, streamlines) {
    let distances = [];
    let centroids = streamlines.map(s => computeCentroid(segments, s));
    for (let i = 0; i < centroids.length; i++) {
      let dist = [];
      for (let j = 0; j < centroids.length; j++) {
        if (i === j) {
          dist.push(0);
        } else {
          dist.push(distance(centroids[i], centroids[j]));
        }
      }
      distances.push(dist);
    }
    return distances;
  }
  function rebuildSegmentsAndStreamlines(segments, oldStreamlines, newStreamlines) {
    let newSegments = [];
    let updatedStreamlines = [];
  
    newStreamlines.forEach(streamline => {
      let newStartIdx = newSegments.length;
      for (let i = streamline[0]; i < streamline[1]; i++) {
        newSegments.push(segments[i]);
      }
      let newEndIdx = newSegments.length;
      updatedStreamlines.push([newStartIdx, newEndIdx]);
    });
  
    return { newSegments, updatedStreamlines };
  }
  function rearrangeStreamlines(streamlines, distances, flag) {
    // Calculate the sum of distances for each streamline
    let distanceSums = streamlines.map((_, idx) => {
      return distances[idx].reduce((sum, d) => sum + d, 0);
    });
  
    // Pair each streamline with its distance sum
    let pairedStreamlines = streamlines.map((s, idx) => {
      return { streamline: s, distanceSum: distanceSums[idx] };
    });
  
    // Sort based on the sum of distances
    pairedStreamlines.sort((a, b) => {
      return flag ? a.distanceSum - b.distanceSum : b.distanceSum - a.distanceSum;
    });
  
    // Extract the sorted streamlines
    return pairedStreamlines.map(p => p.streamline);
  }
  
//------  

  const handleExcludeChange = (event) => {
      setExclude2(event.target.value);
      setExclude(Number(event.target.value));
  };

  const [items] = useState(['Item 1', 'Item 2', 'Item 3', 'Item 4']);

    const handleLoad = () => {
        // Put the logic for what should happen when you click the load button here
        console.log('Load button pressed');
    };

    const [algorithm, setAlgorithm] = useState('KNN');
    const [param, setParam] = useState('1');
    const [distanceMetric, setDistanceMetric] = useState('shortest');
    const [showSettings, setShowSettings] = useState(true);

    const [progress, setProgress] = useState(0);

    useEffect(()=>{
      setProgress(manualProgress);
    }, [manualProgress])

    const handleStart = () =>{setManualStart(true);}
    const handleAlgorithmChange  = ()=>{}
    const handleParamChange  = (event)=>{
      setParam(event.target.value);
    }
    const handleDistanceMetricChange  = ()=>{}

  return (
    <div>
      {/*
      <OpacityTable/>*/}
      <input type="file" onChange={handleFileUpload} />
      <button onClick={handleUpload}>Upload</button> <br/>

      {/*<input type="file" onChange={handleOBJUpload} />
      <button onClick={()=>{}}>Upload OBJ</button>*/}


      {/*<button onClick={()=>{setSwapLayout(!swapLayout)}}>Swap Layout</button>
      <PopupComponent items={items} handleLoad={handleLoad} />*/}
  <br/>
      Streamlines: {lines.length}
      &nbsp; Segments:  {numSegments}
      {/* {lines.map((line, i) => (
        <div key={i}>
          {line.map((point, j) => (
            <span key={j}>[{point.join(', ')}]</span>
          ))}
        </div>
      ))} */}
      <br/>
      <label>
          Intensity:
          <input style={{ maxWidth: '45px' }} type="number" value={intensity} onChange={((e)=>{setIntensity(Number(e.target.value))})} />
        </label>

      <button onClick={()=>{setShowSettings(!showSettings)}}>{'<'} Show Settings</button> 
      {showSettings && <div>
      <label>
          Skip every x lines:
          <input style={{ maxWidth: '45px' }} type="number" value={skipLines} onChange={((e)=>{setSkipLines(Number(e.target.value)+1)})} />
        </label>&nbsp;
        <label>
          Merge x segments together:
          <input style={{ maxWidth: '45px' }} type="number" value={skipSegments} onChange={((e)=>{setSkipSegments(Number(e.target.value))})} />
        </label>
        <label>
          PlotView:
          <input
            type="checkbox"
            checked={showPlotView}
            onChange={()=>{
                setShowPlotView(!showPlotView);
            }}
          />
        </label> <br/>
      <label>
          Exclude close segments:
          <input style={{ maxWidth: '45px' }} type="number" value={exclude} onChange={(handleExcludeChange)} />
        </label><br/>
        <label>
          Tube Radius:
          <input defaultValue={0.45} style={{ maxWidth: '45px' }} type="number" onChange={(e)=>{setRadius(Number(e.target.value));}} />
        </label>
        <label>
          Tube Resolution:
          <input defaultValue={20} style={{ maxWidth: '45px' }} type="number" onChange={(e)=>{setTubeRes(Number(e.target.value));}} />
        </label>
        </div>}
        <label>
        
      <input
        type="checkbox"
        checked={manualUpdate}
        onChange={()=>{
            setManualUpdate(!manualUpdate);
        }}
      />
      Manual Update
      </label>
      <label>
      <input
        type="checkbox"
        checked={drawAll}
        onChange={()=>{
            setDrawAll(!drawAll);
        }}
      />
      Draw all segments
      </label><br/>
      {false &&
        <div>
          <label>
           Sphere Radius:
          <input style={{ maxWidth: '45px' }} type="number" value={sphereRadius} onChange={(function(event){setSphereRadius(Number(event.target.value))})} />
        </label><label>
      &nbsp;Select Mode:
        <select value={selectionMode} onChange={function(event){
          setSelectionMode(event.target.value);
        }}>
          <option value="Set">Set</option>
          <option value="Add">Add</option>
          <option value="Remove">Remove</option>
        </select>
      </label><label>
      &nbsp;Transform Mode:
        <select value={transformMode} onChange={function(event){
          setTransformMode(event.target.value);
        }}>
          <option value="translate">Translate</option>
          <option value="rotate">Rotate</option>
          <option value="scale">Scale</option>
        </select>
      </label>
      <label>
      &nbsp;Shape Mode:
        <select value={shapeMode} onChange={function(event){
          setShapeMode(event.target.value);
        }}>
          <option value="Sphere">Sphere</option>
          <option value="Cube">Cube</option>
        </select>
      </label>
      </div>
      }
      
      <br/>
      <hr/>
      <center>Generate CSNG</center>
      <div>
      <label>
        Algorithm:
        <select value={algorithm} onChange={handleAlgorithmChange}>
          <option value="KNN">KNN</option>
          <option value="RBN">RBN</option>
        </select>
      </label>&nbsp;
      {algorithm === 'KNN' && (
        <label>
          K:
          <input style={{ maxWidth: '45px' }} type="number" value={param} onChange={handleParamChange} />
        </label>
      )}
      {algorithm === 'RBN' && (
        <label>
          R:
          <input style={{ maxWidth: '45px' }} type="number" value={param} onChange={handleParamChange} />
        </label>
      )}
      <label>
      &nbsp;Distance:
        <select value={distanceMetric} onChange={handleDistanceMetricChange}>
          <option value="shortest">Shortest</option>
          <option value="longest">Longest</option>
          <option value="haustoff">Haustoff</option>
        </select>
      </label>
      <button onClick={handleStart}>Start</button> 
      <progress style={{ width: '60px' }} value={progress} max="100"></progress>
      
      </div>
      
    </div>
  );
});

export default LineSegmentUploader;
