import React, { useState, useRef } from 'react';
import Modal from '../ui/Modal';
import axios from 'axios';
import './AddCalculationModal.css';
import FormulaKeyboard from './FormulaKeyboard';

const CONVERGENCE_OPTIONS = [
  { value: 'satisfactory', label: 'Удовлетворительно' },
  { value: 'unsatisfactory', label: 'Неудовлетворительно' },
  { value: 'absence', label: 'Отсутствие' },
  { value: 'traces', label: 'Следы' },
];

const AddCalculationModal = ({ isOpen, onClose, researchPageId, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    formula: '',
    measurement_error: {
      type: 'fixed',
      value: '',
      ranges: [],
    },
    unit: '',
    measurement_method: '',
    nd_code: '',
    nd_name: '',
    input_data: {
      fields: [{ name: '', description: '' }],
    },
    intermediate_data: {
      fields: [{ name: '', formula: '', description: '' }],
    },
    convergence_conditions: {
      formulas: [
        {
          formula: '',
          convergence_value: 'satisfactory',
        },
      ],
    },
    is_deleted: false,
    rounding_type: 'decimal',
    rounding_decimal: 0,
    parallel_count: 0,
    is_active: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [activeFormulaField, setActiveFormulaField] = useState(null);
  const formulaRefs = {
    main: useRef(null),
    convergence: useRef([]),
    intermediate: useRef([]),
    error: useRef(null),
  };

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleInputDataChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      input_data: {
        fields: prev.input_data.fields.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const handleIntermediateDataChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      intermediate_data: {
        fields: prev.intermediate_data.fields.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const handleConvergenceChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      convergence_conditions: {
        formulas: prev.convergence_conditions.formulas.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const deleteInputField = indexToDelete => {
    setFormData(prev => ({
      ...prev,
      input_data: {
        fields: prev.input_data.fields.filter((_, index) => index !== indexToDelete),
      },
    }));
  };

  const deleteIntermediateField = indexToDelete => {
    setFormData(prev => ({
      ...prev,
      intermediate_data: {
        fields: prev.intermediate_data.fields.filter((_, index) => index !== indexToDelete),
      },
    }));
  };

  const addInputField = () => {
    setFormData(prev => ({
      ...prev,
      input_data: {
        fields: [...prev.input_data.fields, { name: '', description: '' }],
      },
    }));
  };

  const addIntermediateField = () => {
    setFormData(prev => ({
      ...prev,
      intermediate_data: {
        fields: [...prev.intermediate_data.fields, { name: '', formula: '', description: '' }],
      },
    }));
  };

  const addConvergenceCondition = () => {
    setFormData(prev => ({
      ...prev,
      convergence_conditions: {
        formulas: [
          ...prev.convergence_conditions.formulas,
          {
            formula: '',
            convergence_value: 'satisfactory',
          },
        ],
      },
    }));
  };

  const deleteConvergenceCondition = indexToDelete => {
    setFormData(prev => ({
      ...prev,
      convergence_conditions: {
        formulas: prev.convergence_conditions.formulas.filter(
          (_, index) => index !== indexToDelete
        ),
      },
    }));
  };

  const handleFormulaKeyPress = value => {
    if (!activeFormulaField) return;

    const [type, index, field] = activeFormulaField.split('-');

    if (type === 'main') {
      const input = formulaRefs.main.current;
      const start = input.selectionStart;
      const end = input.selectionEnd;

      if (value === 'backspace') {
        if (start !== end) {
          const newValue = input.value.substring(0, start) + input.value.substring(end);
          setFormData(prev => ({ ...prev, formula: newValue }));
          setTimeout(() => {
            input.selectionStart = input.selectionEnd = start;
            input.focus();
          }, 0);
        } else if (start > 0) {
          const newValue = input.value.substring(0, start - 1) + input.value.substring(end);
          setFormData(prev => ({ ...prev, formula: newValue }));
          setTimeout(() => {
            input.selectionStart = input.selectionEnd = start - 1;
            input.focus();
          }, 0);
        }
      } else {
        const newValue = input.value.substring(0, start) + value + input.value.substring(end);
        setFormData(prev => ({ ...prev, formula: newValue }));
        setTimeout(() => {
          input.selectionStart = input.selectionEnd = start + value.length;
          input.focus();
        }, 0);
      }
    } else if (type === 'error') {
      const input = formulaRefs.error.current;
      const start = input.selectionStart;
      const end = input.selectionEnd;

      if (value === 'backspace') {
        if (start !== end) {
          const newValue = input.value.substring(0, start) + input.value.substring(end);
          setFormData(prev => ({ ...prev, measurement_error: newValue }));
          setTimeout(() => {
            input.selectionStart = input.selectionEnd = start;
            input.focus();
          }, 0);
        } else if (start > 0) {
          const newValue = input.value.substring(0, start - 1) + input.value.substring(end);
          setFormData(prev => ({ ...prev, measurement_error: newValue }));
          setTimeout(() => {
            input.selectionStart = input.selectionEnd = start - 1;
            input.focus();
          }, 0);
        }
      } else {
        const newValue = input.value.substring(0, start) + value + input.value.substring(end);
        setFormData(prev => ({ ...prev, measurement_error: newValue }));
        setTimeout(() => {
          input.selectionStart = input.selectionEnd = start + value.length;
          input.focus();
        }, 0);
      }
    } else if (type === 'convergence') {
      const formulas = [...formData.convergence_conditions.formulas];
      const input = formulaRefs.convergence.current[index];
      const start = input.selectionStart;
      const end = input.selectionEnd;

      if (value === 'backspace') {
        if (start !== end) {
          const newValue = input.value.substring(0, start) + input.value.substring(end);
          formulas[index] = { ...formulas[index], formula: newValue };
          setFormData(prev => ({
            ...prev,
            convergence_conditions: { formulas },
          }));
          setTimeout(() => {
            input.selectionStart = input.selectionEnd = start;
            input.focus();
          }, 0);
        } else if (start > 0) {
          const newValue = input.value.substring(0, start - 1) + input.value.substring(end);
          formulas[index] = { ...formulas[index], formula: newValue };
          setFormData(prev => ({
            ...prev,
            convergence_conditions: { formulas },
          }));
          setTimeout(() => {
            input.selectionStart = input.selectionEnd = start - 1;
            input.focus();
          }, 0);
        }
      } else {
        const newValue = input.value.substring(0, start) + value + input.value.substring(end);
        formulas[index] = { ...formulas[index], formula: newValue };
        setFormData(prev => ({
          ...prev,
          convergence_conditions: { formulas },
        }));
        setTimeout(() => {
          input.selectionStart = input.selectionEnd = start + value.length;
          input.focus();
        }, 0);
      }
    } else if (type === 'intermediate') {
      const fields = [...formData.intermediate_data.fields];
      const input = formulaRefs.intermediate.current[index];
      const start = input.selectionStart;
      const end = input.selectionEnd;

      if (value === 'backspace') {
        if (start !== end) {
          const newValue = input.value.substring(0, start) + input.value.substring(end);
          fields[index] = { ...fields[index], formula: newValue };
          setFormData(prev => ({
            ...prev,
            intermediate_data: { fields },
          }));
          setTimeout(() => {
            input.selectionStart = input.selectionEnd = start;
            input.focus();
          }, 0);
        } else if (start > 0) {
          const newValue = input.value.substring(0, start - 1) + input.value.substring(end);
          fields[index] = { ...fields[index], formula: newValue };
          setFormData(prev => ({
            ...prev,
            intermediate_data: { fields },
          }));
          setTimeout(() => {
            input.selectionStart = input.selectionEnd = start - 1;
            input.focus();
          }, 0);
        }
      } else {
        const newValue = input.value.substring(0, start) + value + input.value.substring(end);
        fields[index] = { ...fields[index], formula: newValue };
        setFormData(prev => ({
          ...prev,
          intermediate_data: { fields },
        }));
        setTimeout(() => {
          input.selectionStart = input.selectionEnd = start + value.length;
          input.focus();
        }, 0);
      }
    }
  };

  // Получаем список переменных из входных данных
  const inputVariables = formData.input_data.fields
    .map(field => field.name)
    .filter(name => name.trim() !== '');

  // Модифицируем существующие поля ввода формул, добавляя обработчики фокуса
  const renderFormulaInput = (value, onChange, type, index = null, placeholder = '') => (
    <div className="formula-input-container">
      <input
        type="text"
        value={value}
        onChange={onChange}
        onFocus={() => setActiveFormulaField(`${type}-${index ?? 'main'}`)}
        ref={el => {
          if (type === 'main') formulaRefs.main.current = el;
          else if (type === 'convergence') formulaRefs.convergence.current[index] = el;
          else if (type === 'intermediate') formulaRefs.intermediate.current[index] = el;
          else if (type === 'error') formulaRefs.error.current = el;
        }}
        placeholder={placeholder}
        required
      />
      {activeFormulaField === `${type}-${index ?? 'main'}` && (
        <FormulaKeyboard onKeyPress={handleFormulaKeyPress} variables={inputVariables} />
      )}
    </div>
  );

  const handleMeasurementErrorTypeChange = type => {
    let newMeasurementError = {
      type,
      value: '',
      ranges: [],
    };

    if (type === 'range') {
      newMeasurementError.ranges = [{ formula: '', value: '' }];
      delete newMeasurementError.value;
    }

    setFormData(prev => ({
      ...prev,
      measurement_error: newMeasurementError,
    }));
  };

  const handleMeasurementErrorValueChange = value => {
    setFormData(prev => ({
      ...prev,
      measurement_error: {
        ...prev.measurement_error,
        value,
      },
    }));
  };

  const handleMeasurementErrorRangeChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      measurement_error: {
        ...prev.measurement_error,
        ranges: prev.measurement_error.ranges.map((range, i) =>
          i === index ? { ...range, [field]: value } : range
        ),
      },
    }));
  };

  const addMeasurementErrorRange = () => {
    setFormData(prev => ({
      ...prev,
      measurement_error: {
        ...prev.measurement_error,
        ranges: [...prev.measurement_error.ranges, { formula: '', value: '' }],
      },
    }));
  };

  const deleteMeasurementErrorRange = indexToDelete => {
    setFormData(prev => ({
      ...prev,
      measurement_error: {
        ...prev.measurement_error,
        ranges: prev.measurement_error.ranges.filter((_, index) => index !== indexToDelete),
      },
    }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Отправляем данные метода исследования
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/research-methods/`,
        formData
      );

      if (response.data) {
        // Получаем текущие данные страницы исследований
        const researchPageResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/research-pages/${researchPageId}/`
        );

        if (researchPageResponse.data) {
          // Собираем массив ID методов
          const currentMethodIds = researchPageResponse.data.research_methods.map(
            method => method.id
          );
          const updatedMethodIds = [...currentMethodIds, response.data.id];

          // Отправляем только массив ID методов
          await axios.patch(
            `${import.meta.env.VITE_API_URL}/api/research-pages/${researchPageId}/`,
            {
              research_methods: updatedMethodIds,
            }
          );

          // Вызываем колбэк успешного добавления с полными данными нового метода
          onSuccess(response.data);
          onClose();
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Произошла ошибка при сохранении');
      console.error('Ошибка при сохранении:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      header="Добавление метода исследования"
      onClose={onClose}
      onSave={handleSubmit}
      style={{ width: '1000px' }}
      isSubmitting={isSubmitting}
    >
      <div className="add-calculation-form">
        {error && <div className="general-error">{error}</div>}

        <div className="form-group">
          <label>Название формулы</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-section">
          <h3>Входные данные</h3>
          {formData.input_data.fields.map((field, index) => (
            <div key={index} className="field-group">
              {formData.input_data.fields.length > 1 && (
                <button
                  type="button"
                  className="delete-field-btn"
                  onClick={() => deleteInputField(index)}
                >
                  ×
                </button>
              )}
              <div className="form-group">
                <label>Переменная</label>
                <input
                  type="text"
                  value={field.name}
                  onChange={e => handleInputDataChange(index, 'name', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Описание переменной</label>
                <input
                  type="text"
                  value={field.description}
                  onChange={e => handleInputDataChange(index, 'description', e.target.value)}
                  required
                />
              </div>
            </div>
          ))}
          <button type="button" onClick={addInputField} className="add-field-btn">
            + Добавить переменную
          </button>
        </div>

        <div className="form-group">
          <label>Формула</label>
          {renderFormulaInput(
            formData.formula,
            e => handleInputChange(e),
            'main',
            null,
            'Введите формулу расчета'
          )}
        </div>

        <div className="form-group">
          <label>Тип погрешности</label>
          <select
            value={formData.measurement_error.type}
            onChange={e => handleMeasurementErrorTypeChange(e.target.value)}
            required
          >
            <option value="fixed">Фиксированное значение</option>
            <option value="formula">Формула</option>
            <option value="range">Диапазонное</option>
          </select>
        </div>

        {formData.measurement_error.type !== 'range' && (
          <div className="form-group">
            <label>
              {formData.measurement_error.type === 'fixed'
                ? 'Значение погрешности'
                : 'Формула погрешности'}
            </label>
            {formData.measurement_error.type === 'formula' ? (
              renderFormulaInput(
                formData.measurement_error.value,
                e => handleMeasurementErrorValueChange(e.target.value),
                'error',
                null,
                'Введите формулу для расчета погрешности'
              )
            ) : (
              <input
                type="text"
                value={formData.measurement_error.value}
                onChange={e => handleMeasurementErrorValueChange(e.target.value)}
                placeholder="Введите числовое значение"
                required
              />
            )}
          </div>
        )}

        {formData.measurement_error.type === 'range' && (
          <div className="form-section">
            <h3>Диапазоны погрешности</h3>
            {formData.measurement_error.ranges.map((range, index) => (
              <div key={index} className="field-group">
                {formData.measurement_error.ranges.length > 1 && (
                  <button
                    type="button"
                    className="delete-field-btn"
                    onClick={() => deleteMeasurementErrorRange(index)}
                  >
                    ×
                  </button>
                )}
                <div className="form-group">
                  <label>Условие диапазона</label>
                  {renderFormulaInput(
                    range.formula,
                    e => handleMeasurementErrorRangeChange(index, 'formula', e.target.value),
                    'range-formula',
                    index,
                    'Например: result < 10'
                  )}
                </div>
                <div className="form-group">
                  <label>Значение погрешности</label>
                  <input
                    type="text"
                    value={range.value}
                    onChange={e =>
                      handleMeasurementErrorRangeChange(index, 'value', e.target.value)
                    }
                    placeholder="Введите числовое значение"
                    required
                  />
                </div>
              </div>
            ))}
            <button type="button" onClick={addMeasurementErrorRange} className="add-field-btn">
              + Добавить диапазон
            </button>
          </div>
        )}

        <div className="form-group">
          <label>Единица измерения</label>
          <input
            type="text"
            name="unit"
            value={formData.unit}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Метод измерения</label>
          <input
            type="text"
            name="measurement_method"
            value={formData.measurement_method}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Шифр НД</label>
          <input
            type="text"
            name="nd_code"
            value={formData.nd_code}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Наименование НД</label>
          <input
            type="text"
            name="nd_name"
            value={formData.nd_name}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-section">
          <h3>Промежуточные данные</h3>
          {formData.intermediate_data.fields.map((field, index) => (
            <div key={index} className="field-group">
              {formData.intermediate_data.fields.length > 1 && (
                <button
                  type="button"
                  className="delete-field-btn"
                  onClick={() => deleteIntermediateField(index)}
                >
                  ×
                </button>
              )}
              <div className="form-group">
                <label>Переменная</label>
                <input
                  type="text"
                  value={field.name}
                  onChange={e => handleIntermediateDataChange(index, 'name', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Описание переменной</label>
                <input
                  type="text"
                  value={field.description}
                  onChange={e => handleIntermediateDataChange(index, 'description', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Формула</label>
                {renderFormulaInput(
                  field.formula,
                  e => handleIntermediateDataChange(index, 'formula', e.target.value),
                  'intermediate',
                  index,
                  'Введите формулу для промежуточного расчета'
                )}
              </div>
            </div>
          ))}
          <button type="button" onClick={addIntermediateField} className="add-field-btn">
            + Добавить промежуточную переменную
          </button>
        </div>

        <div className="form-section">
          <h3>Условия сходимости</h3>
          {formData.convergence_conditions.formulas.map((condition, index) => (
            <div key={index} className="field-group">
              {formData.convergence_conditions.formulas.length > 1 && (
                <button
                  type="button"
                  className="delete-field-btn"
                  onClick={() => deleteConvergenceCondition(index)}
                >
                  ×
                </button>
              )}
              <div className="form-group">
                <label>Формула условия</label>
                {renderFormulaInput(
                  condition.formula,
                  e => handleConvergenceChange(index, 'formula', e.target.value),
                  'convergence',
                  index,
                  'Например: (T₁-T₂) ≤ 2'
                )}
              </div>
              <div className="form-group">
                <label>Значение сходимости</label>
                <select
                  value={condition.convergence_value}
                  onChange={e =>
                    handleConvergenceChange(index, 'convergence_value', e.target.value)
                  }
                  required
                >
                  {CONVERGENCE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          <button type="button" onClick={addConvergenceCondition} className="add-field-btn">
            + Добавить условие сходимости
          </button>
        </div>

        <div className="form-group">
          <label>Тип округления</label>
          <select
            name="rounding_type"
            value={formData.rounding_type}
            onChange={handleInputChange}
            required
          >
            <option value="decimal">До десятичного знака</option>
            <option value="significant">До значащей цифры</option>
          </select>
        </div>

        <div className="form-group">
          <label>Количество знаков округления</label>
          <input
            type="number"
            name="rounding_decimal"
            value={formData.rounding_decimal}
            onChange={handleInputChange}
            required
            min="0"
          />
        </div>

        <div className="form-group">
          <label>Количество параллелей</label>
          <input
            type="number"
            name="parallel_count"
            value={formData.parallel_count}
            onChange={handleInputChange}
            min="0"
            required
          />
          <small
            className="help-text"
            style={{ color: '#666', display: 'block', marginTop: '4px', fontSize: '12px' }}
          >
            0 - один расчет, 1 и более - дополнительные параллельные расчеты
          </small>
        </div>
      </div>
    </Modal>
  );
};

export default AddCalculationModal;
