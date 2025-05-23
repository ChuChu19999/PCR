import React, { useState, useRef, useEffect } from 'react';
import Modal from '../ui/Modal';
import axios from 'axios';
import { message } from 'antd';
import './AddCalculationModal.css';
import FormulaKeyboard from './FormulaKeyboard';

const CONVERGENCE_OPTIONS = [
  { value: 'satisfactory', label: 'Удовлетворительно' },
  { value: 'unsatisfactory', label: 'Неудовлетворительно' },
  { value: 'absence', label: 'Отсутствие' },
  { value: 'traces', label: 'Следы' },
];

const AddCalculationModal = ({ isOpen, onClose, researchPageId, onSuccess, objectType }) => {
  const [activeTab, setActiveTab] = useState('single');
  const [isAnimating, setIsAnimating] = useState(false);

  const [fixtures, setFixtures] = useState({});
  const [selectedFixture, setSelectedFixture] = useState('');
  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false);
  const [methodGroups, setMethodGroups] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    sample_type: 'any',
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
      fields: [{ name: '', description: '', unit: '', card_index: 1 }],
    },
    intermediate_data: {
      fields: [
        {
          name: '',
          formula: '',
          description: '',
          unit: '',
          show_calculation: true,
          use_multiple_rounding: false,
          multiple_value: '',
        },
      ],
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
    is_active: true,
  });

  const [groupData, setGroupData] = useState({
    name: '',
    selectedMethods: [],
    is_active: true,
  });
  const [availableMethods, setAvailableMethods] = useState({ individual_methods: [], groups: [] });
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);

  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [activeFormulaField, setActiveFormulaField] = useState(null);
  const formulaRefs = {
    main: useRef(null),
    convergence: useRef([]),
    intermediate: useRef([]),
    error: useRef(null),
    range: useRef([]),
  };

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'group') {
        loadAvailableMethods();
      } else {
        loadFixtures(objectType);
      }
    }
  }, [isOpen, activeTab, objectType]);

  const loadFixtures = async type => {
    try {
      setIsLoadingFixtures(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/get-fixtures/?object_type=${type}`
      );
      setFixtures(response.data);
    } catch (err) {
      console.error('Ошибка при загрузке фикстур:', err);
      setError('Не удалось загрузить готовые методы');
    } finally {
      setIsLoadingFixtures(false);
    }
  };

  const applyFixture = fixtureName => {
    if (!fixtures[fixtureName]) return;

    const fixtureData = fixtures[fixtureName];
    setFormData({
      name: fixtureData.name || '',
      sample_type: fixtureData.sample_type || 'condensate',
      formula: fixtureData.formula || '',
      measurement_error: fixtureData.measurement_error || {
        type: 'fixed',
        value: '',
        ranges: [],
      },
      unit: fixtureData.unit || '',
      measurement_method: fixtureData.measurement_method || '',
      nd_code: fixtureData.nd_code || '',
      nd_name: fixtureData.nd_name || '',
      input_data: fixtureData.input_data || {
        fields: [{ name: '', description: '', unit: '', card_index: 1 }],
      },
      intermediate_data: fixtureData.intermediate_data || {
        fields: [
          {
            name: '',
            formula: '',
            description: '',
            unit: '',
            show_calculation: true,
            use_multiple_rounding: false,
            multiple_value: '',
          },
        ],
      },
      convergence_conditions: fixtureData.convergence_conditions || {
        formulas: [
          {
            formula: '',
            convergence_value: 'satisfactory',
          },
        ],
      },
      is_deleted: false,
      rounding_type: fixtureData.rounding_type || 'decimal',
      rounding_decimal: fixtureData.rounding_decimal || 0,
      is_active: true,
    });
  };

  const loadAvailableMethods = async () => {
    try {
      if (!researchPageId) {
        throw new Error('ID страницы исследований не указан');
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/research-methods/available-methods/`,
        {
          params: {
            research_page_id: researchPageId,
          },
        }
      );

      const { individual_methods = [], groups = [] } = response.data;
      setAvailableMethods({ individual_methods });
      setMethodGroups(groups);
    } catch (error) {
      console.error('Ошибка при загрузке доступных методов:', error);
      message.error('Не удалось загрузить список доступных методов');
    }
  };

  // Обработчик переключения режима создания
  const toggleCreationMode = () => {
    setIsCreatingGroup(!isCreatingGroup);
    setError(null);
  };

  // Обработчик изменения данных группы
  const handleGroupDataChange = (field, value) => {
    setGroupData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleInputDataChange = (index, field, value) => {
    setFormData(prevData => {
      const newInputData = [...prevData.input_data.fields];
      newInputData[index] = {
        ...newInputData[index],
        [field]: value,
      };
      return {
        ...prevData,
        input_data: {
          ...prevData.input_data,
          fields: newInputData,
        },
      };
    });
  };

  const handleIntermediateDataChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      intermediate_data: {
        ...prev.intermediate_data,
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
    setFormData(prevData => ({
      ...prevData,
      input_data: {
        ...prevData.input_data,
        fields: [
          ...prevData.input_data.fields,
          {
            name: '',
            description: '',
            card_index: 1,
          },
        ],
      },
    }));
  };

  const addIntermediateField = () => {
    setFormData(prev => ({
      ...prev,
      intermediate_data: {
        ...prev.intermediate_data,
        fields: [
          ...prev.intermediate_data.fields,
          {
            name: '',
            formula: '',
            description: '',
            unit: '',
            show_calculation: true,
            use_multiple_rounding: false,
            multiple_value: '',
            range_calculation: null,
          },
        ],
      },
    }));
  };

  const handleIntermediateRangeChange = (fieldIndex, rangeIndex, key, value) => {
    setFormData(prev => {
      const fields = [...prev.intermediate_data.fields];
      const field = { ...fields[fieldIndex] };

      if (!field.range_calculation) {
        field.range_calculation = { ranges: [] };
      }

      const ranges = [...field.range_calculation.ranges];
      ranges[rangeIndex] = { ...ranges[rangeIndex], [key]: value };

      field.range_calculation.ranges = ranges;
      fields[fieldIndex] = field;

      return {
        ...prev,
        intermediate_data: {
          ...prev.intermediate_data,
          fields,
        },
      };
    });
  };

  const addIntermediateRange = fieldIndex => {
    setFormData(prev => {
      const fields = [...prev.intermediate_data.fields];
      const field = { ...fields[fieldIndex] };

      if (!field.range_calculation) {
        field.range_calculation = { ranges: [] };
      }

      field.range_calculation.ranges = [
        ...(field.range_calculation.ranges || []),
        { condition: '', formula: '' },
      ];

      fields[fieldIndex] = field;

      return {
        ...prev,
        intermediate_data: {
          ...prev.intermediate_data,
          fields,
        },
      };
    });
  };

  const deleteIntermediateRange = (fieldIndex, rangeIndex) => {
    setFormData(prev => {
      const fields = [...prev.intermediate_data.fields];
      const field = { ...fields[fieldIndex] };

      if (field.range_calculation && field.range_calculation.ranges) {
        field.range_calculation.ranges = field.range_calculation.ranges.filter(
          (_, index) => index !== rangeIndex
        );

        if (field.range_calculation.ranges.length === 0) {
          field.range_calculation = null;
        }
      }

      fields[fieldIndex] = field;

      return {
        ...prev,
        intermediate_data: {
          ...prev.intermediate_data,
          fields,
        },
      };
    });
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

    const [type, index, rangeIndex, field] = activeFormulaField.split('-');

    if (type === 'intermediate' && rangeIndex !== undefined && field) {
      const input = formulaRefs.intermediate.current[index][rangeIndex][field];
      if (!input) return;

      const start = input.selectionStart;
      const end = input.selectionEnd;

      if (value === 'backspace') {
        if (start !== end) {
          const newValue = input.value.substring(0, start) + input.value.substring(end);
          handleIntermediateRangeChange(parseInt(index), parseInt(rangeIndex), field, newValue);
          setTimeout(() => {
            input.selectionStart = input.selectionEnd = start;
            input.focus();
          }, 0);
        } else if (start > 0) {
          const newValue = input.value.substring(0, start - 1) + input.value.substring(end);
          handleIntermediateRangeChange(parseInt(index), parseInt(rangeIndex), field, newValue);
          setTimeout(() => {
            input.selectionStart = input.selectionEnd = start - 1;
            input.focus();
          }, 0);
        }
      } else {
        const newValue = input.value.substring(0, start) + value + input.value.substring(end);
        handleIntermediateRangeChange(parseInt(index), parseInt(rangeIndex), field, newValue);
        setTimeout(() => {
          input.selectionStart = input.selectionEnd = start + value.length;
          input.focus();
        }, 0);
      }
      return;
    }

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
          setFormData(prev => ({
            ...prev,
            measurement_error: {
              ...prev.measurement_error,
              value: newValue,
            },
          }));
          setTimeout(() => {
            input.selectionStart = input.selectionEnd = start;
            input.focus();
          }, 0);
        } else if (start > 0) {
          const newValue = input.value.substring(0, start - 1) + input.value.substring(end);
          setFormData(prev => ({
            ...prev,
            measurement_error: {
              ...prev.measurement_error,
              value: newValue,
            },
          }));
          setTimeout(() => {
            input.selectionStart = input.selectionEnd = start - 1;
            input.focus();
          }, 0);
        }
      } else {
        const newValue = input.value.substring(0, start) + value + input.value.substring(end);
        setFormData(prev => ({
          ...prev,
          measurement_error: {
            ...prev.measurement_error,
            value: newValue,
          },
        }));
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
    } else if (type === 'range') {
      const input = formulaRefs.range.current[index];
      const start = input.selectionStart;
      const end = input.selectionEnd;

      if (value === 'backspace') {
        if (start !== end) {
          const newValue = input.value.substring(0, start) + input.value.substring(end);
          handleMeasurementErrorRangeChange(parseInt(index), 'formula', newValue);
          setTimeout(() => {
            input.selectionStart = input.selectionEnd = start;
            input.focus();
          }, 0);
        } else if (start > 0) {
          const newValue = input.value.substring(0, start - 1) + input.value.substring(end);
          handleMeasurementErrorRangeChange(parseInt(index), 'formula', newValue);
          setTimeout(() => {
            input.selectionStart = input.selectionEnd = start - 1;
            input.focus();
          }, 0);
        }
      } else {
        const newValue = input.value.substring(0, start) + value + input.value.substring(end);
        handleMeasurementErrorRangeChange(parseInt(index), 'formula', newValue);
        setTimeout(() => {
          input.selectionStart = input.selectionEnd = start + value.length;
          input.focus();
        }, 0);
      }
    }
  };

  const inputVariables = formData.input_data.fields
    .map(field => field.name)
    .filter(name => name.trim() !== '');

  const getAvailableVariables = (type, currentIndex = null) => {
    const intermediateVariables = formData.intermediate_data.fields
      .map(field => field.name)
      .filter(name => name.trim() !== '');

    // Для основной формулы и условий повторяемости доступны все переменные
    if (type === 'main' || type === 'convergence' || type === 'error' || type === 'range') {
      return [...inputVariables, ...intermediateVariables];
    }

    // Для промежуточных вычислений доступны только переменные, определенные выше
    if (type === 'intermediate' && currentIndex !== null) {
      const previousIntermediateVars = intermediateVariables.slice(0, currentIndex);
      return [...inputVariables, ...previousIntermediateVars];
    }

    return inputVariables;
  };

  const renderFormulaInput = (value, onChange, type, index = null, placeholder = '') => (
    <div className="formula-input-container">
      <input
        type="text"
        value={value}
        onChange={onChange}
        onFocus={() => setActiveFormulaField(`${type}-${index ?? 'main'}`)}
        onKeyDown={e => {
          if (
            e.key === 'Backspace' ||
            e.key === 'Delete' ||
            e.key === 'ArrowLeft' ||
            e.key === 'ArrowRight' ||
            ((e.ctrlKey || e.metaKey) && ['c', 'v', 'a', 'x'].includes(e.key.toLowerCase()))
          ) {
            return;
          }
          e.preventDefault();
        }}
        ref={el => {
          if (type === 'main') formulaRefs.main.current = el;
          else if (type === 'convergence') formulaRefs.convergence.current[index] = el;
          else if (type === 'intermediate') formulaRefs.intermediate.current[index] = el;
          else if (type === 'error') formulaRefs.error.current = el;
          else if (type === 'range') formulaRefs.range.current[index] = el;
        }}
        placeholder={placeholder}
      />
      {activeFormulaField === `${type}-${index ?? 'main'}` && (
        <FormulaKeyboard
          onKeyPress={handleFormulaKeyPress}
          variables={getAvailableVariables(type, index)}
        />
      )}
    </div>
  );

  const handleMeasurementErrorTypeChange = type => {
    let newMeasurementError = {
      type,
      value: '',
    };

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
        value: typeof value === 'object' ? value.target.value : value,
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

      if (activeTab === 'group') {
        // Создание группы методов
        if (!groupData.name.trim()) {
          setError('Введите название группы');
          setIsSubmitting(false);
          return;
        }
        if (groupData.selectedMethods.length === 0) {
          setError('Выберите хотя бы один метод для группы');
          setIsSubmitting(false);
          return;
        }

        const groupResponse = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/research-method-groups/`,
          {
            name: groupData.name,
            method_ids: groupData.selectedMethods,
            is_active: true,
          }
        );

        if (groupResponse.data) {
          const researchPageResponse = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/research-pages/${researchPageId}/`
          );

          if (researchPageResponse.data) {
            const currentMethodIds = researchPageResponse.data.research_methods.map(method =>
              typeof method === 'object' ? method.id : method
            );
            const updatedMethodIds = [...currentMethodIds, groupResponse.data.id];

            await axios.patch(
              `${import.meta.env.VITE_API_URL}/api/research-pages/${researchPageId}/`,
              {
                research_methods: updatedMethodIds,
              }
            );

            onSuccess(groupResponse.data);
            onClose();
          }
        }
      } else {
        // Валидация одиночного метода
        if (!formData.name.trim()) {
          setError('Введите название формулы');
          setIsSubmitting(false);
          return;
        }

        // Создание обычного метода
        const dataToSend = {
          name: formData.name || '',
          sample_type: formData.sample_type || 'condensate',
          formula: formData.formula || '',
          measurement_error: {
            type: formData.measurement_error.type,
            value: formData.measurement_error.value || '',
          },
          unit: formData.unit || '',
          measurement_method: formData.measurement_method || '',
          nd_code: formData.nd_code || '',
          nd_name: formData.nd_name || '',
          input_data:
            formData.input_data.fields.length > 0 && formData.input_data.fields[0].name
              ? formData.input_data
              : null,
          intermediate_data: {
            fields: formData.intermediate_data.fields.map(field => ({
              ...field,
              formula: field.range_calculation ? '0' : field.formula,
              rounding_type: field.use_multiple_rounding ? 'multiple' : undefined,
              rounding_decimal: field.use_multiple_rounding
                ? parseInt(field.multiple_value)
                : undefined,
            })),
          },
          convergence_conditions:
            formData.convergence_conditions.formulas.length > 0 &&
            formData.convergence_conditions.formulas[0].formula
              ? formData.convergence_conditions
              : null,
          is_deleted: false,
          rounding_type: formData.rounding_type || null,
          rounding_decimal: formData.rounding_decimal ? parseInt(formData.rounding_decimal) : 0,
          is_active: true,
        };

        console.log('Отправляемые данные:', JSON.stringify(dataToSend, null, 2));

        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/research-methods/`,
          dataToSend
        );

        if (response.data) {
          const researchPageResponse = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/research-pages/${researchPageId}/`
          );

          if (researchPageResponse.data) {
            const currentMethodIds = researchPageResponse.data.research_methods.map(method =>
              typeof method === 'object' ? method.id : method
            );
            const updatedMethodIds = [...currentMethodIds, response.data.id];

            await axios.patch(
              `${import.meta.env.VITE_API_URL}/api/research-pages/${researchPageId}/`,
              {
                research_methods: updatedMethodIds,
              }
            );

            onSuccess(response.data);
            onClose();
          }
        }
      }
    } catch (err) {
      console.error('Ошибка при сохранении:', err);
      console.log('Детали ошибки:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message,
      });
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          'Произошла ошибка при сохранении'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabChange = tab => {
    if (tab !== activeTab) {
      setIsAnimating(true);
      setError(null);
      if (tab === 'group') {
        setFormData({
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
            fields: [{ name: '', description: '', unit: '', card_index: 1 }],
          },
          intermediate_data: {
            fields: [
              {
                name: '',
                formula: '',
                description: '',
                unit: '',
                show_calculation: true,
                use_multiple_rounding: false,
                multiple_value: '',
              },
            ],
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
          is_active: true,
        });
      } else {
        setGroupData({
          name: '',
          selectedMethods: [],
          is_active: true,
        });
      }

      setTimeout(() => {
        setActiveTab(tab);
        setTimeout(() => {
          setIsAnimating(false);
        }, 50);
      }, 300);
    }
  };

  const resetFormData = () => {
    setFormData({
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
        fields: [{ name: '', description: '', unit: '', card_index: 1 }],
      },
      intermediate_data: {
        fields: [
          {
            name: '',
            formula: '',
            description: '',
            unit: '',
            show_calculation: true,
            use_multiple_rounding: false,
            multiple_value: '',
          },
        ],
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
      is_active: true,
    });
  };

  if (!isOpen) return null;

  return (
    <Modal
      header="Добавление метода исследования"
      onClose={onClose}
      onSave={handleSubmit}
      style={{ width: '1000px' }}
      isSubmitting={isSubmitting}
      noValidate={true}
    >
      <div className="add-calculation-form">
        {error && <div className="general-error">{error}</div>}

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'single' ? 'active' : ''}`}
            onClick={() => handleTabChange('single')}
            type="button"
          >
            Одиночный метод
          </button>
          <button
            className={`tab ${activeTab === 'group' ? 'active' : ''}`}
            onClick={() => handleTabChange('group')}
            type="button"
          >
            Группированный метод
          </button>
        </div>

        {activeTab === 'single' && (
          <div className="fixtures-section">
            <div className="form-group">
              <label>Выберите готовый метод</label>
              <div className="fixtures-controls">
                {isLoadingFixtures ? (
                  <div className="loading-text">Загрузка методов...</div>
                ) : (
                  <select
                    value={selectedFixture}
                    onChange={e => {
                      setSelectedFixture(e.target.value);
                      if (e.target.value) {
                        applyFixture(e.target.value);
                      } else {
                        resetFormData();
                      }
                    }}
                    className="fixtures-select"
                  >
                    <option value="">Выберите метод из списка</option>
                    {Object.entries(fixtures)
                      .map(([key, fixture]) => ({
                        key,
                        displayName: fixture.group_name
                          ? `${fixture.group_name} ${fixture.name.charAt(0).toLowerCase()}${fixture.name.slice(1)}`
                          : fixture.name,
                        ndCode: fixture.nd_code,
                      }))
                      .sort((a, b) => a.key.localeCompare(b.key))
                      .map(({ key, displayName, ndCode }) => (
                        <option key={key} value={key}>
                          {displayName} ({ndCode})
                        </option>
                      ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        )}

        <div
          className={`modal-content-wrapper ${activeTab === 'group' ? 'group-content' : 'single-content'}`}
        >
          <div className={`tab-content ${isAnimating ? 'entering' : ''}`}>
            {activeTab === 'group' ? (
              <>
                <div className="form-group">
                  <label>Название группы</label>
                  <input
                    type="text"
                    value={groupData.name}
                    onChange={e => setGroupData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Введите название группы"
                  />
                </div>

                <div className="form-group">
                  <label>Выберите методы для группы</label>
                  {isLoadingMethods ? (
                    <div>Загрузка методов...</div>
                  ) : (
                    <div className="methods-list">
                      {availableMethods.individual_methods.map(method => (
                        <label key={method.id} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={groupData.selectedMethods.includes(method.id)}
                            onChange={e => {
                              const newSelectedMethods = e.target.checked
                                ? [...groupData.selectedMethods, method.id]
                                : groupData.selectedMethods.filter(id => id !== method.id);
                              handleGroupDataChange('selectedMethods', newSelectedMethods);
                            }}
                          />
                          <span>{method.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>Название формулы</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Тип пробы</label>
                  <select
                    name="sample_type"
                    value={formData.sample_type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="any">Любой</option>
                    <option value="condensate">Конденсат</option>
                    <option value="oil">Нефть</option>
                  </select>
                </div>

                <div className="form-section">
                  <h3>Входные данные</h3>
                  {formData.input_data.fields.map((field, index) => (
                    <div key={index} className="field-group">
                      <button
                        type="button"
                        className="delete-field-btn"
                        onClick={() => deleteInputField(index)}
                      >
                        ×
                      </button>
                      <div className="form-group">
                        <label>Название переменной</label>
                        <input
                          type="text"
                          value={field.name}
                          onChange={e => handleInputDataChange(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Описание</label>
                        <input
                          type="text"
                          value={field.description}
                          onChange={e =>
                            handleInputDataChange(index, 'description', e.target.value)
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Единица измерения</label>
                        <input
                          type="text"
                          value={field.unit || ''}
                          onChange={e => handleInputDataChange(index, 'unit', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Номер карточки</label>
                        <select
                          value={field.card_index}
                          onChange={e =>
                            handleInputDataChange(index, 'card_index', parseInt(e.target.value))
                          }
                          style={{
                            width: '100%',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            fontSize: '14px',
                          }}
                        >
                          <option value={1}>Карточка 1</option>
                          <option value={2}>Карточка 2</option>
                          <option value={3}>Карточка 3</option>
                          <option value={4}>Карточка 4</option>
                          <option value={5}>Карточка 5</option>
                          <option value={6}>Карточка 6</option>
                          <option value={7}>Карточка 7</option>
                          <option value={8}>Карточка 8</option>
                        </select>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addInputField} className="add-field-btn">
                    + Добавить переменную
                  </button>
                </div>

                <div className="form-section">
                  <h3>Промежуточные вычисления</h3>
                  {formData.intermediate_data.fields.map((field, index) => (
                    <div key={index} className="field-group">
                      <button
                        type="button"
                        className="delete-field-btn"
                        onClick={() => deleteIntermediateField(index)}
                      >
                        ×
                      </button>
                      <div className="form-group">
                        <label>Название переменной</label>
                        <input
                          type="text"
                          value={field.name}
                          onChange={e =>
                            handleIntermediateDataChange(index, 'name', e.target.value)
                          }
                          placeholder="Введите название"
                        />
                      </div>

                      <div className="range-calculation-section">
                        <div className="range-header">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={!!field.range_calculation}
                              onChange={e => {
                                if (e.target.checked) {
                                  handleIntermediateDataChange(index, 'range_calculation', {
                                    ranges: [{ condition: '', formula: '' }],
                                  });
                                  handleIntermediateDataChange(index, 'formula', '');
                                } else {
                                  handleIntermediateDataChange(index, 'range_calculation', null);
                                }
                              }}
                            />
                            <span>Использовать диапазонный расчет</span>
                          </label>
                        </div>

                        {!field.range_calculation && (
                          <div className="form-group">
                            <label>Формула</label>
                            {renderFormulaInput(
                              field.formula,
                              value => handleIntermediateDataChange(index, 'formula', value),
                              'intermediate',
                              index
                            )}
                          </div>
                        )}

                        {field.range_calculation && (
                          <div className="ranges-container">
                            {field.range_calculation.ranges.map((range, rangeIndex) => (
                              <div key={rangeIndex} className="range-item">
                                <button
                                  type="button"
                                  className="delete-range-btn"
                                  onClick={() => deleteIntermediateRange(index, rangeIndex)}
                                >
                                  ×
                                </button>
                                <div className="form-group">
                                  <label>Условие диапазона</label>
                                  <div className="formula-input-container">
                                    <input
                                      type="text"
                                      value={range.condition}
                                      onChange={e =>
                                        handleIntermediateRangeChange(
                                          index,
                                          rangeIndex,
                                          'condition',
                                          e.target.value
                                        )
                                      }
                                      onFocus={() =>
                                        setActiveFormulaField(
                                          `intermediate-${index}-${rangeIndex}-condition`
                                        )
                                      }
                                      onKeyDown={e => {
                                        if (
                                          e.key === 'Backspace' ||
                                          e.key === 'Delete' ||
                                          e.key === 'ArrowLeft' ||
                                          e.key === 'ArrowRight' ||
                                          ((e.ctrlKey || e.metaKey) &&
                                            ['c', 'v', 'a', 'x'].includes(e.key.toLowerCase()))
                                        ) {
                                          return;
                                        }
                                        e.preventDefault();
                                      }}
                                      ref={el => {
                                        if (!formulaRefs.intermediate.current[index]) {
                                          formulaRefs.intermediate.current[index] = {};
                                        }
                                        if (!formulaRefs.intermediate.current[index][rangeIndex]) {
                                          formulaRefs.intermediate.current[index][rangeIndex] = {};
                                        }
                                        formulaRefs.intermediate.current[index][
                                          rangeIndex
                                        ].condition = el;
                                      }}
                                      placeholder="Введите условие"
                                    />
                                    {activeFormulaField ===
                                      `intermediate-${index}-${rangeIndex}-condition` && (
                                      <FormulaKeyboard
                                        onKeyPress={handleFormulaKeyPress}
                                        variables={getAvailableVariables('intermediate', index)}
                                      />
                                    )}
                                  </div>
                                </div>
                                <div className="form-group">
                                  <label>Формула расчета</label>
                                  <div className="formula-input-container">
                                    <input
                                      type="text"
                                      value={range.formula}
                                      onChange={e =>
                                        handleIntermediateRangeChange(
                                          index,
                                          rangeIndex,
                                          'formula',
                                          e.target.value
                                        )
                                      }
                                      onFocus={() =>
                                        setActiveFormulaField(
                                          `intermediate-${index}-${rangeIndex}-formula`
                                        )
                                      }
                                      onKeyDown={e => {
                                        if (
                                          e.key === 'Backspace' ||
                                          e.key === 'Delete' ||
                                          e.key === 'ArrowLeft' ||
                                          e.key === 'ArrowRight' ||
                                          ((e.ctrlKey || e.metaKey) &&
                                            ['c', 'v', 'a', 'x'].includes(e.key.toLowerCase()))
                                        ) {
                                          return;
                                        }
                                        e.preventDefault();
                                      }}
                                      ref={el => {
                                        if (!formulaRefs.intermediate.current[index]) {
                                          formulaRefs.intermediate.current[index] = {};
                                        }
                                        if (!formulaRefs.intermediate.current[index][rangeIndex]) {
                                          formulaRefs.intermediate.current[index][rangeIndex] = {};
                                        }
                                        formulaRefs.intermediate.current[index][
                                          rangeIndex
                                        ].formula = el;
                                      }}
                                      placeholder="Введите формулу расчета"
                                    />
                                    {activeFormulaField ===
                                      `intermediate-${index}-${rangeIndex}-formula` && (
                                      <FormulaKeyboard
                                        onKeyPress={handleFormulaKeyPress}
                                        variables={getAvailableVariables('intermediate', index)}
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addIntermediateRange(index)}
                              className="add-range-btn"
                            >
                              + Добавить диапазон
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label>Описание</label>
                        <input
                          type="text"
                          value={field.description}
                          onChange={e =>
                            handleIntermediateDataChange(index, 'description', e.target.value)
                          }
                          placeholder="Введите описание"
                        />
                      </div>
                      <div className="form-group">
                        <label>Единица измерения</label>
                        <input
                          type="text"
                          value={field.unit || ''}
                          onChange={e =>
                            handleIntermediateDataChange(index, 'unit', e.target.value)
                          }
                          placeholder="Введите единицу измерения"
                        />
                      </div>
                      <div className="form-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={field.use_multiple_rounding || false}
                            onChange={e =>
                              handleIntermediateDataChange(
                                index,
                                'use_multiple_rounding',
                                e.target.checked
                              )
                            }
                          />
                          <span>Округлять до ближайшего кратного</span>
                        </label>
                        {field.use_multiple_rounding && (
                          <div style={{ marginTop: '8px' }}>
                            <input
                              type="number"
                              value={field.multiple_value || ''}
                              onChange={e =>
                                handleIntermediateDataChange(
                                  index,
                                  'multiple_value',
                                  e.target.value
                                )
                              }
                              placeholder="Введите число для округления (например: 10)"
                              min="0"
                              style={{ width: '100%' }}
                            />
                          </div>
                        )}
                      </div>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={field.show_calculation}
                          onChange={e =>
                            handleIntermediateDataChange(
                              index,
                              'show_calculation',
                              e.target.checked
                            )
                          }
                        />
                        <span>Показывать расчет</span>
                      </label>
                    </div>
                  ))}
                  <button type="button" onClick={addIntermediateField} className="add-field-btn">
                    + Добавить промежуточную переменную
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
                  <h3>Условия повторяемости</h3>
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
                        <label>Значение повторяемости</label>
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
                    + Добавить условие повторяемости
                  </button>
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
                        e => handleMeasurementErrorValueChange(e),
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
                            e =>
                              handleMeasurementErrorRangeChange(index, 'formula', e.target.value),
                            'range',
                            index,
                            'Например: a + m < 10'
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
                    <button
                      type="button"
                      onClick={addMeasurementErrorRange}
                      className="add-field-btn"
                    >
                      + Добавить диапазон
                    </button>
                  </div>
                )}

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
                    placeholder="Количество знаков"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AddCalculationModal;
