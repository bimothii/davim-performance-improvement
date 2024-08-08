import React from 'react';
import Popup from 'reactjs-popup';
import 'reactjs-popup/dist/index.css';

export default function PopupComponent({ items, handleLoad }) {
    return (
        <Popup trigger={<button className="button"> Snapshots </button>} modal>
            {close => (
                <div>
                    <a className="close" onClick={close}>
                        &times;
                    </a>
                    <div className="header"> Select a Snapshot </div>
                    <div className="content">
                        {items.map((item, index) => (
                            <div key={index}>
                                <input type="radio" value={item} name="item" /> {item}
                            </div>
                        ))}
                    </div>
                    <div className="actions">
                        <button
                            className="button"
                            onClick={() => {
                                handleLoad();
                                close();
                            }}
                        >
                            Load
                        </button>
                    </div>
                </div>
            )}
        </Popup>
    );
}
