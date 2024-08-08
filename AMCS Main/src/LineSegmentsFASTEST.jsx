import React, { useMemo,useState,useCallback, useRef } from 'react';
import { Canvas, extend, useThree,useFrame  } from '@react-three/fiber';
import { TubeGeometry } from 'three';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2';
extend({ LineSegments2 })
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import { scaleLinear } from 'd3-scale';
import { interpolateHsl } from 'd3-interpolate';
import { rgb } from 'd3-color';

extend({ OrbitControls });

const LineSegmentsComponent = ({ segments, setSelectedSegment ,setSegmentsSelected, dGraphData, dGraph}) => {
  const lineRef = useRef();
  const { camera, raycaster, gl } = useThree();
  const [mouse, setMouse] = useState(new THREE.Vector2());

  const handleClick = (event) => {
    //DISABLED RIGHT CLICK!!!
    //IF ENABLED, SELECT SEG + NEIGHBORS
    return;
    console.log("here");
    event.stopPropagation();
    if (event.button !== 2)
      return;
    
    const rect = gl.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(lineRef.current, true);

    if (intersects.length > 0) {
      const selectedSegmentIndex = Math.floor(intersects[0].faceIndex);
      const pt = intersects[0].pointOnLine;
      segments.forEach(seg => {
        if (seg.startPoint == pt || seg.endPoint==pt){
          console.log("FOUND ",seg);
          
        }
      });

      
    
      //setSelectedSegment(selectedSegmentIndex);
      console.log('Selected segment index:', selectedSegmentIndex);
      console.log(dGraph)
      const sseg = segments[selectedSegmentIndex];
      if (sseg){
        if (!dGraphData){
          setSegmentsSelected([sseg])
          console.log("no graph data!");
        }else{
          

          let min = Number.MAX_VALUE;
          let max = Number.MIN_VALUE;
          console.log(dGraphData[selectedSegmentIndex])
          sseg.color = 'green'
          const graph = [sseg];

          let idx=0;
          dGraphData[selectedSegmentIndex].forEach(idx2=>{
            //graph.push(segments[idx]);
            if (dGraph[selectedSegmentIndex][idx] >= 0){
              min = Math.min(dGraph[selectedSegmentIndex][idx], min);
              max = Math.max(dGraph[selectedSegmentIndex][idx], max);
          }else{
            console.log("Invalid sidx! ", idx,dGraph[selectedSegmentIndex],dGraph[selectedSegmentIndex][idx],Math.min(parseFloat(dGraph[selectedSegmentIndex][idx]),Number.MAX_VALUE))
          }
            idx++;
          })
          console.log([min,max])
          let colorScale = scaleLinear()
        .domain([min,max])
        .range(['blue', 'red']) // example color range
        .interpolate(interpolateHsl);

        let idx2=0;
        dGraphData[selectedSegmentIndex].forEach(idx=>{
          segments[idx].color = rgb(colorScale(dGraph[selectedSegmentIndex][idx2])).toString();
          console.log(segments[idx].color);
          graph.push(segments[idx]);
          idx2++;
        })

          setSegmentsSelected(graph);
          console.log(dGraphData)
        }
      }else{
        console.log("Invalid index!")
        console.log(segments);
      }
    }
  }

  useFrame(() => {
    
  });

  const lineSegmentsGeometry = useMemo(() => {
    const geometry = new LineSegmentsGeometry();
    const positions = [];
    const colors = [];

    for (const segment of segments) {
      positions.push(...segment.startPoint, ...segment.endPoint);
      colors.push(...new THREE.Color(segment.color).toArray(), ...new THREE.Color(segment.color).toArray());
    }

    geometry.setPositions(positions);
    geometry.setColors(colors);

    return geometry;
  }, [segments]);

  const lineMaterial = useMemo(() => {
    return new LineMaterial({
      color: 'white',
      linewidth: 4,
      vertexColors: true,
      dashed: false,
      opacity: 0.7,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
  }, []);

  return (
    <lineSegments2 ref={lineRef}
    onContextMenu={handleClick}
      geometry={lineSegmentsGeometry}
      material={lineMaterial}
    >
      <primitive object={camera} />
    </lineSegments2>
  );
};


const LineSegmentsComponent2 = ({ segments }) => {
  const { camera } = useThree();

  const lineSegmentsGeometry = useMemo(() => {
    const geometry = new LineSegmentsGeometry();
    const positions = [];
    const colors = [];

    for (const segment of segments) {
      positions.push(...segment.startPoint, ...segment.endPoint);
      colors.push(...new THREE.Color(segment.color).toArray(), ...new THREE.Color(segment.color).toArray());
    }

    geometry.setPositions(positions);
    geometry.setColors(colors);

    return geometry;
  }, [segments]);

  const lineMaterial = useMemo(() => {
    return new LineMaterial({
      color: 'white',
      linewidth: 4,
      vertexColors: true,
      dashed: false,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
  }, []);

  return (
    <lineSegments2 geometry={lineSegmentsGeometry} material={lineMaterial}>
      <primitive object={camera} />
    </lineSegments2>
  );
};

const LineSegments = ({drawAll, segments, segmentsSelected,setSelectedSegment,setSegmentsSelected, dGraphData, dGraph }) => {
  return (
    <Canvas style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      {false && <axesHelper args={[1]} />}
      <OrbitControls makeDefault />
      {drawAll && <LineSegmentsComponent setSelectedSegment={setSelectedSegment} segments={segments} dGraph={dGraph} setSegmentsSelected={setSegmentsSelected} dGraphData={dGraphData} />}
      {<LineSegmentsComponent2 segments={segmentsSelected} /> }
    </Canvas>
  );
};

export default LineSegments;
