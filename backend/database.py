import React from 'react';

export default function Board({ state, onCellClick }) {
  return (
    <div className="board">
      {state.board.map((row, i) => (
        <div className="row" key={i}>
          {row.map((cell, j) => (
            <div
              key={`${i}-${j}`}
              className={`cell ${cell ? cell.type.toLowerCase() : ''}`}
              onClick={() => onCellClick(i, j)}
            >
              {cell && <span>{cell.value}</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}