import React, { useMemo,useState,useCallback, useRef } from 'react';
import { Canvas, extend, useThree,useFrame  } from '@react-three/fiber';
import { TubeGeometry } from 'three';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2';
extend({ LineSegments2 })
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

extend({ OrbitControls });

const LineSegmentsComponent = ({ segments, setSelectedSegment, setSegmentsSelected }) => {
  const lineRef = useRef();
  const { camera, raycaster, gl } = useThree();
  const [mouse, setMouse] = useState(new THREE.Vector2());
  const [startPos,setStartPos] = useState(false);

  function generateGridPoints(diagonalStart, diagonalEnd, numPoints) {
    // Calculate the number of points along each axis
    // Assuming numPoints is a perfect square for a uniform grid
    const pointsPerSide = Math.sqrt(numPoints);

    // Calculate the step sizes along each axis
    const xStep = (diagonalEnd[0] - diagonalStart[0]) / (pointsPerSide - 1);
    const yStep = (diagonalEnd[1] - diagonalStart[1]) / (pointsPerSide - 1);

    // Initialize an array to store the grid points
    let grid = [];

    // Generate the grid points
    for (let i = 0; i < pointsPerSide; i++) {
        for (let j = 0; j < pointsPerSide; j++) {
            // Calculate the coordinates for each point
            let x = diagonalStart[0] + i * xStep;
            let y = diagonalStart[1] + j * yStep;

            // Add the point to the grid array
            grid.push([x, y]);
        }
    }

    return grid;
}

  const handleClick = useCallback((event) => {
    event.stopPropagation();
    if (event.button !== 2)
      return;

    const rect = gl.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (!startPos){
      console.log(startPos)
      setStartPos([mouse.x,mouse.y]);
      return;
    }

    console.log([startPos[0], startPos[1],mouse.x,mouse.y])
    let selectedSegs = []
    let grid = generateGridPoints(startPos, [mouse.x,mouse.y], 100);
    setStartPos(false);
    grid.forEach(pt=>{
      mouse.x = pt[0]
      mouse.y = pt[1]

      console.log(pt)

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(lineRef.current, true);
  
      if (intersects.length > 0) {
        const selectedSegmentIndex = Math.floor(intersects[0].faceIndex);
        const pt = intersects[0].pointOnLine;
        segments.forEach(seg => {
          if (seg.startPoint == pt || seg.endPoint==pt)
            console.log("FOUND ",seg);
        });
        //setSelectedSegment(selectedSegmentIndex);
        
        segments[selectedSegmentIndex].color = 'red';
        selectedSegs.push(segments[selectedSegmentIndex])
        console.log('Selected segment index:', selectedSegmentIndex);
      }
    })

    setSegmentsSelected(selectedSegs)

    
  }, [startPos]);

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

const LineSegments = ({drawAll, segments, segmentsSelected,setSelectedSegment,setSegmentsSelected }) => {
  return (
    <Canvas style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      {false && <axesHelper args={[1]} />}
      <OrbitControls makeDefault />
      {drawAll && <LineSegmentsComponent setSelectedSegment={setSelectedSegment} segments={segments} setSegmentsSelected={setSegmentsSelected} />}
      {<LineSegmentsComponent2 segments={segmentsSelected} /> }
    </Canvas>
  );
};

export default LineSegments;
