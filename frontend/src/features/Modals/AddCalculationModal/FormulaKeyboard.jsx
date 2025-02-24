import React from 'react';
import './FormulaKeyboard.css';

const FormulaKeyboard = ({ onKeyPress, variables = [] }) => {
  const operators = [
    { symbol: '+', display: '+' },
    { symbol: '-', display: '−' },
    { symbol: '*', display: '×' },
    { symbol: '/', display: '÷' },
    { symbol: '=', display: '=' },
    { symbol: '>', display: '>' },
    { symbol: '<', display: '<' },
    { symbol: '>=', display: '≥' },
    { symbol: '<=', display: '≤' },
    { symbol: '.', display: '.' },
    { symbol: 'abs(', display: '|x|' },
    { symbol: '(', display: '(' },
    { symbol: ')', display: ')' },
    { symbol: 'backspace', display: '⌫' },
    { symbol: '0', display: '0' },
    { symbol: '1', display: '1' },
    { symbol: '2', display: '2' },
    { symbol: '3', display: '3' },
    { symbol: '4', display: '4' },
    { symbol: '5', display: '5' },
    { symbol: '6', display: '6' },
    { symbol: '7', display: '7' },
    { symbol: '8', display: '8' },
    { symbol: '9', display: '9' },
  ];

  const handleOperatorClick = op => {
    if (op.symbol === 'backspace') {
      onKeyPress('backspace');
    } else {
      onKeyPress(op.symbol);
    }
  };

  return (
    <div className="formula-keyboard">
      <div className="keyboard-section operators">
        {operators.map(op => (
          <button
            key={op.symbol}
            onClick={() => handleOperatorClick(op)}
            className="keyboard-button operator"
            type="button"
          >
            {op.display}
          </button>
        ))}
      </div>

      <div className="keyboard-section variables">
        <div className="section-title">Переменные:</div>
        <div className="variables-grid">
          {variables.map(variable => (
            <button
              key={variable}
              onClick={() => onKeyPress(variable)}
              className="keyboard-button variable"
              type="button"
            >
              {variable}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FormulaKeyboard;
