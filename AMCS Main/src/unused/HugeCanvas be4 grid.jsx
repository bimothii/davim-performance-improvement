import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Image } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import KNNComponent from './KNNComponent';
import {findRBN,computeDiagonalLength,computeBounds,createLineSegmentKDTree, findKNearestNeighbors, processSegments } from './knnHelper';

const HugeCanvas = ({streamlines, segments, setSegmentsSelected}) => {
  const layerRef = useRef();
  //const [segments, setSegments] = useState(initsegments);
  const [graph, setGraph] = useState([]);
  const [existingPixels, setExistingPixels] = useState({});
  const [selection, setSelection] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [image, setImage] = useState(createWhiteImage(500, 500));
    ///UI
    const [algorithm, setAlgorithm] = useState('KNN');
    const [param, setParam] = useState('');
    const [distanceMetric, setDistanceMetric] = useState('shortest');
    const [progress, setProgress] = useState(0);
    
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
      buildMatrix(lineSegments,KR);
    }

    const buildMatrix = async(lineSegments, KR)=>{
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
          pixels.push([i,n]);
          pixels.push([n,i]);
        });
        
        const progress = Math.floor(i / lineSegments.length * 100);
        if (progress % 10 === 0 && progress !== lastProgress) {
          setProgress(progress);
          lastProgress = progress;
          //console.log(progress);
        }
      }
      //console.log(pixels);
      setPixels(pixels, streamlines);
      //console.log(tgraph);
    }

  ////
  const handleMouseDown = (e) => {
    if (e.evt.button != 0) return;
    const pos = e.target.getStage().getPointerPosition();
    setSelection({
      ...selection,
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
    });
  };

  const handleMouseMove = (e) => {
    if (!e.evt.buttons || e.evt.buttons !== 1) return;
    const pos = e.target.getStage().getPointerPosition();
    setSelection({
      ...selection,
      width: pos.x - selection.x,
      height: pos.y - selection.y,
    });
  };

  const handleMouseUp = () => {
    //console.log('Selected region:', selection);
    const selected = segments.filter(seg=>
      (seg.globalIdx > selection.x && seg.globalIdx < selection.x+ selection.width) 
      || (seg.globalIdx > selection.y && seg.globalIdx < selection.y+selection.height)
      )
    console.log(selection,selected);
    setSegmentsSelected(selected);
  };

  const handleWrapperMouseDown = (e) => {
    // Disable panning with the left mouse button (0)
    if (e.button === 0) {
      e.stopPropagation();
    }
  };
  ////
  function createWhiteImage(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "white";
    context.fillRect(0, 0, width, height);

    return canvas;
  }

  function drawRectangle(canvas, x, y, width, height, color) {
    // Get the 2D context of the canvas
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
  }
  
  
  function fillBlackPixels(canvas, pixelList) {
    const context = canvas.getContext("2d");
    context.fillStyle = "black";
    pixelList.forEach((pixel) => {
      context.fillRect(pixel[0], pixel[1], 1, 1);
    });
    
  }

  const setPixels = useCallback((pixels,streamlines)=>{
    const canvas = createWhiteImage(segments.length, segments.length);
    fillBlackPixels(canvas, pixels);
    setImage(canvas);
    //console.log(canvas.toDataURL('image/png'));
  })

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

  return (
    <div style={{height: '100%',
        width: '100%',
        overflow:'hidden'}}>
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
        <TransformWrapper
          minScale={0.05}
            limitToBounds={false} >
        <TransformComponent>
            <div onMouseDown={handleWrapperMouseDown}>
            <Stage 
            style={{
                backgroundColor:'white',
                borderStyle: 'solid'
              }}
            
                width={segments.length} height={segments.length}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}>
            <Layer ref={layerRef}>
            {image && (<Image
                image={image}
                x={0}
                y={0}
            />)}
                <Rect
                x={selection.x}
                y={selection.y}
                width={selection.width}
                height={selection.height}
                fill="rgba(0, 0, 255, 0.5)"
                listening={false}
                />
            </Layer>
            </Stage>
            </div>
        </TransformComponent>
        </TransformWrapper>
    </div>
  );
};

export default HugeCanvas;
