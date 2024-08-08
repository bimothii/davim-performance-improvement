import React, { useMemo,useState,useCallback, useRef,useEffect  } from 'react';
import { Canvas, extend, useThree,useFrame  } from '@react-three/fiber';
import { TubeGeometry } from 'three';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2';
extend({ LineSegments2 })
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

extend({ OrbitControls });

const LineSegmentsComponent = ({ segments, setSelectedSegment, setOnMouseDown, setOnMouseUp }) => {
  const lineRef = useRef();
  const { camera, raycaster, gl } = useThree();
  const [mouseDown, setMouseDown] = useState(null);

  const handleMouseDown = (event) => {
    if (!event)
      return;

    const rect = gl.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    setMouseDown({ x, y });
    console.log({ x, y })
  };

  const handleMouseUp = (event) => {
    if (!event)
      return;

    const rect = gl.domElement.getBoundingClientRect();
    const mouseUp = {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
    };
    console.log(mouseUp)

    // Convert mouseDown and mouseUp to screen coordinates and create a rectangle
    const selectionRectangle = createRectangleFromPoints(mouseDown, mouseUp);

    // Determine which segments are within the rectangle
    const selectedSegments = getSegmentsWithinRectangle(segments, selectionRectangle, camera, raycaster);

    setSelectedSegments(selectedSegments);
    setMouseDown(null);
  };

  setOnMouseDown(handleMouseDown);
  setOnMouseUp(handleMouseUp);

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

  const handleClick = ()=>{

  }

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

const createRectangleFromPoints = (point1, point2) => {
  // Implement function to create a rectangle object from two points
};

const getSegmentsWithinRectangle = (segments, rectangle, camera, raycaster) => {
  // Implement function to determine which segments are within the rectangle
  // You can use raycaster or simple 2D geometry calculations based on the segment endpoints and the rectangle
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

const LineSegments = ({drawAll, segments, segmentsSelected,setSelectedSegment }) => {


  //const { gl, camera } = useThree();
  const controls = useRef();

  const handleKeyDown = (event) => {
    if (event.ctrlKey && controls.current) {
      controls.current.enabled = false;
    }
  };

  const handleKeyUp = (event) => {
    if (!event.ctrlKey && controls.current) {
      controls.current.enabled = true;
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  ////
  // Reference to the canvas container
  const canvasContainerRef = useRef();

  const [mouseDown, setMouseDown] = useState(false);
  const [mouseUp, setMouseUp] = useState(false);

  const handleMouseDown = useCallback((event) => {
    if (event)
    mouseDown(event)
  }, []);

  const handleMouseUp = useCallback((event) => {
    if (event)
    mouseUp(event)
  }, []);



  return (
    <Canvas style={{ width: '100%', height: '100%' }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      {false && <axesHelper args={[1]} />}
      <OrbitControls ref={controls} makeDefault />
      {drawAll && <LineSegmentsComponent  setSelectedSegment={setSelectedSegment} segments={segments} setOnMouseDown={setMouseDown} setOnMouseUp={setMouseUp}  />}
      {<LineSegmentsComponent2 segments={segmentsSelected} /> }
    </Canvas>
  );
};

export default LineSegments;
