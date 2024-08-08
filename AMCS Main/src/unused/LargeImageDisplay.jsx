import React, { useRef, useState } from 'react';
import { Stage, Layer, Image, Rect } from 'react-konva';
import useImage from 'use-image';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const LargeImageDisplay = ({ imageUrl }) => {
  const [image] = useImage(imageUrl);
  const stageRef = useRef(null);
  const [selection, setSelection] = useState({ x: 0, y: 0, width: 0, height: 0 });

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
    console.log('Selected region:', selection);
  };

  const handleWrapperMouseDown = (e) => {
    // Disable panning with the left mouse button (0)
    if (e.button === 0) {
      e.stopPropagation();
    }
  };

  return (
    <TransformWrapper >
      <TransformComponent >
      <div onMouseDown={handleWrapperMouseDown}>
          <Stage
          ref={stageRef}
          width={window.innerWidth}
          height={window.innerHeight}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <Layer>
            <Image image={image} />
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
  );
};

export default LargeImageDisplay;
