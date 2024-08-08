import React, { useMemo,useState,useCallback, useRef,useEffect } from 'react';
import { Canvas, extend, useThree,useFrame  } from '@react-three/fiber';
import { TubeGeometry, BufferGeometry } from 'three';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2';
extend({ LineSegments2 })
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { OrbitControls,TrackballControls } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries, mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import {  Vector3 } from 'three';
import { InstancedMesh, Matrix4,MeshPhongMaterial, Color, Quaternion  } from 'three';



extend({ TrackballControls });

const Segments = ({ segments, radius, tubeRes }) => {
  const { scene } = useThree();
  const instancedMeshRef = useRef(null);

  useEffect(() => {
    const material = new THREE.MeshPhongMaterial();
    const geometry = new TubeGeometry(new THREE.CatmullRomCurve3([
      new Vector3(0, 0, 0),
      new Vector3(1, 0, 0)  // Unit vector along the x-axis for initial orientation
    ]), 20, radius, tubeRes, false);

    const instancedMesh = new THREE.InstancedMesh(geometry, material, segments.length);
    segments.forEach((segment, index) => {
      const start = new Vector3(...segment.startPoint);
      const end = new Vector3(...segment.endPoint);

      // Calculate segment vector
      const segmentVector = end.clone().sub(start);
      const length = segmentVector.length();

      // Extend start and end by 5% each
      const extension = segmentVector.clone().normalize().multiplyScalar(length * 0.05);
      const extendedStart = start.clone().sub(extension);
      const extendedEnd = end.clone().add(extension);
      const extendedLength = extendedEnd.clone().sub(extendedStart).length();

      // Calculate rotation to align the tube with the extended segment vector
      const quaternion = new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), segmentVector.normalize());

      // Apply scale and position
      const matrix = new Matrix4();
      matrix.compose(
        extendedStart, // Position the geometry at the extended start point
        quaternion,
        new Vector3(extendedLength, 1, 1) // Scale only in the length direction
      );

      instancedMesh.setMatrixAt(index, matrix);
      instancedMesh.setColorAt(index, new Color(segment.color));
    });

    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.instanceColor.needsUpdate = true;
    scene.add(instancedMesh);
    instancedMeshRef.current = instancedMesh;

    // Cleanup function to remove the previous instanced mesh
    return () => {
      if (instancedMeshRef.current) {
        scene.remove(instancedMeshRef.current);
        instancedMeshRef.current.geometry.dispose();
        instancedMeshRef.current.material.dispose();
        instancedMeshRef.current = null;
      }
    };
  }, [segments, radius, tubeRes, scene]);

  return null;
};


const LineSegmentsComponent = ({radius, tubeRes, segments, setSelectedSegment }) => {
  const groupRef = useRef();
  const { camera, raycaster, gl } = useThree();
  const [mouse, setMouse] = useState(new THREE.Vector2());

  const handleClick = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.button !== 2) return;
  
      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(groupRef.current.children, true);
  
      if (intersects.length > 0) {
        const intersection = intersects[0];
        const intersectedLine = intersection.object;
        const intersectionPoint = intersection.point;
  
        //const { segments } = intersectedLine.userData;
  
        let closestSegmentIndex = -1;
        let minDistance = Infinity;
  
        let idx = 0;
        //console.log(segments)
        segments.forEach((segment) => {
          const startPoint = new THREE.Vector3(...segment.startPoint);
          const endPoint = new THREE.Vector3(...segment.endPoint);
  
          const centerPoint = new THREE.Vector3()
            .addVectors(startPoint, endPoint)
            .multiplyScalar(0.5);
  
          const distance = centerPoint.distanceTo(intersectionPoint);
          //console.log(distance);
          if (distance < minDistance) {
            minDistance = distance;
            closestSegmentIndex = idx;
          }
          idx++;
        });
  
        setSelectedSegment(closestSegmentIndex);
        console.log("Selected segment index:", closestSegmentIndex);
      }
    },
    [camera, raycaster, gl.domElement, setSelectedSegment,segments]
  );
  

  const lineMeshes = useMemo(() => {
    const lineMap = {};

    segments.forEach((segment, index) => {
      const material = new THREE.MeshPhongMaterial({
        color: segment.color,
        transparent: true,
        opacity: 0.4,
      });

      const path = new THREE.CatmullRomCurve3([
        new THREE.Vector3(...segment.startPoint),
        new THREE.Vector3(...segment.endPoint),
      ]);

      const geometry = new TubeGeometry(path, 1, radius, tubeRes, false);
      geometry.userData.segmentIndex = index;

      if (!lineMap[segment.lineIDx]) {
        lineMap[segment.lineIDx] = {
          geometries: [geometry],
          material: material,
        };
      } else {
        lineMap[segment.lineIDx].geometries.push(geometry);
      }
    });

    return Object.entries(lineMap).map(([lineIDx, { geometries, material }]) => {
      const mergedGeometry = mergeGeometries(geometries);
      const mesh = new THREE.Mesh(mergedGeometry, material);
      mesh.userData.lineIndex = parseInt(lineIDx);
      mesh.userData.segments = geometries;
      return mesh;
    });
  }, [segments]);

  useEffect(() => {
    gl.domElement.addEventListener("contextmenu", handleClick);

    return () => {
      gl.domElement.removeEventListener("contextmenu", handleClick);
    };
  }, [gl.domElement, handleClick]);

  return (
    <group ref={groupRef}>
      {lineMeshes.map((mesh, index) => (
        <primitive key={index} object={mesh} />
      ))}
    </group>
  );
};



