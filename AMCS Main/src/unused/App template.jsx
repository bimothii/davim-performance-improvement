import React, { useState,useRef,useEffect } from 'react';
import HugeCanvas from './HugeCanvas';
import LineSegments from './LineSegments';
import LineSegmentUploader from './LineSegmentUploader'

import "rc-dock/dist/rc-dock.css";
import BarChart from './PlotView';


import "./App.css";
import { Allotment } from "allotment";
import "allotment/dist/style.css";

const App = () => {

  const [streamLines, setStreamLines] = useState([]);
  const [exclude, setExclude] = useState(-1);
  const [manualUpdate, setManualUpdate] = useState(false);
  const [drawAll, setDrawAll] = useState(true);
  const [swapLayout, setSwapLayout] = useState(false);
  const [selectedSegment,setSelectedSegment] = useState(-1);
  const [radius,setRadius] = useState(0.12);
  const [tubeRes,setTubeRes] = useState(20);
  const [showPlotView,setShowPlotView] = useState(true);
  const [layerProps, setLayerProps] = useState({
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
  });

  const [segments, setSegments] = useState([]);
  const [segmentsSelected, setSegmentsSelected] = useState([]);

  const [selectRegion, setSelectRegion] = useState({
      start: null, end: null 
  });

  /**
   * description
   * @param {*} newProps 
   */
  const handleLayerChange = (newProps) => {
    setLayerProps(newProps);
  };

  
  return <div className='App'>
    <Allotment key="main">
    <Allotment vertical={true}>
          <Allotment.Pane maxSize={100}>
            <div><LineSegmentUploader setShowPlotView={setShowPlotView} showPlotView={showPlotView} setRadius={setRadius} setTubeRes={setTubeRes} manualUpdate={manualUpdate}  key="uploader"
              setManualUpdate={setManualUpdate} setStreamLines={setStreamLines} 
              setSegments={setSegments} setExclude={setExclude} 
              drawAll={drawAll} setDrawAll={setDrawAll}
              swapLayout={swapLayout} setSwapLayout={setSwapLayout}/></div>
          </Allotment.Pane>
          <Allotment.Pane preferredSize={'40%'} >
          <LineSegments radius={radius} tubeRes={tubeRes} setSelectedSegment={setSelectedSegment} key="line3D" drawAll={drawAll} segments={segments} selectRegion={setSelectRegion} segmentsSelected={segmentsSelected} />
          </Allotment.Pane>
    </Allotment>
    <Allotment.Pane>
    <div><HugeCanvas selectedSegment={selectedSegment} key="canvas1" cid={1} manualUpdate={manualUpdate} exclude={exclude} layerProps={layerProps} onLayerChange={handleLayerChange} setSegmentsSelected={setSegmentsSelected} streamLines2={streamLines} segments2={segments} /></div>
    </Allotment.Pane>
    <Allotment.Pane>
    {(showPlotView)?<BarChart/>:<div><HugeCanvas selectedSegment={selectedSegment} key="canvas2" cid={2} manualUpdate={manualUpdate} exclude={exclude} layerProps={layerProps} onLayerChange={handleLayerChange} setSegmentsSelected={setSegmentsSelected} streamLines2={streamLines} segments2={segments} /></div>}
    </Allotment.Pane>
  </Allotment>
    </div>
};

export default App;
