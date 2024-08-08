import React, { useMemo,useState,useCallback, useRef, useEffect  } from 'react';
import { Canvas, extend, useThree,useFrame  } from '@react-three/fiber';
import { TubeGeometry } from 'three';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2';
extend({ LineSegments2 })
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { OrbitControls, Sphere as FiberSphere, Box as FiberBox, TransformControls as FiberTransformControls   } from '@react-three/drei';
import * as THREE from 'three';

import { useLoader } from '@react-three/fiber';
import { VTKLoader } from 'three-stdlib';

import { scaleLinear } from 'd3-scale';
import { interpolateHsl } from 'd3-interpolate';
import { rgb } from 'd3-color';

extend({ OrbitControls });

function distanceBetweenVectors(vec1, vec2, shapeMode) {
  const xDiff = Math.abs(vec2[0] - vec1[0]);
  const yDiff = Math.abs(vec2[1] - vec1[1]);
  const zDiff = Math.abs(vec2[2] - vec1[2]);

  if (shapeMode === "Sphere") {
    // Euclidean distance (for spherical shape)
    return Math.sqrt(xDiff * xDiff + yDiff * yDiff + zDiff * zDiff);
  } else if (shapeMode === "Cube") {
    // Chebyshev distance (for cubic shape)
    return Math.max(xDiff, yDiff, zDiff);
  } else {
    // Default or error handling
    console.error("Invalid shapeMode");
    return 0;
  }
}