const LineSegmentsComponent2 = ({ radius, tubeRes, segments }) => {
  const meshes = useMemo(() => {
    const lineSegments = segments.reduce((acc, segment) => {
      if (segment !== undefined) { // Check if segment is defined
        if (!acc[segment.lineIDx]) {
          acc[segment.lineIDx] = [];
        }
        acc[segment.lineIDx].push(segment);
      }
      return acc;
    }, {});

    return Object.values(lineSegments).flatMap((line) => {
      return line.map((segment, index) => {
        const material = new THREE.MeshPhongMaterial({
          color: segment.color,
        });

        const points = [new THREE.Vector3(...segment.startPoint)];

        // If this is not the first segment, scale the previous segment's endPoint towards the current segment's startPoint
        if (index > 0) {
          const prevEndPoint = new THREE.Vector3(...line[index - 1].endPoint);
          const startPoint = new THREE.Vector3(...segment.startPoint);
          const scale = 0; // Adjust the scale value (between 0 and 1) to control the extrusion

          const scaledPoint = prevEndPoint.clone().lerp(startPoint, 1 - scale);
          points.unshift(scaledPoint);
        }

        points.push(new THREE.Vector3(...segment.endPoint));

        const path = new THREE.CatmullRomCurve3(points);

        // Subtract 1 from tube segments when the previous segment's endPoint is included
        const segmentTubeRes = index > 0 ? tubeRes - 1 : tubeRes;

        const geometry = new TubeGeometry(path, segmentTubeRes, radius, tubeRes, false);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.segmentIndex = index;

        return mesh;
      });
    });
  }, [segments]);

  return (
    <group>
      {meshes.map((mesh, index) => (
        <primitive key={index} object={mesh} />
      ))}
    </group>
  );
};





const DirectionalLightWithCamera = ({ intensity }) => {
  const directionalLightRef = useRef();
  const { camera } = useThree();

  useFrame(() => {
    if (directionalLightRef.current && camera) {
      //console.log("synced")
      directionalLightRef.current.position.copy(camera.position);
      directionalLightRef.current.rotation.copy(camera.rotation);
    }
  });

  return (
    <directionalLight
      ref={directionalLightRef}
      intensity={intensity}
    />
  );
};

const LineSegments = ({radius, tubeRes, drawAll, segments, segmentsSelected,setSelectedSegment, intensity }) => {

  return (
    <Canvas style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.5} />
      <DirectionalLightWithCamera intensity={intensity} />
      {false &&<pointLight position={[10, 10, 10]} />}
      {false && <axesHelper args={[1]} />}
      {/*<OrbitControls makeDefault />*/}
      <TrackballControls makeDefault/>
      {drawAll && <LineSegmentsComponent radius={radius} tubeRes={tubeRes} setSelectedSegment={setSelectedSegment} segments={segments} />}
      {false && <LineSegmentsComponent2 radius={radius} tubeRes={tubeRes} segments={segmentsSelected} /> }
      {segmentsSelected.length > 0 && <Segments  radius={radius} tubeRes={tubeRes} segments={segmentsSelected} /> }

    </Canvas>
  );
};

export default LineSegments;
