import React, { useState } from 'react';
import './SplitPane.css';

const SplitPane = ({ direction, initialSizes, children }) => {
  const [sizes, setSizes] = useState(initialSizes);

  const handleDrag = (index, event) => {
    const newSize = [...sizes];
    newSize[index] = event.target.value;
    setSizes(newSize);
  };

  return (
    <div className={`split-pane-container ${direction}`}>
      {React.Children.map(children, (child, index) => (
        <div
          className="split-pane"
          style={{ [direction === 'horizontal' ? 'width' : 'height']: `${sizes[index]}%` }}
        >
          {child}
          {index < children.length - 1 && (
            <input
              type="range"
              min="0"
              max="100"
              value={sizes[index]}
              className={`split-pane-divider ${direction}`}
              onChange={(event) => handleDrag(index, event)}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default SplitPane;
