import React from 'react';
import { Form, Input } from 'antd';
import './SelectionConditionsForm.css';

const SelectionConditionsForm = ({ conditions, onChange }) => {
  console.log('SelectionConditionsForm conditions:', conditions);
  console.log('Type of conditions:', typeof conditions);
  console.log('Is Array?', Array.isArray(conditions));

  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
    return null;
  }

  const handleValueChange = (name, value) => {
    const updatedConditions = conditions.map(condition => {
      if (condition.name === name) {
        // Преобразуем запятую в точку для корректного парсинга
        const normalizedValue = value.replace(',', '.');
        return {
          ...condition,
          value: value === '' ? null : normalizedValue,
        };
      }
      return condition;
    });
    onChange(updatedConditions);
  };

  const formatValue = value => {
    if (value === null || value === '') return '';
    // Преобразуем точку в запятую для отображения
    return String(value).replace('.', ',');
  };

  const handleInputChange = (e, name) => {
    let value = e.target.value;
    value = value.replace(/\./g, ',');
    const pattern = /^-?\d*,?\d*$/;

    if (value === '' || value === '-' || pattern.test(value)) {
      const commaCount = (value.match(/,/g) || []).length;
      if (commaCount <= 1) {
        const minusCount = (value.match(/-/g) || []).length;
        if (minusCount <= 1 && value.indexOf('-') <= 0) {
          handleValueChange(name, value);
          const input = e.target;
          const position = input.selectionStart;
          setTimeout(() => {
            input.setSelectionRange(position, position);
          }, 0);
        }
      }
    }
  };

  const handlePaste = (e, name) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const cleanedValue = pastedText.trim().replace(/\s+/g, '');
    if (/^-?\d*,?\d*$/.test(cleanedValue)) {
      handleValueChange(name, cleanedValue);
    }
  };

  return (
    <div className="selection-conditions-form">
      <div className="form-group">
        <label>Условия отбора</label>
        <div className="conditions-grid">
          {conditions.map(condition => (
            <div key={condition.name} className="condition-item">
              <div className="input-wrapper">
                <label>{condition.name}</label>
                <Input
                  placeholder="Введите значение"
                  value={formatValue(condition.value)}
                  onChange={e => handleInputChange(e, condition.name)}
                  onPaste={e => handlePaste(e, condition.name)}
                  onKeyDown={e => {
                    // Разрешаем: цифры, запятую, минус, Backspace, Delete, стрелки
                    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight'];
                    const allowedChars = /[-,\d]/;

                    if (!allowedKeys.includes(e.key) && !allowedChars.test(e.key) && !e.ctrlKey) {
                      e.preventDefault();
                    }
                  }}
                />
              </div>
              <div className="unit">{condition.unit}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SelectionConditionsForm;