const LineSegmentsComponent = ({ segments, setSelectedSegment, segmentsSelected ,setSegmentsSelected, dGraphData, dGraph,
  spherePosition, setSpherePosition,sphereRadius, selectionMode, shapeMode, transformData}) => {
  const lineRef = useRef();
  const { camera, raycaster, gl } = useThree();
  const [mouse, setMouse] = useState(new THREE.Vector2());

  const handleClick = (event) => {
    //return;
    console.log("here");
    event.stopPropagation();
    if (event.button !== 2){
      return;
    }

      //if (event.ctrlKey) {
    if (event.ctrlKey) {
      console.log("CTRL")
      let selecteds = []
      if (selectionMode !=="Set")
        selecteds = [...segmentsSelected]
      console.log("SEL MODE: ", selectionMode)
      segments.forEach(seg => {
        if ((distanceBetweenVectors(seg.startPoint, spherePosition, shapeMode) < sphereRadius) || (distanceBetweenVectors(seg.endPoint, spherePosition, shapeMode) < sphereRadius)){
          //console.log("FOUND ",seg);
          if (selectionMode !=="Remove"){
            if (!selecteds.includes(seg)){
              selecteds.push(seg);
              //console.log("Added ",seg)
            }
          }else{
            if (selecteds.includes(seg))
              selecteds = selecteds.filter(item => item !== seg);
          }
        }
      });
      console.log("Added ",selecteds)
      setSegmentsSelected(selecteds)
      return;
        //console.log("Shift key is pressed.");
    } else {
        //console.log("Shift key is not pressed.", event.key, '|');
    }
    
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
        setSpherePosition(sseg.startPoint);
        let selecteds = []
        if (selectionMode=="Add")
          selecteds = segmentsSelected
        segments.forEach(seg => {
          if ((distanceBetweenVectors(seg.startPoint, sseg.startPoint, shapeMode) < sphereRadius) || (distanceBetweenVectors(seg.endPoint, sseg.endPoint, shapeMode) < sphereRadius)){
            //console.log("FOUND ",seg);
            if (selectionMode !=="Remove"){
              if (!selecteds.includes(seg))
                selecteds.push(seg);
            }else{
              if (selecteds.includes(seg))
                selecteds = selecteds.filter(item => item !== seg);
            }
          }
        });

        //setSegmentsSelected(selecteds)

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

const Sphere = ({ position, setPosition, radius, transformMode, setTransformData }) => {
  const sphereRef = useRef();
  const controlRef = useRef();
  const { camera, gl } = useThree();

  useEffect(() => {
    const control = controlRef.current;
    const callback = (event) => {
      if (sphereRef.current){
      console.log(sphereRef.current.position.toArray())
      setPosition(sphereRef.current.position.toArray());

      setTransformData(sphereRef.current.position)
    }
    }
    control.addEventListener('change', callback);
    console.log("Listener added")

    return () => {
      control.removeEventListener('change', callback);
    };
  }, [controlRef.current]);

  return (
    <>
      <FiberSphere ref={sphereRef} args={[radius, 32, 32]} position={position}>
        <meshStandardMaterial attach="material" color="blue" transparent opacity={0.2} />
      </FiberSphere>
      <FiberTransformControls ref={controlRef} args={[camera, gl.domElement]} object={sphereRef.current} mode={transformMode}/>
    </>
  );
};

const Cube = ({ position, setPosition, size, transformMode, setTransformData,objFile }) => {
  const cubeRef = useRef();
  const controlRef = useRef();
  const { camera, gl } = useThree();

  useEffect(() => {
    const control = controlRef.current;
    const callback = (event) => {
      if (cubeRef.current) {
        console.log(cubeRef.current.position.toArray())
        setPosition(cubeRef.current.position.toArray());
      }
    }
    control.addEventListener('change', callback);
    console.log("Listener added")

    return () => {
      control.removeEventListener('change', callback);
    };
  }, [controlRef.current]);

  return (
    <>
      <FiberBox ref={cubeRef} args={[size, size, size]} position={position}>
        <meshStandardMaterial attach="material" color="red" transparent opacity={0.2} />
      </FiberBox>
      <FiberTransformControls ref={controlRef} args={[camera, gl.domElement]} object={cubeRef.current} mode={transformMode} />
    </>
  );
};

const VtkModel = ({ fileData }) => {
  const [geometry, setGeometry] = useState(null);
  const { scene } = useThree();

  useEffect(() => {
    console.log(fileData)
    const loader = new VTKLoader();
    loader.load(fileData, (geometry) => {
      setGeometry(geometry);
    }, undefined, (error) => {
      console.error('An error happened during loading the VTK file:', error);
    });
  }, [fileData]);

  return geometry ? <mesh geometry={geometry} /> : null;
};



const LineSegments = ({drawAll, segments, segmentsSelected,setSelectedSegment,setSegmentsSelected, dGraphData, 
    dGraph, sphereRadius, selectionMode,shapeMode, transformMode, objFile }) => {
  // Initialize state for sphere's position and radius
  const [spherePosition, setSpherePosition] = useState([0, 0, 0]); // Default position
  //const [sphereRadius, setSphereRadius] = useState(1); // Default radius

  const [transformData, setTransformData] = useState(false)

  const handlePositionChange = (newPosition) => {
    setSpherePosition(newPosition);
  };

  return (
    <Canvas style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      {false && <axesHelper args={[1]} />}
      <OrbitControls makeDefault />
      {drawAll && <LineSegmentsComponent segmentsSelected={segmentsSelected} setSelectedSegment={setSelectedSegment} segments={segments} dGraph={dGraph} setSegmentsSelected={setSegmentsSelected} dGraphData={dGraphData}
        setSpherePosition={setSpherePosition} sphereRadius={sphereRadius} spherePosition={spherePosition} selectionMode={selectionMode} shapeMode={shapeMode}/>}
      {(shapeMode=="Sphere") && <Sphere position={spherePosition} radius={sphereRadius} setPosition={setSpherePosition} shapeMode={shapeMode} transformMode={transformMode} setTransformData={setTransformData} />}
      {(shapeMode=="Cube") && <Cube position={spherePosition} size={sphereRadius*2} setPosition={setSpherePosition} shapeMode={shapeMode} transformMode={transformMode} setTransformData={setTransformData} />}
      {objFile && <VtkModel  fileData={objFile} />}
      {<LineSegmentsComponent2 segments={segmentsSelected} /> }
    </Canvas>
  );
};

export default LineSegments;
