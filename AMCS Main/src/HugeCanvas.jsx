import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Image } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { PanAndZoom } from 'react-konva-utils';
import KNNComponent from './KNNComponent';
import {findRBN,computeDiagonalLength,computeBounds,createLineSegmentKDTree, findKNearestNeighbors, processSegments, lineSegmentDistance } from './knnHelper';
// Create a new web worker
import MUworkerT from './MU.worker.js';
import AMCSworkerT from './AMCS.worker.js';

import { scaleLinear } from 'd3-scale';
import { interpolateHsl, interpolateRgb } from 'd3-interpolate';
import { rgb } from 'd3-color';
import OpacityTable from './OpacityTable.js';


const MUworker = new MUworkerT();
let AMCSworker = new AMCSworkerT();
let AMCSworker2 = new AMCSworkerT();

const HugeCanvas = React.memo(({selectedSegment,cid, manualUpdate,layerProps, exclude, onLayerChange,segments2,streamLines2, setSegmentsSelected,canvasData, 
  setCanvasData,setGraphData, setDGraphData,pixelData,setPixelData, pixelMapData,setCSNG,setDGraph, manualStart, setManualProgress}) => {
  const layerRef = useRef();
  const stageRef = useRef();
  const { x, y, scaleX, scaleY, updateId } = layerProps;
  const [streamLines, setStreamlines] = useState([]);
  const [segments, setSegments] = useState([]);
  const[showDiv,setShowDiv] = useState(false);
  const [currentPixels, setCurrentPixels] = useState([])
  const [opacities,setOpacities] = useState([
    { target: 0, alpha: 1 },
    { target: 1, alpha: 0 }
  ]);

  const [slRange, setSlRange] = useState(false);

  useEffect(()=>{
    if (manualStart){
      handleStart();
    }
  },[manualStart])

  function interpolateAlpha(target) {
      let arr = opacities;
      // Sort the array by target values
      arr.sort((a, b) => a.target - b.target);

      // Handle edge case: target is less than the lowest target
      if (target < arr[0].target) {
          return arr[0].alpha;
      }

      // Handle edge case: target is higher than the highest target
      if (target > arr[arr.length - 1].target) {
          return arr[arr.length - 1].alpha;
      }

      // Find the two adjacent targets and interpolate
      for (let i = 0; i < arr.length - 1; i++) {
          if (target >= arr[i].target && target <= arr[i + 1].target) {
              // Linear interpolation
              const proportion = (target - arr[i].target) / (arr[i + 1].target - arr[i].target);
              return arr[i].alpha + proportion * (arr[i + 1].alpha - arr[i].alpha);
          }
      }

      // Return null if the target is not within the range of the array
      return 0;
  }


  useEffect(()=>{
    setStreamlines(streamLines2);
    setSegments(segments2);
    
  }, [canvasData])

  useEffect(() => {
    //console.log("SL: ", streamLines2)
    setStreamlines(streamLines2);
    
  }, [streamLines2]);

  useEffect(() => {
    setSegments(segments2);
    
  }, [segments2]);

  useEffect(()=>{
    if (pixelData && pixelData!=currentPixels){
      setPixelsNoUpdate(pixelData);
      setPixelData(currentPixels);
    }
  },[pixelData])

  useEffect(() => {
    //console.log("updated")

    const layer = layerRef.current;
    layer.x(x);
    layer.y(y);
    layer.scaleX(scaleX);
    layer.scaleY(scaleY);
    layer.batchDraw();

    if (!manualUpdate && updateId != cid)
      updateView();

  }, [x, y, scaleX, scaleY, updateId]);

  const updateLayerProps = ()=>{
    const layer = layerRef.current;
    onLayerChange({
      x: layer.x(),
      y: layer.y(),
      scaleX: layer.scaleX(),
      scaleY: layer.scaleY(),
      updateId:cid
    });
  }



  //const [segments, setSegments] = useState(initsegments);
  const [minMax, setMinMax] = useState([0,1]);
  //const [dGraph, setDGraph] = useState([]);
  const [snap, setSnap] = useState(true);
  const [grid, setGrid] = useState([]);
  const [graph, setGraph] = useState([]);
  const [graph2, setGraph2] = useState([]);
  const [existingPixels, setExistingPixels] = useState({});
  const [selection, setSelection] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [selectMode, setSelectMode] = useState("area");
  const [selection2, setSelection2] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [image, setImage] = useState(createWhiteImage(500, 500,1000));
    ///UI
    const [algorithm, setAlgorithm] = useState('KNN');
    const [param, setParam] = useState('1');
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
    ///UI2
    const [algorithm2, setAlgorithm2] = useState('KNN');
    const [param2, setParam2] = useState('60');
    const [distanceMetric2, setDistanceMetric2] = useState('shortest');
    const [progress2, setProgress2] = useState(0);
    
    const handleSelectMethodChange2 = (event)=>{
      setSelectMode2(event.target.value);
    }
    const handleAlgorithmChange2 = (event) => {
        setAlgorithm2(event.target.value);
    };
    
    const handleParamChange2 = (event) => {
        setParam2(event.target.value);
    };
    
    const handleDistanceMetricChange2 =  (event) => {
        setDistanceMetric2(event.target.value);
    };
    ///

    const handleStart = async () =>{
      //check params first
      //console.log(segments)
      AMCSworker.addEventListener('message', AMCSWorkerFunc,false);
      //params, segments, algorithm, distanceMetric
      AMCSworker.postMessage({
        doSort:doSort,
        param:param,
        segments2:segments,
        algorithm:algorithm,
        distanceMetric:distanceMetric,
        streamlines2:streamLines2,
        exclude:exclude,
        sortType:sortType
      });
    }

    const updateSlRangeBU = (pixels) =>{
      const slR = {};
      pixels.forEach(px=>{
        for (var i=0; i< 2;i++){
          const idx = segments[px[i]].lineIDx;
          if (!slR[idx]){
            slR[idx] = [px[2],px[2]];
          }else{
            slR[idx][0] = Math.min(px[2], slR[idx][0]);
            slR[idx][1] = Math.max(px[2], slR[idx][1]);
          }
        }
      })
      setSlRange(slR);
      console.log("UPDATE SL RANGE")
      console.log(slR);
    }

    const updateSlRange = (pixels) =>{
      const slR = {};
      pixels.forEach(px=>{
        const idx1 = segments[px[0]].lineIDx;
        const idx2 = segments[px[1]].lineIDx;
        let key = `${idx1},${idx2}`
          if (!slR[key]){
            slR[key] = [px[2],px[2]];
          }else{
            slR[key][0] = Math.min(px[2], slR[key][0]);
            slR[key][1] = Math.max(px[2], slR[key][1]);
          }
      })
      setSlRange(slR);
      console.log("UPDATE SL RANGE")
      console.log(slR);
    }

    
    const AMCSWorkerFunc = (event) => {
      if (event.data.type == "final"){
        setProgress(100);
        setManualProgress(100);
        //console.log(event.data);
        AMCSworker.removeEventListener('message', AMCSWorkerFunc);
        setGraph(event.data.tgraph);
        window.tempGraph = event.data.tgraph
        console.log("graph: ")
        console.log(event.data.tgraph)

        let graphSize = 0;
        event.data.tgraph.forEach(edges=>{
          graphSize += edges.length;
        })

        console.log('GRAPH SIZE: ', graphSize);
        
        console.log("DGRAPH:")
        console.log(event.data.dgraph)
        setDGraph(event.data.dgraph);
        setMinMax([event.data.minDist, event.data.maxDist])
        console.log("MINMAX:");
        console.log([event.data.minDist, event.data.maxDist])
        setDGraphData(event.data.tgraph);
        //setCSNG()
        const sl = (doSort)?event.data.streamlines:streamLines;
        //setPixelsM(event.data.pixels, sl);

        //disabled for graph test!!!
        //disabled for initial matrix only show cluster matrix
        //setPixels(event.data.pixels, sl);

        updateSlRange(event.data.pixels);

        setCurrentPixels(event.data.pixels)
        setPixelData(event.data.pixels);
        if (doSort){
          setSegments(event.data.segments);
          setStreamlines(event.data.streamlines);
        }
        
      }else if (event.data.type == "progress"){
        setProgress(event.data.progress);
        setManualProgress(event.data.progress);
      }
    }

    const handleStart2 = async () =>{
      //check params first
      //console.log(segments)
      AMCSworker2.addEventListener('message', AMCSWorkerFunc2,false);
      //params, segments, algorithm, distanceMetric
      AMCSworker2.postMessage({
        doSort:doSort,
        param:param2,
        segments2:segments,
        algorithm:algorithm2,
        distanceMetric:distanceMetric2,
        streamlines2:streamLines2,
        exclude:exclude,
        sortType:sortType
      });
    }
    const AMCSWorkerFunc2 = (event) => {
      if (event.data.type == "final"){
        setProgress2(100);
        //console.log(event.data);
        AMCSworker2.removeEventListener('message', AMCSWorkerFunc2);
        setGraph2(event.data.tgraph);
        const sl = (doSort)?event.data.streamlines:streamLines;
        setPixels2(event.data.pixels, sl, event.data.tgraph);
        if (doSort){
          setSegments(event.data.segments);
          setStreamlines(event.data.streamlines);
        }
        
      }else if (event.data.type == "progress"){
        setProgress2(event.data.progress);
      }
    }


    
    const previousImage = useRef(null);

    useEffect(() => {
      // Store the current image in a ref
      return () => {
        if (previousImage.current) {
        const cols = previousImage.current.length;
    
        // Use the previous image for clean-up
        //removeCanvasGrid(previousImage.current, cols, cols);
        }
      };
    }, [grid]);

    useEffect(() => {
      updateView();
    
      // Store the current image in a ref
      
      
    }, [image]);

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
    let xx = Math.floor(pos.x*scaleX-layerRef.current.x()*scaleX);
    let yy = Math.floor(pos.y*scaleX-layerRef.current.y()*scaleX);
    if (snap){
      let sl = streamLines;
      if (pixelMapData)
        sl = computeStreamlinesMap();
      sl.forEach(sl=>{
        if (xx >= sl[0] && xx <= sl[1])
          xx = sl[0]-1;
        if (yy >= sl[0] && yy <= sl[1])
          yy = sl[0]-1;
      })
    }

    
    setSelection({
      ...selection,
      x: xx,
      y: yy,
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
    let xx = Math.floor(pos.x*scaleX-layerRef.current.x()*scaleX);
    let yy = Math.floor(pos.y*scaleX-layerRef.current.y()*scaleX);
    let ww = Math.floor(pos.x*scaleX-layerRef.current.x()*scaleX - selection.x);
    let hh = Math.floor(pos.y*scaleX-layerRef.current.y()*scaleX - selection.y);

    if (snap){
      streamLines.forEach(sl=>{
        if (xx >= sl[0] && xx <= sl[1]){
          //xx = sl[1];
          ww = sl[1]-selection.x;
        }
        if (yy >= sl[0] && yy <= sl[1]){
          //yy = sl[1];
          hh = sl[1]-selection.y;
        }
      })
    }

    
    if (selectMode == "single"){
      setSelection({
        x: xx,
        y: yy,
        width: 1,
        height: 1,
      });
    }else if (selectMode == "area"){
      setSelection({
        ...selection,
        width: ww,
        height: hh,
      });
    }else if (selectMode == "row"){
      setSelection({
        ...selection,
        x: 0,
        width: segments.length,
        height: hh,
      });
    }else if (selectMode == "col"){
      setSelection({
        ...selection,
        y:0,
        width: ww,
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
  
  
  const MUWorkerFunc = (event) => {
    /*ss = selection;

    const orgSS = {
      x: ss.x,
      y: ss.y,
      width: ss.width,
      height: ss.height,
    };

    if (pixelMapData){
      //const minidx = pixelMapData[0]

      //ss.x+=minidx
      //ss.y += minidx
      orgSS.width = pixelMapData[ss.x+ss.width]-pixelMapData[ss.x]
      orgSS.height = pixelMapData[ss.y+ss.height]-pixelMapData[ss.y]

      orgSS.x = pixelMapData[ss.x]
      orgSS.y = pixelMapData[ss.y]
    }

    const RpixelMapData = reverseObject(pixelMapData);

    const selected = event.data.selected;

    selected.forEach(seg=>{
      if (seg.lineIDx > ss.y && seg,lineIDx < ss.y+ss.height ){
        const row = RpixelMapData[seg.lineIDx]
        seg.color = getEntryColor()
      }
    })*/

    const selected = event.data.selected;
    setSegmentsSelected(selected);

    //if (pixelMapData)
    //  setSegments(segments)
    
    MUworker.removeEventListener('message', MUWorkerFunc);
  }


  function reverseObject(obj) {
    var reversed = {};
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            reversed[obj[key]] = key;
        }
    }
    return reversed;
}

  // Listen for messages from the worker
  
  const updateSelection = (ss) =>{
    if (!ss)
      ss = selection;

  

    const orgSS = {
      x: ss.x,
      y: ss.y,
      width: ss.width,
      height: ss.height,
    };

    if (pixelMapData){
      //const minidx = pixelMapData[0]

      //ss.x+=minidx
      //ss.y += minidx
      orgSS.width = pixelMapData[ss.x+ss.width]-pixelMapData[ss.x]
      orgSS.height = pixelMapData[ss.y+ss.height]-pixelMapData[ss.y]

      orgSS.x = pixelMapData[ss.x]
      orgSS.y = pixelMapData[ss.y]
    }

    const ranges = matrixSubregionIndexRanges(segments.length, ss.x, ss.y,
      ss.width,ss.height);

      let filter = false;
      
      //if (pixelMapData)
       // filter = Object.values(pixelMapData);

      MUworker.addEventListener('message', MUWorkerFunc,false);
    MUworker.postMessage({
      aboveDiagonalColumnIndexes: ranges.aboveDiagonalColumnIndexes,
      belowDiagonalRowIndexes: ranges.belowDiagonalRowIndexes,
      selectMode:selectMode,
      selection: orgSS,
      segments: segments,
      graph: graph,
      graph2:graph2,
      selectColor:selectColor,
      filter:filter
    });

    if (setGraphData)
      setGraphData(getGraphData());
  }

  function clampSelection(selection, bounds) {
    const clamped = { ...selection };
  
    // clamp x coordinate
    clamped.x = Math.max(bounds.x, Math.min(selection.x, bounds.x + bounds.width - selection.width));
  
    // clamp y coordinate
    clamped.y = Math.max(bounds.y, Math.min(selection.y, bounds.y + bounds.height - selection.height));
  
    // clamp width
    clamped.width = Math.min(selection.width, bounds.x + bounds.width - clamped.x);
  
    // clamp height
    clamped.height = Math.min(selection.height, bounds.y + bounds.height - clamped.y);
  
    return clamped;
  }

  
  const handleMouseUp = (e) => {
    if (e.evt.button === 1) {
      // Make the layer non-draggable
      layerRef.current.draggable(false);
    }

    updateSelection();

    if (!manualUpdate)
      updateView();

    //console.log('Selected region:', selection);
    

    //for (let i=selection.x; i < selection.x + selection.width;i++){
    
    if (false){
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
  }
    
    //console.log(selection.x,selection.x+selection.width,selection.y,selection.y+selection.height);
    //console.log(selectedRange);
    //console.log(selected)
  
    //console.log(selection,selected);
    //setSegmentsSelected(selected);

    // const layer = layerRef.current;
    // const visibleArea = {
    //   x:-layer.x()/layer.scaleX(),
    //   y:-layer.y()/layer.scaleY(),
    //   width:dimensions.width/layer.scaleX(),
    //   height:dimensions.height/layer.scaleY()
    // }
    // setSelection2(clampSelection(selection, visibleArea));

    setSelection2(selection);
    updateLayerProps();
    //console.log("here");
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

  function removeCanvasGrid(canvases, rows, cols) {
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (!canvases[i])
          continue;
        const canvas = canvases[i][j];
        //console.log(canvas);
        if (!canvas)
        continue;
        canvas.width = 0; // set the width and height to 0 to release memory
        canvas.height = 0;
        canvases[i][j] = null; // set the canvas to null to release memory
      }
    }
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

  function getEntryColor(x,y){
    let colorScaleGlobal = scaleLinear()
  .domain([minMax[0], minMax[1]])
  .range(['blue', 'red']) // example color range
  .interpolate(interpolateHsl);
    //console.log(opacities);

    let colorScaleLocal = false;

    let currSL = 0, key = -1;
    let vmin = minMax[0], vmax = minMax[1];

    //const x = pixel[0];
    //const y = pixel[1];
    const row = Math.floor(y / tileSize);
    const col = Math.floor(x / tileSize);
    const canvas = canvases[row][col];
    const context = canvas.getContext("2d");

    let dist = pixel[2];

    if (pixelMapData){
      const idx1 = segments[pixelMapData[x]].lineIDx;
      const idx2 = segments[pixelMapData[y]].lineIDx;
      key = `${idx1},${idx2}`
    }

    let colorScale;
    if (key != currSL && slRange && pixelMapData){

      

      currSL = key;
      if (slRange[key]){
        vmin = slRange[key][0]
        vmax = slRange[key][1]

        colorScaleLocal = scaleLinear()
        .domain([slRange[key][0], slRange[key][1]])
        .range(['blue', 'red']) // example color range
        .interpolate(interpolateHsl);
        //console.log(key)
        //console.log(slRange[key])
        }else{
          colorScaleLocal = colorScaleGlobal;
        //  console.log("key NOT FOUND:")
        //  console.log(key);
        }
    }

    if (slRange && pixelMapData && colorScaleLocal )
      colorScale = colorScaleLocal;
    else
      colorScale = colorScaleGlobal;
    

    //context.fillStyle = "black";

    let colorMap = rgb(colorScale(dist));
    colorMap.opacity = interpolateAlpha((dist-vmin)/vmax);
    return colorMap.toString();


    context.fillStyle = colorMap.toString();

    //context.fillStyle = colorScale(dist);
    context.fillRect(x % tileSize, y % tileSize, 1, 1);

    const color = rgb(context.fillStyle );
    color.opacity = 0.1; // Set the alpha to 0.1
    //return color.toString();

    //const transparentBlack = "rgba(0, 0, 0, 0.1)";
    const transparentcolor = color.toString();
    context.fillStyle = transparentcolor;
  }

  function drawRectangleM(canvas, row, col, x, y, width, height, color, tileSize) {
    const startX = Math.floor(x / tileSize);
    const startY = Math.floor(y / tileSize);
    const endX = Math.floor((x + width - 1) / tileSize);
    const endY = Math.floor((y + height - 1) / tileSize);
  
    for (let i = startY; i <= endY; i++) {
      for (let j = startX; j <= endX; j++) {
        //const canvas = canvases[i][j];
        //if (!canvas)
        if (i==row && j==col){
        const ctx = canvas.getContext("2d");
  
        const localX = j === startX ? x % tileSize : 0;
        const localY = i === startY ? y % tileSize : 0;
        const localWidth = j === endX ? (x + width) % tileSize || tileSize : tileSize - localX;
        const localHeight = i === endY ? (y + height) % tileSize || tileSize : tileSize - localY;
        //console.log(i,j);
        ctx.fillStyle = color;
        ctx.fillRect(localX, localY, localWidth, localHeight);
        }else{}
      }
    }
  }
  function fillBlackPixels(canvases, pixelList, tileSize) {
    let colorScaleGlobal = scaleLinear()
        .domain([minMax[0], minMax[1]])
        .range(['blue', 'orange']) // Keep the color range
        .interpolate(interpolateRgb); // Use RGB interpolation
    //console.log(opacities);

    let colorScaleLocal = false;

    /*if (slRange){
      colorScaleLocal = scaleLinear()
      .domain([slRange[0][0], slRange[0][1]])
      .range(['blue', 'red']) // example color range
      .interpolate(interpolateHsl);
    }*/
    let currSL = 0, key = -1;
    //console.log(pixelMapData);
    pixelList.forEach((pixel) => {
      let vmin = minMax[0], vmax = minMax[1];

      const x = pixel[0];
      const y = pixel[1];
      const row = Math.floor(y / tileSize);
      const col = Math.floor(x / tileSize);
      const canvas = canvases[row][col];
      const context = canvas.getContext("2d");

      let dist = pixel[2];

      if (pixelMapData){
        const idx1 = segments[pixelMapData[x]].lineIDx;
        const idx2 = segments[pixelMapData[y]].lineIDx;
        key = `${idx1},${idx2}`
      }

      let colorScale;
      if (key != currSL && slRange && pixelMapData){

        

        currSL = key;
        if (slRange[key]){
          vmin = slRange[key][0]
          vmax = slRange[key][1]

          colorScaleLocal = scaleLinear()
          .domain([slRange[key][0], slRange[key][1]])
          .range(['blue', 'red']) // example color range
          .interpolate(interpolateHsl);
          //console.log(key)
          //console.log(slRange[key])
          }else{
            colorScaleLocal = colorScaleGlobal;
          //  console.log("key NOT FOUND:")
          //  console.log(key);
          }
      }

      if (slRange && pixelMapData && colorScaleLocal )
        colorScale = colorScaleLocal;
      else
        colorScale = colorScaleGlobal;
      

      //context.fillStyle = "black";

      let colorMap = rgb(colorScale(dist));
      colorMap.opacity = interpolateAlpha((dist-vmin)/vmax);
      context.fillStyle = colorMap.toString();

      //context.fillStyle = colorScale(dist);
      context.fillRect(x % tileSize, y % tileSize, 1, 1);

      const color = rgb(context.fillStyle );
      color.opacity = 0.1; // Set the alpha to 0.1
      //return color.toString();

      //const transparentBlack = "rgba(0, 0, 0, 0.1)";
      const transparentcolor = color.toString();
      context.fillStyle = transparentcolor;
      //ANTIALIAS
      //context.fillRect(x % tileSize-2, y % tileSize-2, 5, 5);
    });
  }


  function fillBlackPixelsM(canvas, row, col, pixelList, tileSize) {
    pixelList.forEach((pixel) => {
      const x = pixel[0];
      const y = pixel[1];
      const r = Math.floor(y / tileSize);
      const c = Math.floor(x / tileSize);
      //const canvas = canvases[row][col];
      if (r != row && c!= col)
        return;
      const context = canvas.getContext("2d");
      context.fillStyle = "black";
      context.fillRect(x % tileSize, y % tileSize, 1, 1);
    });
  }

  function fillBlackPixels2(canvases, pixelList, tileSize) {
    const samec = "rgb(227, 227, 227)"
    pixelList.forEach((pixel) => {
      const x = pixel[0];
      const y = pixel[1];
      let color = pixel[2];
      if (color == 0)
        color = "red";
      else if (color == 1)
        color = samec;
      else 
        color = "blue";

      const row = Math.floor(y / tileSize);
      const col = Math.floor(x / tileSize);
      const canvas = canvases[row][col];
      const context = canvas.getContext("2d");
      context.fillStyle = color;
      context.fillRect(x % tileSize, y % tileSize, 1, 1);
    });
  }
  
  const setPixelsM = useCallback((pixels,streamlines)=>{
    //console.log(streamlines);
    const tileSize = 1000;
    const cols = Math.ceil(segments.length / tileSize);

    const grid = new Array(cols).fill(cols).map(() => new Array(cols).fill(null));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < cols; j++) {
        const imageX = j * tileSize;
        const imageY = i * tileSize;
        grid[i][j] = {
          width:0,
          height:0,
          x:imageX,
          y:imageY,
          url:""
        }
      }
    }

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < cols; j++) {

    //const canvas = createWhiteImage(segments.length, segments.length,tileSize);
    const canvas = document.createElement("canvas");
    canvas.width = tileSize;
    canvas.height = tileSize;
    const context = canvas.getContext("2d");
    context.fillStyle = "white";
    context.fillRect(0, 0, tileSize, tileSize);

    let rects = []
    for (let si = 0; si < streamlines.length; si++) {
      for (let sj = 0; sj < streamlines.length; sj++) {
        let sl1 = streamlines[si];
          let sl2 = streamlines[sj];
        // Set the value at each position based on its position
        if ((si + sj) % 2 === 0) {
          //1
          drawRectangleM(canvas, i, j, sl1[0], sl2[0], sl1[1]-sl1[0],sl2[1]-sl2[0],"#F3F3F3",tileSize);
        } else {
          drawRectangleM(canvas, i, j, sl1[0], sl2[0], sl1[1]-sl1[0],sl2[1]-sl2[0],"white",tileSize);
          //0
        }
      }
    }
    //console.log(rects);
    //console.log(matrix)
    fillBlackPixelsM(canvas, i, j, pixels,tileSize);

    const imageX = j * tileSize;
    const imageY = i * tileSize;
    grid[i][j] = {
      width:tileSize,
      height:tileSize,
      x:imageX,
      y:imageY,
      url:canvas.toDataURL()
    }
    canvas.width = 0; // set the width and height to 0 to release memory
      canvas.height = 0;
      canvas = null; // set the canvas to null to release memory
    console.log(i,j);
  }}
      
  console.log(grid);
        const prevGrid = image;
    previousImage.current = image;
    setImage(grid);
    
    //console.log(canvas.toDataURL('image/png'));
  })

  const computeStreamlinesMap = () => {
    const streamlinesMap = {}
    const streamlinesOrder = [];
    console.log(streamlinesOrder)
    const indices = Object.values(pixelMapData);
    for (let entry in pixelMapData){
      const idx = pixelMapData[entry]
      if (!streamlinesMap[segments[idx].lineIDx]){
        streamlinesMap[segments[idx].lineIDx]=[idx,idx]
        streamlinesOrder.push(segments[idx].lineIDx)
      }else{
        streamlinesMap[segments[idx].lineIDx][0] = Math.min(idx,streamlinesMap[segments[idx].lineIDx][0])
        streamlinesMap[segments[idx].lineIDx][1] = Math.max(idx,streamlinesMap[segments[idx].lineIDx][1])
      }
    }
    const streamlinesNew = [];
    let prevIdx = 0;
    streamlinesOrder.forEach(slIdx=>{
      const sl = streamlinesMap[slIdx]
      const newSL = [prevIdx+1,prevIdx+(sl[1]-sl[0])];
      prevIdx=newSL[1]+1;
      streamlinesNew.push(newSL)
    })
    return streamlinesNew;
  }

  

  const setPixelsNoUpdate = (pixels) =>{
    // Use reduce to find the maximum of the first elements
    let maxValue = pixels.reduce((max, current) => {
      return current[0] > max ? current[0] : max;
    }, -Infinity);
    
    const tileSize = 1000;
    const cols = Math.ceil(maxValue / tileSize);
    const streamlines = computeStreamlinesMap();
    console.log(streamlines)
    const canvas = createWhiteImage(maxValue, maxValue,tileSize);
    //////
    let rects = []
    for (let i = 0; i < streamlines.length; i++) {
      for (let j = 0; j < streamlines.length; j++) {
        break;

        let sl1 = streamlines[i];
          let sl2 = streamlines[j];
        // Set the value at each position based on its position
        if ((i + j) % 2 === 0) {
          //1
          
          
          //rects.push([sl1[0], sl2[0], sl1[1]-sl1[0],sl2[1]-sl2[0]]);
          //console.log( sl1[0], sl2[0], sl1[1]-sl1[0],sl2[1]-sl2[0])
          drawRectangle(canvas, sl1[0], sl2[0], sl1[1]-sl1[0],sl2[1]-sl2[0],"#F3F3F3",tileSize);
        } else {
          drawRectangle(canvas, sl1[0], sl2[0], sl1[1]-sl1[0],sl2[1]-sl2[0],"white",tileSize);
          //0
        }
      }
    }

    /////


    fillBlackPixels(canvas, pixels,tileSize);
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < cols; j++) {
        const cv = canvas[i][j];
        const imageX = j * tileSize;
        const imageY = i * tileSize;
        canvas[i][j] = {
          width:tileSize,
          height:tileSize,
          x:imageX,
          y:imageY,
          url:cv.toDataURL()
        }

        cv.width = 0; // set the width and height to 0 to release memory
        cv.height = 0;
        cv = null; // set the canvas to null to release memory
      }
    }
    
    const prevGrid = image;
    previousImage.current = image;
    console.log(canvas);
    setImage(canvas);
  }



  const setPixels = useCallback((pixels,streamlines)=>{
    //return;
    //console.log(streamlines);
    const tileSize = 1000;
    const cols = Math.ceil(segments.length / tileSize);
    
    const canvas = createWhiteImage(segments.length, segments.length,tileSize);
    let rects = []
    for (let i = 0; i < streamlines.length; i++) {
      for (let j = 0; j < streamlines.length; j++) {
        let sl1 = streamlines[i];
          let sl2 = streamlines[j];
        // Set the value at each position based on its position
        if ((i + j) % 2 === 0) {
          //1
          
          
          //rects.push([sl1[0], sl2[0], sl1[1]-sl1[0],sl2[1]-sl2[0]]);
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

    //const rows = Math.ceil(height / tileSize);
    //const cols = Math.ceil(width / tileSize);
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < cols; j++) {
        const cv = canvas[i][j];
        const imageX = j * tileSize;
        const imageY = i * tileSize;
        canvas[i][j] = {
          width:tileSize,
          height:tileSize,
          x:imageX,
          y:imageY,
          url:cv.toDataURL()
        }

        cv.width = 0; // set the width and height to 0 to release memory
        cv.height = 0;
        cv = null; // set the canvas to null to release memory
      }
    }
    
    const prevGrid = image;
    previousImage.current = image;
    console.log(canvas);
    setImage(canvas);
    
    //console.log(canvas.toDataURL('image/png'));
  })

  const setPixels2 = useCallback((pixels,streamlines,graph2t)=>{
    const tileSize = 1000;
    const cols = Math.ceil(segments.length / tileSize);
    const pixels2 = [];
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
          drawRectangle(canvas, sl1[0], sl2[0], sl1[1]-sl1[0],sl2[1]-sl2[0],"#f7f7f7",tileSize);
        } else {
          drawRectangle(canvas, sl1[0], sl2[0], sl1[1]-sl1[0],sl2[1]-sl2[0],"white",tileSize);
          //0
        }
      }
    }

    for (let i=0; i < segments.length; i++){
      const e1 = graph[i];
      const e2 = graph2t[i];

      const same = e1.filter(item => e2.includes(item));
      const diff1 = e1.filter(item => !e2.includes(item));
      const diff2 = e2.filter(item => !e1.includes(item));
      
      same.forEach(idx => {
        pixels2.push([i,idx,1]);
      });
      diff1.forEach(idx => {
        pixels2.push([i,idx,0]);
      });
      diff2.forEach(idx => {
        pixels2.push([i,idx,2]);
      });

      //console.log(diff1.length, diff2.length);
    }


    fillBlackPixels2(canvas, pixels2,tileSize);

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < cols; j++) {
        const cv = canvas[i][j];
        const imageX = j * tileSize;
        const imageY = i * tileSize;
        canvas[i][j] = {
          width:tileSize,
          height:tileSize,
          x:imageX,
          y:imageY,
          url:cv.toDataURL()
        }

        cv.width = 0; // set the width and height to 0 to release memory
        cv.height = 0;
        cv = null; // set the canvas to null to release memory
      }
    }

    setImage(canvas);
    
    //console.log(canvas.toDataURL('image/png'));
  })

  const handleLoad = (image) => {
    // Disable image smoothing
    console.log("calaled");
    image.imageSmoothingEnabled(false);
  };

  const Base64Image = ({ base64URL, ...props }) => {
    const [image, setImage] = useState(null);
  
    useEffect(() => {
      const img = new window.Image();
      img.src = base64URL;
      img.onload = () => {
        setImage(img);
      };
    }, [base64URL]);
  
    return <Image imageSmoothingEnabled={false} image={image} {...props} />;
  };
  

  function renderCanvasGrid(canvases, tileSize, visibleArea) {
    const images = [];
    let ex = 0;
    let lasturl = "";
    for (let i = 0; i < canvases.length; i++) {
      for (let j = 0; j < canvases[i].length; j++) {
        const canvas = canvases[i][j];
        if(!canvas || canvas.width == 0 || canvas.height == 0)
          continue;
        let pass = true;

        if (visibleArea){
          // Calculate the image position
          const imageX = j * tileSize;
          const imageY = i * tileSize;

          // Check if the image is within the visible area
          pass =
            imageX + canvas.width >= visibleArea.x &&
            imageX <= visibleArea.x + visibleArea.width &&
            imageY + canvas.height >= visibleArea.y &&
            imageY <= visibleArea.y + visibleArea.height;
          
        }
        if (!pass){
          ex++;
          continue;
        }
        //console.log(canvas);
        //if (canvas.url == lasturl)
        //  console.log("same");
        lasturl = canvas.url;
        //console.log(`${i}-${j}`)
        images.push(
          <Base64Image
            key={`${i}-${j}`}
            base64URL={canvas.url}
            x={j * tileSize}
            y={i * tileSize}
            onload={handleLoad}
          />
        );
      }
    }
    console.log("excluded: ",ex);
    //console.log(canvases,images.length,images)
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

    //if (!manualUpdate)
    //  updateView();
    
    
      //updateLayerProps();
  };

  useEffect(()=>{
    if (selectedSegment > 0){
      const layer = layerRef.current;
      layer.x(-selectedSegment/layer.scaleX());
      layer.y(-selectedSegment/layer.scaleY());
      const visibleArea = {
        x:-layer.x()/layer.scaleX(),
        y:-layer.y()/layer.scaleY(),
        width:dimensions.width/layer.scaleX(),
        height:dimensions.height/layer.scaleY()
      }
      renderCanvasGrid(image, 1000,visibleArea);
    }
  },[selectedSegment])

  const updateView = ()=>{
    let visibleArea = false;
        const layer = layerRef.current;
        if (layer)
         visibleArea = {
           x:-layer.x()/layer.scaleX(),
           y:-layer.y()/layer.scaleY(),
           width:dimensions.width/layer.scaleX(),
           height:dimensions.height/layer.scaleY()
         }
         console.log(visibleArea);
       renderCanvasGrid(image, 1000,visibleArea);

      if (selectMode == "row" || selectMode == "col"){
          //setSelection2(clampSelection(selection, visibleArea));
      }
  }
  
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

  const handleSaveImage = () => {
    const dataURL = stageRef.current.toDataURL();
    const fileName = window.prompt('Enter file name', 'myImage.png');
    if (fileName) {
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownload2 = () =>{
    const fileName = window.prompt('Enter file name', 'myImage.png');
    if (fileName) {
      let text = "";
      for (var i=0; i < graph.length; i++){
        text += graph[i].join(" ") + "\n";
      }

      const link = document.createElement('a');
      link.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  const getStreamlineOf = (idx)=>{
    for (var i=0; i < streamLines.length;i++){
      let sl = streamLines[i];
      if (idx >= sl[0] && idx <= sl[1])
        return i
    }
    return -1;
  }

  const getGraphData = () =>{
    let res = [];
      for (var i=selection.x; i < selection.x + selection.width; i++){
        //text += graph[i].join(" ") + "\n";
        const querySegment = [segments[i].startPoint,segments[i].endPoint];
        let sls = {};
        for (var nn of graph[i]){
          var sl = getStreamlineOf(nn);
          if (!sls[sl])
            sls[sl] = [];
          
          const segment = [segments[nn].startPoint,segments[nn].endPoint];
          const dist = lineSegmentDistance(querySegment, segment,'shortest');
          sls[sl].push(dist);
        }
        res.push(sls);
      }
    return res;
  }

  const handleDownload = () =>{
    const fileName = window.prompt('Enter file name', 'test.txt');
    if (fileName) {
      let text = "";
      let res = getGraphData();

      //return;//skip download file

      const link = document.createElement('a');
      link.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(res)));
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  const handleSaveImage2 = () => {
    const dataURL = stageRef.current.toDataURL();
    window.location.href = dataURL;
  };

    const [doSort, setDoSort] = useState(false);
    const [sortType, setSortType] = useState(1);
    const [selectColor,setSelectColor] = useState("one");

    const divRef = useRef(null)
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0
  })

  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    if (divRef.current) {
      resizeObserver.observe(divRef.current);
    }

    return () => {
      if (divRef.current) {
        resizeObserver.unobserve(divRef.current);
      }
    };
  }, []);
  

  //layerRef.current.pixelRatio(layerRef.current.pixelRatio/SCALE_BY);
  return (
    <div style={{height: '100%',
        width: '100%'}}>
      <div >
      <button onClick={()=>{setShowDiv(!showDiv)}}>{'<'}</button> 
      <label>
      <input
        type="checkbox"
        checked={snap}
        onChange={()=>{
          setSnap(!snap); 
        }}
      /> Snap
    </label>&nbsp;
      <select value={selectMode} onChange={handleSelectMethodChange}>
          <option value="single">Single</option>
          <option value="area">Area</option>
          <option value="row">Row</option>
          <option value="col">Column</option>
        </select>
        &nbsp; <select value={selectColor} onChange={(e)=>{setSelectColor(e.target.value);}}>
          <option value="one">single color</option>
          <option value="two">query+neighbor</option>
        </select>
        <label>
      <input
        type="checkbox"
        checked={doSort}
        onChange={()=>{
          setDoSort(!doSort); 
          if (doSort)
            setStreamlines(streamLines2);
        }}
      />
      Sorted &nbsp;
      <select value={sortType} onChange={(e)=>{setSortType(Number(e.target.value))}}>
          <option value="1">RowSum</option>
          <option value="2">AvgDist</option>
        </select>
    </label>&nbsp;
    <button onClick={()=>{
      let save = {};
      const layer = layerRef.current;
      save.selection = selection;
      save.view = {
        x: layer.x(),
        y: layer.y(),
        scaleX: layer.scaleX(),
        scaleY: layer.scaleY(),
      };
      navigator.clipboard.writeText(JSON.stringify(save));
      }}>📄</button> 
    <button onClick={()=>{
      let jsonString = prompt('Enter selection JSON string:');
      if (jsonString!="") {
        const ss = JSON.parse(jsonString);
        setSelection(ss.selection);
        setSelection2(ss.selection);
        updateSelection(ss.selection);
        onLayerChange(ss.view);
      }
      }}>📋</button> 
    {manualUpdate && <button onClick={()=>{
        updateView()
      }}>🔄</button> }
    <button onClick={()=>{
        //handleSaveImage();
        handleDownload2();
      }}>💾</button> 
    
    <br/>
        {showDiv && <div>
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
      {false &&<button onClick={()=>{setGraph([])}}>X</button>} <br/>
      {/* */}
      <label>
        Algorithm:
        <select value={algorithm2} onChange={handleAlgorithmChange2}>
          <option value="KNN">KNN</option>
          <option value="RBN">RBN</option>
        </select>
      </label>&nbsp;
      {algorithm2 === 'KNN' && (
        <label>
          K:
          <input style={{ maxWidth: '45px' }} type="number" value={param2} onChange={handleParamChange2} />
        </label>
      )}
      {algorithm2 === 'RBN' && (
        <label>
          R:
          <input style={{ maxWidth: '45px' }} type="number" value={param2} onChange={handleParamChange2} />
        </label>
      )}
      <label>
      &nbsp;Distance:
        <select value={distanceMetric2} onChange={handleDistanceMetricChange2}>
          <option value="shortest">Shortest</option>
          <option value="longest">Longest</option>
          <option value="haustoff">Haustoff</option>
        </select>
      </label>
      <button onClick={handleStart2}>Start</button> 
      <progress style={{ width: '60px' }} value={progress2} max="100"></progress>
      {false &&<button onClick={()=>{setGraph2([])}}>X</button> }
      <OpacityTable setOpacities={setOpacities}/>
      </div>}
      {/* */}

      
    </div>
    <div ref={divRef}
      style={{minHeight: '100vh',
      width: '100%'}}>
      <Stage 
            ref = {stageRef}
            style={{
                backgroundColor:'white'
              }}
              width={dimensions.width} height={dimensions.height}
            onContextMenu={(e)=>{/*e.evt.preventDefault();*/}}
              imageSmoothingEnabled={false}
                >
            <Layer ref={layerRef} onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            imageSmoothingEnabled={false}
            onMouseUp={handleMouseUp}>
            {grid}
            <MemoizedRect selection2={selection2} />
            </Layer>
        </Stage>
    </div>
    </div>
  );
});

export default HugeCanvas;
