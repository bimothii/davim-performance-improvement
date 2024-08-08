import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Image } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { PanAndZoom } from 'react-konva-utils';
import KNNComponent from './KNNComponent';
import {findRBN,computeDiagonalLength,computeBounds,createLineSegmentKDTree, findKNearestNeighbors, processSegments } from './knnHelper';
// Create a new web worker
const worker = new Worker('worker.js');

const HugeCanvas = ({layerProps, onLayerChange,segments,streamLines, setSegmentsSelected}) => {
  const layerRef = useRef();
  const { x, y, scaleX, scaleY } = layerProps;
  useEffect(() => {
    console.log("SL: ", streamLines)
    
  }, [streamLines]);

  useEffect(() => {
    console.log("segs: ", segments)
    
  }, [segments]);

  useEffect(() => {
    //console.log("updated")
    const layer = layerRef.current;
    layer.x(x);
    layer.y(y);
    layer.scaleX(scaleX);
    layer.scaleY(scaleY);
    layer.batchDraw();
  }, [x, y, scaleX, scaleY]);

  const updateLayerProps = ()=>{
    const layer = layerRef.current;
    onLayerChange({
      x: layer.x(),
      y: layer.y(),
      scaleX: layer.scaleX(),
      scaleY: layer.scaleY(),
    });
  }

  //const [segments, setSegments] = useState(initsegments);
  const [grid, setGrid] = useState([]);
  const [graph, setGraph] = useState([]);
  const [existingPixels, setExistingPixels] = useState({});
  const [selection, setSelection] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [selectMode, setSelectMode] = useState("area");
  const [selection2, setSelection2] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [image, setImage] = useState(createWhiteImage(500, 500,10000));
    ///UI
    const [algorithm, setAlgorithm] = useState('KNN');
    const [param, setParam] = useState('');
    const [distanceMetric, setDistanceMetric] = useState('shortest');
    const [progress, setProgress] = useState(0);
    
    const handleSelectMethodChange = (event)=>{
      setSelectMode(event.target.value);
    }
    const handleAlgorithmChange = (event) => {
        setAlgorithm(event.target.value);
    };
    
    const handleParamChange = (event) => {
        setParam(event.target.value);
    };
    
    const handleDistanceMetricChange =  (event) => {
        setDistanceMetric(event.target.value);
    };
    ///
    const handleStart = async () =>{
      //check params first
      //console.log(segments)
      const lineSegments = processSegments(segments);
      let KR = param;
      if (algorithm=='RBN'){
        const bounds = computeBounds(lineSegments);
        KR = KR * computeDiagonalLength(bounds);
      }
      const tgraph = [];
      let lastProgress = 0;
      const pixels = [];
      const tree = createLineSegmentKDTree(lineSegments);
      for (let i=0; i <  lineSegments.length; i++){
        //for (let i=0; i <  2; i++){
        const segment = lineSegments[i];
        const fun = (algorithm=='RBN')? findRBN:findKNearestNeighbors;

        const neighbors = fun(tree, segment, lineSegments, KR);
        tgraph.push(neighbors);
        neighbors.forEach(n => {
          //segments[n].color = 'blue';
          pixels.push([i,n]);
          //pixels.push([n,i]);
        });
        
        const progress = Math.floor(i / lineSegments.length * 100);
        if (progress % 10 === 0 && progress !== lastProgress) {
          setProgress(progress);
          lastProgress = progress;
          //console.log(progress);
        }
      }
      setGraph(tgraph);
      //console.log(pixels);
      //console.log(streamlines)
      setPixels(pixels, streamLines);
    }



    useEffect(()=>{
      renderCanvasGrid(image,10000);
    },[image])

  ////
  const handleMouseDown = (e) => {
    if (e.evt.button === 1) {
      // Make the layer draggable
      layerRef.current.draggable(true);
    }
    if (e.evt.button != 0) return;
    e.evt.stopPropagation();
    const pos = e.target.getStage().getPointerPosition();
    const scaleX = 1/layerRef.current.scaleX();
    setSelection({
      ...selection,
      x: Math.floor(pos.x*scaleX-layerRef.current.x()*scaleX),
      y: Math.floor(pos.y*scaleX-layerRef.current.y()*scaleX),
      width: 0,
      height: 0,
    });
    //console.log(pos.x+layerRef.current.x(),
    //pos.y+layerRef.current.y())
  };

  const handleMouseMove = (e) => {
    if (!e.evt.buttons || e.evt.buttons !== 1) return;
    const pos = e.target.getStage().getPointerPosition();
    const scaleX = 1/layerRef.current.scaleX();
    if (selectMode == "single"){
      setSelection({
        x: Math.floor(pos.x*scaleX-layerRef.current.x()*scaleX),
        y: Math.floor(pos.y*scaleX-layerRef.current.y()*scaleX),
        width: 1,
        height: 1,
      });
    }else if (selectMode == "area"){
      setSelection({
        ...selection,
        width: Math.floor(pos.x*scaleX-layerRef.current.x()*scaleX - selection.x),
        height: Math.floor(pos.y*scaleX-layerRef.current.y()*scaleX - selection.y),
      });
    }else if (selectMode == "row"){
      setSelection({
        ...selection,
        x: 0,
        width: segments.length,
        height: Math.floor(pos.y*scaleX-layerRef.current.y()*scaleX - selection.y),
      });
    }else if (selectMode == "col"){
      setSelection({
        ...selection,
        y:0,
        width: Math.floor(pos.x*scaleX-layerRef.current.x()*scaleX - selection.x),
        height: segments.length,
      });
    }
  };

  function matrixSubregionIndexRanges(n, x, y, width, height) {
    // Ensure the subregion is within the matrix
    if (x < 0 || y < 0 || x + width > n || y + height > n) {
      throw new Error('Invalid subregion bounds');
    }
  
    // Initialize the index ranges
    let aboveDiagonalColumnIndexes = [];
    let belowDiagonalRowIndexes = [];
  
    // Iterate through the subregion
    for (let i = y; i < y + height; i++) {
      for (let j = x; j < x + width; j++) {
        // Check if the position is above or below the matrix diagonal
        if (i < j) {
          // Above the matrix diagonal
          if (!aboveDiagonalColumnIndexes.includes(j)) {
            aboveDiagonalColumnIndexes.push(j);
          }
        } else if (i > j) {
          // Below the matrix diagonal
          if (!belowDiagonalRowIndexes.includes(i)) {
            belowDiagonalRowIndexes.push(i);
          }
        }
      }
    }
  
    // Sort the index ranges
    aboveDiagonalColumnIndexes.sort((a, b) => a - b);
    belowDiagonalRowIndexes.sort((a, b) => a - b);
  
    return {
      aboveDiagonalColumnIndexes,
      belowDiagonalRowIndexes,
    };
  }
  
  function listIndicesInRange(a, b, c, d) {
    const indices = [];
  
    // First, find the range limits that cover both input ranges
    const minRange = Math.min(a, c);
    const maxRange = Math.max(b, d);
  
    // Iterate over the combined range
    for (let i = minRange; i <= maxRange; i++) {
      // Add the index to the list if it belongs to either of the input ranges
      if ((i >= a && i <= b) || (i >= c && i <= d)) {
        indices.push(i);
      }
    }
  
    return indices;
  }
  
  
  
  

  const handleMouseUp = (e) => {
    if (e.evt.button === 1) {
      // Make the layer non-draggable
      layerRef.current.draggable(false);
    }
    //console.log('Selected region:', selection);
    const ranges = matrixSubregionIndexRanges(segments.length, selection.x, selection.y,
      selection.width,selection.height);

    //for (let i=selection.x; i < selection.x + selection.width;i++){
    for (let i of ranges.aboveDiagonalColumnIndexes){
      const neighbors = graph[i];
      neighbors.forEach(n=>{
        if //(n > selection.x && n < selection.x+ selection.width) 
           (n > selection.y && n < selection.y+selection.height)
          segments[n].color = 'blue';
      })
    }

    //for (let i=selection.y; i < selection.y + selection.height;i++){
      for (let i of ranges.belowDiagonalRowIndexes){
      if (i < 0 || i > segments.length -1)
        continue;
      const neighbors = graph[i];
      neighbors.forEach(n=>{
        if ((n > selection.x && n < selection.x+ selection.width) )
        //  if (n > selection.y && n < selection.y+selection.height)
          segments[n].color = 'blue';
      })
    }

    
    console.log(ranges)
    for (let aboveIdx of ranges.aboveDiagonalColumnIndexes){
      if (segments[aboveIdx].globalIdx != aboveIdx)
        console.log(aboveIdx,segments[aboveIdx].globalIdx);
      console.log(aboveIdx);
      segments[aboveIdx].color = 'orange';
    }
    for (let belowIdx of ranges.belowDiagonalRowIndexes){
      segments[belowIdx].color = 'orange';
    }

    const selectedRange = listIndicesInRange(selection.x,selection.x+selection.width,selection.y,selection.y+selection.height);
    const selected = [];
    selectedRange.forEach(n => {
      selected.push(segments[n]);
    });
    
    //console.log(selection.x,selection.x+selection.width,selection.y,selection.y+selection.height);
    //console.log(selectedRange);
    //console.log(selected)
  
    //console.log(selection,selected);
    setSegmentsSelected(selected);
    setSelection2(selection);
    updateLayerProps();
  };

  const handleWrapperMouseDown = (e) => {
    // Disable panning with the left mouse button (0)
    if (e.button === 0) {
      e.stopPropagation();
    }
  };
  ////
  function createWhiteImage(width, height, tileSize) {
    const rows = Math.ceil(height / tileSize);
    const cols = Math.ceil(width / tileSize);
    //console.log(height,height / tileSize,rows,cols);
    const canvases = new Array(rows).fill(null).map(() => new Array(cols).fill(null));
  
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const canvas = document.createElement("canvas");
        canvas.width = tileSize;
        canvas.height = tileSize;
        const context = canvas.getContext("2d");
        context.fillStyle = "white";
        context.fillRect(0, 0, tileSize, tileSize);
  
        canvases[i][j] = canvas;
      }
    }
  
    return canvases;
  }
  
  function drawRectangle(canvases, x, y, width, height, color, tileSize) {
    const startX = Math.floor(x / tileSize);
    const startY = Math.floor(y / tileSize);
    const endX = Math.floor((x + width - 1) / tileSize);
    const endY = Math.floor((y + height - 1) / tileSize);
  
    for (let i = startY; i <= endY; i++) {
      for (let j = startX; j <= endX; j++) {
        if (!canvases[i])
          continue;
        const canvas = canvases[i][j];
        if (!canvas)
          continue;
        const ctx = canvas.getContext("2d");
  
        const localX = j === startX ? x % tileSize : 0;
        const localY = i === startY ? y % tileSize : 0;
        const localWidth = j === endX ? (x + width) % tileSize || tileSize : tileSize - localX;
        const localHeight = i === endY ? (y + height) % tileSize || tileSize : tileSize - localY;
  
        ctx.fillStyle = color;
        ctx.fillRect(localX, localY, localWidth, localHeight);
      }
    }
  }
  
  function fillBlackPixels(canvases, pixelList, tileSize) {
    pixelList.forEach((pixel) => {
      const x = pixel[0];
      const y = pixel[1];
      const row = Math.floor(y / tileSize);
      const col = Math.floor(x / tileSize);
      const canvas = canvases[row][col];
      const context = canvas.getContext("2d");
      context.fillStyle = "black";
      context.fillRect(x % tileSize, y % tileSize, 1, 1);
    });
  }
  

  const setPixels = useCallback((pixels,streamlines)=>{
    const tileSize = 10000;
    const canvas = createWhiteImage(segments.length, segments.length,tileSize);
    let rects = []
    for (let i = 0; i < streamlines.length; i++) {
      for (let j = 0; j < streamlines.length; j++) {
        let sl1 = streamlines[i];
          let sl2 = streamlines[j];
        // Set the value at each position based on its position
        if ((i + j) % 2 === 0) {
          //1
          
          
          rects.push([sl1[0], sl2[0], sl1[1]-sl1[0],sl2[1]-sl2[0]]);
          //console.log( sl1[0], sl2[0], sl1[1]-sl1[0],sl2[1]-sl2[0])
          drawRectangle(canvas, sl1[0], sl2[0], sl1[1]-sl1[0],sl2[1]-sl2[0],"#F3F3F3",tileSize);
        } else {
          drawRectangle(canvas, sl1[0], sl2[0], sl1[1]-sl1[0],sl2[1]-sl2[0],"white",tileSize);
          //0
        }
      }
    }
    //console.log(rects);
    //console.log(matrix)
    fillBlackPixels(canvas, pixels,tileSize);
    setImage(canvas);
    //console.log(canvas.toDataURL('image/png'));
  })

  const handleLoad = (image) => {
    // Disable image smoothing
    image.imageSmoothingEnabled(false);
  };

  function renderCanvasGrid(canvases, tileSize) {
    const images = [];

    for (let i = 0; i < canvases.length; i++) {
      for (let j = 0; j < canvases[i].length; j++) {
        const canvas = canvases[i][j];
        
        images.push(
          <Image
            key={`${i}-${j}`}
            image={canvas}
            x={j * tileSize}
            y={i * tileSize}
            onLoad={handleLoad}
          />
        );
      }
    }
    console.log(canvases,images.length,images)
    //return images;
    setGrid(images);
  }


  const addPixel = useCallback((newPixel) => {
    //console.log(Konva.Rect);
    if (!existingPixels[newPixel.id]) {
      const rect = new Konva.Rect({
        id: `pixel-${newPixel.id}`,
        x: newPixel.x,
        y: newPixel.y,
        width: 100,
        height: 100,
        fill: newPixel.color,
      });
      layerRef.current.add(rect);
      layerRef.current.batchDraw();
      setExistingPixels((prevPixels) => ({ ...prevPixels, [newPixel.id]: rect }));
    }
  }, [existingPixels]);

  const handleAddPixel = () => {
    const newPixel = {
      id: Date.now(), // Use a unique ID for the new pixel
      x: Math.floor(Math.random() * 5000),
      y: Math.floor(Math.random() * 5000),
      color: 'black',
    };
    addPixel(newPixel);
  };

  const handleWheel = (e) => {
    const SCALE_BY = 1.05;
    e.evt.preventDefault();
  
    const layer = layerRef.current;
    const oldScale = layer.scaleX();
  
    const pointer = layer.getStage().getPointerPosition();
  
    const mousePointTo = {
      x: (pointer.x - layer.x()) / oldScale,
      y: (pointer.y - layer.y()) / oldScale,
    };
  
    const newScale = e.evt.deltaY > 0 ? oldScale / SCALE_BY : oldScale * SCALE_BY;
  
    layer.scale({ x: newScale, y: newScale });
  
    const newPosition = {
      x: -(mousePointTo.x * newScale - pointer.x),
      y: -(mousePointTo.y * newScale - pointer.y),
    };
  
    layer.position(newPosition);
    layer.batchDraw();
    //updateLayerProps();
  };
  
  const MemoizedRect = React.memo(({ selection2 }) => (
    <Rect
      x={selection2.x}
      y={selection2.y}
      width={selection2.width}
      height={selection2.height}
      fill="rgba(0, 0, 255, 0.5)"
      listening={false}
    />
  ));

  //layerRef.current.pixelRatio(layerRef.current.pixelRatio/SCALE_BY);
  return (
    <div style={{height: '100%',
        width: '100%',
        overflow:'hidden'}}>
      <div>
      <select value={selectMode} onChange={handleSelectMethodChange}>
          <option value="single">Single</option>
          <option value="area">Area</option>
          <option value="row">Row</option>
          <option value="col">Column</option>
        </select>
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
      &nbsp;Distance Metric:
        <select value={distanceMetric} onChange={handleDistanceMetricChange}>
          <option value="shortest">Shortest</option>
          <option value="longest">Longest</option>
          <option value="haustoff">Haustoff</option>
        </select>
      </label>
      <button onClick={handleStart}>Start</button> 
      <progress style={{ width: '100%' }} value={progress} max="100"></progress>
    </div>
      <Stage 
            style={{
                backgroundColor:'white'
              }}
              width = {600}
              height = {600}
              onContextMenu={(e)=>{e.evt.preventDefault();}}
              
                >
            <Layer ref={layerRef} onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}>
            {grid}
            <MemoizedRect selection2={selection2} />
            </Layer>
        </Stage>
    </div>
  );
};

export default HugeCanvas;
