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
  const { camera, gl } = useThree();
  const [startPos, setStartPos] = useState(false);

  // Function to create a bounding box cube
  const createBoundingBox = (start, end) => {
    const min = new THREE.Vector3(Math.min(start.x, end.x), Math.min(start.y, end.y), Math.min(start.z, end.z));
    const max = new THREE.Vector3(Math.max(start.x, end.x), Math.max(start.y, end.y), Math.max(start.z, end.z));
    return new THREE.Box3(min, max);
  };
  let once = false;
  // Function to check if a line segment intersects the bounding box
  const lineIntersectsBox = (line, box) => {
    // Check if either end point is inside the box
    if (box.containsPoint(line.start) || box.containsPoint(line.end)) {
      return true;
    }
    if (!once){
      console.log("check ex:")
    console.log(line.start)
    console.log(line.end)
    once = true;
    }

    // Check for intersection with each face of the box
    // This requires checking against planes and might be more complex
    // depending on the accuracy and performance needs
    // ...

    return false; // Default return false if no intersection found
  };

  const handleClick = useCallback((event) => {
    event.stopPropagation();
    if (event.button !== 2) return;
  
    const rect = gl.domElement.getBoundingClientRect();
    let mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  
    // Create a Vector3 with the z coordinate set for unprojection
    let mouse3D = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    mouse3D.unproject(camera);
  
    let distance = 1; // The distance can be adjusted as needed
    
    const direction = mouse3D.sub(camera.position).normalize();
    let point = camera.position.clone().add(direction.multiplyScalar(distance));
    
  
    if (!startPos) {
      
      console.log(point);
      setStartPos(point);
      return;
    }
    distance = 4;
    point = camera.position.clone().add(direction.multiplyScalar(distance));
    const endPos = point;
    console.log(point);
    const boundingBox = createBoundingBox(startPos, endPos);
  
    let selectedSegs = [];
    segments.forEach((segment, index) => {
      const line = new THREE.Line3(new THREE.Vector3(...segment.startPoint), new THREE.Vector3(...segment.endPoint));
      if (lineIntersectsBox(line, boundingBox)) {
        segments[index].color = 'red';
        selectedSegs.push(segments[index]);
        //console.log('Selected segment:', segment);
      }
    });
    console.log(selectedSegs.length);
    setSegmentsSelected(selectedSegs);
    setStartPos(false);
  }, [startPos, segments, camera, gl.domElement]);
  

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
