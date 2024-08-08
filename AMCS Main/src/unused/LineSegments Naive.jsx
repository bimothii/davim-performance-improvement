// LineSegments.js
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { extend } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei';
extend({ OrbitControls })

const LineSegment = ({ startPoint, endPoint, color }) => {
    const vertices = [startPoint, endPoint].flat();
  
    const geometry = React.useMemo(() => {
      const geom = new BufferGeometry();
      geom.setAttribute('position', new Float32BufferAttribute(vertices, 3));
      return geom;
    }, [vertices]);
    if (startPoint.every((num) => !isNaN(num)) &&
      endPoint.every((num) => !isNaN(num)) )
    return (
      <line geometry={geometry}>
        <lineBasicMaterial attach="material" color={color} />
      </line>
    );
    else
      return <></>
  };

  const LineSegments = ({ segments, selectRegion }) => {
    console.log("HERE");
    console.log(segments);
    return (
      <Canvas style={{ width: '100%', height: '100%' }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        {segments.map((segment, idx) => (
          <LineSegment
            key={idx}
            startPoint={segment.startPoint}
            endPoint={segment.endPoint}
            color={segment.color}
          />
        ))}
        <axesHelper args={[5]} />
        <OrbitControls makeDefault />
      </Canvas>
    );
  };

export default LineSegments;
