import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, DatePicker, Select, message, Checkbox, Table, Button, Spin } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import locale from 'antd/es/date-picker/locale/ru_RU';
import Modal from '../ui/Modal';
import SelectionConditionsForm from '../CreateProtocolModal/SelectionConditionsForm';
import './EditProtocolModal.css';

const { Option } = Select;

// Функция для форматирования ввода даты
const formatDateInput = value => {
  // Убираем все нецифровые символы
  const numbers = value.replace(/\D/g, '');

  // Ограничиваем длину до 8 цифр
  const limitedNumbers = numbers.slice(0, 8);

  // Форматируем в ДД.ММ.ГГГГ
  if (limitedNumbers.length <= 2) return limitedNumbers;
  if (limitedNumbers.length <= 4) return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2)}`;
  return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 4)}.${limitedNumbers.slice(4)}`;
};

// Функция для валидации даты
const isValidDate = dateString => {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) return false;

  const [day, month, year] = dateString.split('.').map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getDate() === day &&
    date.getMonth() === month - 1 &&
    date.getFullYear() === year &&
    year >= 1900 &&
    year <= 2100
  );
};

const EditProtocolModal = ({ isOpen, onClose, onSuccess, protocol }) => {
  const [activeTab, setActiveTab] = useState('calculations');
  const [isAnimating, setIsAnimating] = useState(false);
  const [formData, setFormData] = useState({
    test_protocol_number: '',
    test_protocol_date: null,
    is_accredited: false,
    test_object: '',
    laboratory_location: '',
    sampling_act_number: '',
    registration_number: '',
    sampling_date: null,
    receiving_date: null,
    excel_template: undefined,
    branch: '',
    sampling_location_detail: '',
    phone: '',
    laboratory: '',
    selection_conditions: null,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [templates, setTemplates] = useState([]);
  const [branches, setBranches] = useState([]);
  const [samplingLocations, setSamplingLocations] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [showCalculations, setShowCalculations] = useState(false);
  const [calculations, setCalculations] = useState([]);
  const [calculationsLoading, setCalculationsLoading] = useState(false);
  const [availableMethodsLoading, setAvailableMethodsLoading] = useState(false);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [branchSearchValue, setBranchSearchValue] = useState('');
  const [locationSearchValue, setLocationSearchValue] = useState('');
  const [branchesDropdownVisible, setBranchesDropdownVisible] = useState(false);
  const [locationsDropdownVisible, setLocationsDropdownVisible] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);

  const branchSearchRef = useRef(null);
  const locationSearchRef = useRef(null);

  useEffect(() => {
    fetchTemplates();
    if (protocol) {
      setFormData({
        ...protocol,
        sampling_date: protocol.sampling_date ? dayjs(protocol.sampling_date) : null,
        receiving_date: protocol.receiving_date ? dayjs(protocol.receiving_date) : null,
        test_protocol_date: protocol.test_protocol_date ? dayjs(protocol.test_protocol_date) : null,
      });
      setBranchSearchValue(protocol.branch || '');
      setLocationSearchValue(protocol.sampling_location_detail || '');
      fetchCalculations(protocol.id);
    }
  }, [protocol]);

  // useEffect для синхронизации значения шаблона
  useEffect(() => {
    if (templates.length > 0 && protocol?.excel_template) {
      const template = templates.find(t => t.id === protocol.excel_template);
      if (template) {
        setFormData(prev => ({
          ...prev,
          excel_template: template.id,
        }));
      }
    }
  }, [templates, protocol]);

  // useEffect для обработки условий отбора
  useEffect(() => {
    if (protocol && templates.length > 0) {
      const initialSelectionConditions = protocol.selection_conditions || [];
      const templateSelectionConditions =
        templates.find(t => t.id === protocol.excel_template)?.selection_conditions || [];

      // Объединяем условия из шаблона со значениями из протокола
      const mergedConditions = templateSelectionConditions.map(templateCondition => {
        const existingCondition = initialSelectionConditions.find(
          c => c.name === templateCondition.name
        );
        return {
          ...templateCondition,
          value: existingCondition ? existingCondition.value : null,
        };
      });

      setFormData(prev => ({
        ...prev,
        selection_conditions: mergedConditions,
      }));
    }
  }, [protocol, templates]);

  useEffect(() => {
    const handleClickOutside = event => {
      if (branchSearchRef.current && !branchSearchRef.current.contains(event.target)) {
        setBranchesDropdownVisible(false);
      }
      if (locationSearchRef.current && !locationSearchRef.current.contains(event.target)) {
        setLocationsDropdownVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/excel-templates/`);
      const allTemplates = response.data;

      // Фильтруем шаблоны по лаборатории и подразделению протокола
      const filteredTemplates = allTemplates.filter(template => {
        const matchesLaboratory = template.laboratory === protocol.laboratory;
        if (protocol.department) {
          return matchesLaboratory && template.department === protocol.department;
        }
        return matchesLaboratory && !template.department;
      });

      // Сортируем шаблоны по имени и версии
      const sortedTemplates = filteredTemplates.sort((a, b) => {
        if (a.name !== b.name) {
          return a.name.localeCompare(b.name);
        }
        // Извлекаем номер версии и сравниваем как числа
        const versionA = parseInt(a.version.replace('v', ''));
        const versionB = parseInt(b.version.replace('v', ''));
        return versionB - versionA; // Сортировка по убыванию версии
      });

      setTemplates(sortedTemplates);
    } catch (error) {
      console.error('Ошибка при загрузке шаблонов:', error);
      message.error('Не удалось загрузить список шаблонов');
    }
  };

  const handleInputChange = field => e => {
    const value = e?.target ? e.target.value : e;
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleProtocolDetailsChange = field => value => {
    if (field === 'branch') {
      setFormData(prev => ({
        ...prev,
        branch: value,
        sampling_location_detail: '',
        phone: '',
      }));
    } else if (field === 'sampling_location_detail') {
      const selectedLocation = samplingLocations.find(
        loc => loc.sampling_location_detail === value
      );
      if (selectedLocation) {
        setFormData(prev => ({
          ...prev,
          sampling_location_detail: value,
          phone: selectedLocation.phone || '',
        }));
      }
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const updateData = {
        test_protocol_number: formData.test_protocol_number || '',
        test_protocol_date: formData.test_protocol_date?.format('YYYY-MM-DD') || null,
        is_accredited: formData.is_accredited || false,
        test_object: formData.test_object || '',
        laboratory_location: formData.laboratory_location || '',
        sampling_date: formData.sampling_date?.format('YYYY-MM-DD') || null,
        receiving_date: formData.receiving_date?.format('YYYY-MM-DD') || null,
        excel_template: formData.excel_template,
        selection_conditions: formData.selection_conditions || [],
        branch: formData.branch || '',
        sampling_location_detail: formData.sampling_location_detail || '',
        phone: formData.phone || '',
      };

      // Удаляем undefined и null значения из объекта
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || updateData[key] === null) {
          delete updateData[key];
        }
      });

      console.log('Отправляемые данные:', updateData);

      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/protocols/${protocol.id}/`,
        updateData
      );

      message.success('Протокол успешно обновлен');
      onSuccess();
    } catch (error) {
      console.error('Ошибка при обновлении протокола:', error);
      if (error.response?.data?.error) {
        message.error(error.response.data.error);
      } else if (error.response?.data) {
        const serverErrors = error.response.data;
        const newErrors = {};

        // Обрабатываем ошибки для каждого поля
        Object.keys(serverErrors).forEach(field => {
          if (Array.isArray(serverErrors[field])) {
            newErrors[field] = serverErrors[field][0];
          } else {
            newErrors[field] = serverErrors[field];
          }
        });

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
          message.error('Ошибка валидации данных');
        }
      } else {
        message.error('Произошла ошибка при обновлении протокола');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatInputData = inputData => {
    return Object.entries(inputData)
      .map(([key, value]) => {
        // Форматируем числовое значение
        let formattedValue = value;
        if (!isNaN(value)) {
          // Если это отрицательное число
          if (parseFloat(value) < 0) {
            formattedValue = value.toString().replace('-', '-').replace('.', ',');
          } else {
            formattedValue = value.toString().replace('.', ',');
          }
        }
        return `${key} = ${formattedValue}`;
      })
      .join('\n');
  };

  const formatMeasurementError = error => {
    if (!error || error === '-') return '-';
    return `±${error.toString().replace('.', ',')}`;
  };

  const fetchCalculations = async protocolId => {
    try {
      setCalculationsLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/calculations/`, {
        params: {
          protocol: protocolId,
          is_deleted: false,
        },
      });

      const formattedCalculations = response.data.map(calc => {
        // Форматируем название метода с учетом группы
        let methodName = calc.research_method.name;
        if (calc.research_method.is_group_member && calc.research_method.groups?.length > 0) {
          const groupName = calc.research_method.groups[0].name;
          const methodNameLower = methodName.charAt(0).toLowerCase() + methodName.slice(1);
          methodName = `${groupName} ${methodNameLower}`;
        }

        // Форматируем отрицательные значения в результате
        let formattedResult = calc.result;
        if (formattedResult && !isNaN(formattedResult)) {
          const numValue = parseFloat(formattedResult);
          if (numValue < 0) {
            formattedResult = `минус ${Math.abs(numValue).toString().replace('.', ',')}`;
          } else {
            formattedResult = formattedResult.toString().replace('.', ',');
          }
        }

        return {
          key: calc.id,
          methodName,
          unit: calc.unit || '-',
          inputData: formatInputData(calc.input_data),
          result: formattedResult,
          measurementError: formatMeasurementError(calc.measurement_error),
          equipment: calc.equipment || [],
          executor: calc.executor || '-',
        };
      });

      setCalculations(formattedCalculations);
    } catch (error) {
      console.error('Ошибка при загрузке результатов расчетов:', error);
      message.error('Не удалось загрузить результаты расчетов');
    } finally {
      setCalculationsLoading(false);
    }
  };

  const handleAddCalculation = async () => {
    try {
      setAvailableMethodsLoading(true);
      // Сначала получаем страницу исследований для данного протокола
      const researchPageResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/research-pages/`,
        {
          params: {
            laboratory_id: protocol.laboratory,
            department_id: protocol.department || null,
            type: 'oil_products',
          },
        }
      );

      const researchPage = researchPageResponse.data.find(page => page.type === 'oil_products');
      if (!researchPage) {
        throw new Error('Страница исследований не найдена');
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/research-methods/available-methods/`,
        {
          params: {
            protocol_id: protocol.id,
            research_page_id: researchPage.id,
          },
        }
      );

      // Сохраняем методы в sessionStorage перед редиректом
      sessionStorage.setItem('available_methods', JSON.stringify(response.data));

      // Выполняем редирект на страницу методов исследования
      navigate(
        `/research-method?protocol_id=${protocol.id}&laboratory=${protocol.laboratory}${protocol.department ? `&department=${protocol.department}` : ''}`
      );

      onClose();
    } catch (error) {
      console.error('Ошибка при загрузке доступных методов:', error);
      message.error('Не удалось загрузить список доступных методов');
    } finally {
      setAvailableMethodsLoading(false);
    }
  };

  const calculationColumns = [
    {
      title: 'Метод',
      dataIndex: 'methodName',
      key: 'methodName',
      width: '15%',
    },
    {
      title: 'Ед. измерения',
      dataIndex: 'unit',
      key: 'unit',
      width: '8%',
    },
    {
      title: 'Входные данные',
      dataIndex: 'inputData',
      key: 'inputData',
      width: '20%',
      render: inputData => {
        if (!inputData || Object.keys(inputData).length === 0) return '-';
        return (
          <div
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: '1.5',
            }}
          >
            {inputData}
          </div>
        );
      },
    },
    {
      title: 'Результат',
      dataIndex: 'result',
      key: 'result',
      width: '12%',
    },
    {
      title: 'Погрешность',
      dataIndex: 'measurementError',
      key: 'measurementError',
      width: '12%',
    },
    {
      title: 'Приборы',
      dataIndex: 'equipment',
      key: 'equipment',
      width: '20%',
      render: equipment => {
        if (!equipment || equipment.length === 0) return '-';
        return (
          <div>
            {equipment.map((eq, index) => (
              <div key={eq.id} className="equipment-item">
                <span className="equipment-name">{eq.name}</span>
                <span className="equipment-serial"> (Зав.№{eq.serial_number})</span>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      title: 'Исполнитель',
      dataIndex: 'executor',
      key: 'executor',
      width: '13%',
    },
  ];

  const handleTabChange = tab => {
    if (tab !== activeTab) {
      setIsAnimating(true);
      setTimeout(() => {
        setActiveTab(tab);
        setTimeout(() => {
          setIsAnimating(false);
        }, 50);
      }, 300);
    }
  };

  const handleGenerateProtocol = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/generate-protocol-excel/?protocol_id=${protocol.id}`,
        { responseType: 'blob' }
      );

      // Создаем ссылку для скачивания файла
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Формируем имя файла на основе данных протокола
      let filename;
      if (formData.is_accredited && formData.test_protocol_date) {
        const date = dayjs(formData.test_protocol_date).format('DD.MM.YYYY');
        filename = `Протокол_${formData.test_protocol_number}_от_${date}.xlsx`;
      } else {
        filename = `Протокол_${formData.test_protocol_number}.xlsx`;
      }

      // Очищаем имя файла от недопустимых символов
      filename = filename.replace(/[^\wа-яА-Я\s\.\-_]/g, '');

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success('Протокол успешно сформирован');
      setIsConfirmModalVisible(false);
    } catch (error) {
      console.error('Ошибка при формировании протокола:', error);
      setError('Произошла ошибка при формировании протокола');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTemplateChange = async value => {
    try {
      const selectedTemplate = templates.find(t => t.id === value);
      if (selectedTemplate && selectedTemplate.selection_conditions) {
        // Если у протокола уже есть условия отбора, сохраняем их значения
        const existingConditions = formData.selection_conditions || [];
        const conditionsWithValues = selectedTemplate.selection_conditions.map(condition => {
          const existingCondition = existingConditions.find(ec => ec.name === condition.name);
          return {
            ...condition,
            value: existingCondition ? existingCondition.value : null,
          };
        });
        setFormData(prev => ({
          ...prev,
          excel_template: value,
          selection_conditions: conditionsWithValues,
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          excel_template: value,
          selection_conditions: null,
        }));
      }
    } catch (error) {
      console.error('Ошибка при получении условий отбора:', error);
      message.error('Не удалось загрузить условия отбора');
    }
  };

  const handleSelectionConditionsChange = conditions => {
    setFormData(prev => ({
      ...prev,
      selection_conditions: conditions,
    }));
  };

  const searchBranches = async searchText => {
    if (!searchText || searchText.length < 2) {
      setBranches([]);
      setBranchesDropdownVisible(false);
      return;
    }

    try {
      setBranchesLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/get-branches/?search=${searchText}`
      );
      setBranches(response.data);
      setBranchesDropdownVisible(true);
    } catch (error) {
      console.error('Ошибка при поиске филиалов:', error);
      message.error('Не удалось загрузить список филиалов');
    } finally {
      setBranchesLoading(false);
    }
  };

  const searchLocations = async searchText => {
    if (!searchText || searchText.length < 2) {
      setSamplingLocations([]);
      setLocationsDropdownVisible(false);
      return;
    }

    try {
      setLocationsLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/get-sampling-locations/?search=${searchText}`
      );
      setSamplingLocations(response.data);
      setLocationsDropdownVisible(true);
    } catch (error) {
      console.error('Ошибка при поиске мест отбора:', error);
      message.error('Не удалось загрузить список мест отбора');
    } finally {
      setLocationsLoading(false);
    }
  };

  return (
    <Modal
      header="Детали протокола"
      onClose={onClose}
      onSave={activeTab === 'edit' ? handleSave : null}
      loading={loading}
      onGenerate={() => setIsConfirmModalVisible(true)}
      generateLoading={isGenerating}
      style={{ width: activeTab === 'calculations' ? '900px' : '600px' }}
    >
      <div className="edit-protocol-form">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'calculations' ? 'active' : ''}`}
            onClick={() => handleTabChange('calculations')}
            type="button"
          >
            Результаты расчетов
          </button>
          <button
            className={`tab ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => handleTabChange('edit')}
            type="button"
          >
            Редактирование
          </button>
        </div>

        <div className={`tab-content ${isAnimating ? 'entering' : ''}`}>
          {activeTab === 'calculations' ? (
            <div className="calculations-table">
              <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
                <Button
                  type="primary"
                  onClick={handleAddCalculation}
                  loading={availableMethodsLoading}
                >
                  Добавить расчет
                </Button>
              </div>
              <Table
                columns={calculationColumns}
                dataSource={calculations}
                loading={calculationsLoading}
                pagination={false}
                scroll={false}
              />
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Номер протокола испытаний</label>
                <Input
                  value={formData.test_protocol_number}
                  onChange={handleInputChange('test_protocol_number')}
                  placeholder="Введите номер протокола испытаний"
                  status={errors.test_protocol_number ? 'error' : ''}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label>Дата протокола испытаний</label>
                <DatePicker
                  locale={locale}
                  format="DD.MM.YYYY"
                  value={formData.test_protocol_date ? dayjs(formData.test_protocol_date) : null}
                  onChange={handleInputChange('test_protocol_date')}
                  placeholder="ДД.ММ.ГГГГ"
                  style={{ width: '100%' }}
                  status={errors.test_protocol_date ? 'error' : ''}
                  className="custom-date-picker"
                  rootClassName="custom-date-picker-root"
                  popupClassName="custom-date-picker-popup"
                  inputReadOnly={false}
                  showToday={false}
                  allowClear={true}
                  superNextIcon={null}
                  superPrevIcon={null}
                  onKeyDown={e => {
                    // Разрешаем цифры, точки, backspace и delete
                    if (!/[\d\.]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete') {
                      e.preventDefault();
                    }
                  }}
                  onInput={e => {
                    const input = e.target;
                    const cursorPosition = input.selectionStart;
                    const formatted = formatDateInput(input.value);

                    const dotsBeforeCursor = (
                      input.value.slice(0, cursorPosition).match(/\./g) || []
                    ).length;
                    input.value = formatted;
                    const newDotsBeforeCursor = (
                      formatted.slice(0, cursorPosition).match(/\./g) || []
                    ).length;
                    const newPosition = cursorPosition + (newDotsBeforeCursor - dotsBeforeCursor);
                    input.setSelectionRange(newPosition, newPosition);

                    if (formatted.length === 10 && isValidDate(formatted)) {
                      handleInputChange('test_protocol_date')(dayjs(formatted, 'DD.MM.YYYY'));
                    }
                  }}
                />
                {errors.test_protocol_date && (
                  <div className="error-message">{errors.test_protocol_date}</div>
                )}
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_accredited}
                    onChange={e => handleInputChange('is_accredited')(e.target.checked)}
                  />
                  <span>Аккредитован</span>
                </label>
              </div>

              <div className="form-group">
                <label>Номер акта отбора</label>
                <Input
                  value={formData.sampling_act_number}
                  placeholder="Введите номер акта отбора"
                  disabled
                  style={{ width: '100%', background: '#f5f5f5' }}
                />
              </div>

              <div className="form-group">
                <label>Регистрационный номер</label>
                <Input
                  value={formData.registration_number}
                  placeholder="Введите регистрационный номер"
                  disabled
                  style={{ width: '100%', background: '#f5f5f5' }}
                />
              </div>

              <div className="form-group">
                <label>Филиал</label>
                <div className="search-container" ref={branchSearchRef}>
                  <Input
                    value={branchSearchValue}
                    onChange={e => {
                      const value = e.target.value;
                      setBranchSearchValue(value);
                      setFormData(prev => ({ ...prev, branch: value }));
                      searchBranches(value);
                    }}
                    onFocus={() => {
                      if (branchSearchValue && branchSearchValue.length >= 2) {
                        setBranchesDropdownVisible(true);
                      }
                    }}
                    placeholder="Введите название филиала"
                    style={{ width: '100%' }}
                  />
                  {branchesDropdownVisible && branches.length > 0 && (
                    <div className="search-dropdown">
                      {branchesLoading ? (
                        <div className="search-loading">
                          <Spin size="small" />
                        </div>
                      ) : (
                        branches.map((branch, index) => (
                          <div
                            key={index}
                            className="search-option"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, branch }));
                              setBranchSearchValue(branch);
                              setBranchesDropdownVisible(false);
                            }}
                          >
                            {branch}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Место отбора пробы</label>
                <div className="search-container" ref={locationSearchRef}>
                  <Input
                    value={locationSearchValue}
                    onChange={e => {
                      const value = e.target.value;
                      setLocationSearchValue(value);
                      setFormData(prev => ({ ...prev, sampling_location_detail: value }));
                      searchLocations(value);
                    }}
                    onFocus={() => {
                      if (locationSearchValue && locationSearchValue.length >= 2) {
                        setLocationsDropdownVisible(true);
                      }
                    }}
                    placeholder="Введите место отбора пробы"
                    style={{ width: '100%' }}
                  />
                  {locationsDropdownVisible && samplingLocations.length > 0 && (
                    <div className="search-dropdown">
                      {locationsLoading ? (
                        <div className="search-loading">
                          <Spin size="small" />
                        </div>
                      ) : (
                        samplingLocations.map((location, index) => (
                          <div
                            key={index}
                            className="search-option"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                sampling_location_detail: location,
                              }));
                              setLocationSearchValue(location);
                              setLocationsDropdownVisible(false);
                            }}
                          >
                            {location}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Телефон</label>
                <Input
                  value={formData.phone}
                  onChange={handleInputChange('phone')}
                  placeholder="Введите контактный телефон"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label>Место осуществления лабораторной деятельности</label>
                <Input
                  value={formData.laboratory_location}
                  onChange={handleInputChange('laboratory_location')}
                  placeholder="Введите место осуществления лабораторной деятельности"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label>
                  Объект испытаний <span className="required">*</span>
                </label>
                <Select
                  value={formData.test_object}
                  onChange={value => handleInputChange('test_object')(value)}
                  placeholder="Выберите объект испытаний"
                  status={errors.test_object ? 'error' : ''}
                  style={{ width: '100%' }}
                >
                  <Option value="дегазированный конденсат">дегазированный конденсат</Option>
                  <Option value="нефть">нефть</Option>
                </Select>
                {errors.test_object && <div className="error-message">{errors.test_object}</div>}
              </div>

              <div className="form-group">
                <label>Дата отбора пробы</label>
                <DatePicker
                  locale={locale}
                  format="DD.MM.YYYY"
                  value={formData.sampling_date}
                  onChange={handleInputChange('sampling_date')}
                  placeholder="ДД.ММ.ГГГГ"
                  style={{ width: '100%' }}
                  status={errors.sampling_date ? 'error' : ''}
                  className="custom-date-picker"
                  rootClassName="custom-date-picker-root"
                  popupClassName="custom-date-picker-popup"
                  inputReadOnly={false}
                  showToday={false}
                  allowClear={true}
                  superNextIcon={null}
                  superPrevIcon={null}
                  onKeyDown={e => {
                    // Разрешаем цифры, точки, backspace и delete
                    if (!/[\d\.]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete') {
                      e.preventDefault();
                    }
                  }}
                  onInput={e => {
                    const input = e.target;
                    const cursorPosition = input.selectionStart;
                    const formatted = formatDateInput(input.value);

                    const dotsBeforeCursor = (
                      input.value.slice(0, cursorPosition).match(/\./g) || []
                    ).length;
                    input.value = formatted;
                    const newDotsBeforeCursor = (
                      formatted.slice(0, cursorPosition).match(/\./g) || []
                    ).length;
                    const newPosition = cursorPosition + (newDotsBeforeCursor - dotsBeforeCursor);
                    input.setSelectionRange(newPosition, newPosition);

                    if (formatted.length === 10 && isValidDate(formatted)) {
                      handleInputChange('sampling_date')(dayjs(formatted, 'DD.MM.YYYY'));
                    }
                  }}
                />
                {errors.sampling_date && (
                  <div className="error-message">{errors.sampling_date}</div>
                )}
              </div>

              <div className="form-group">
                <label>Дата получения пробы</label>
                <DatePicker
                  locale={locale}
                  format="DD.MM.YYYY"
                  value={formData.receiving_date}
                  onChange={handleInputChange('receiving_date')}
                  placeholder="ДД.ММ.ГГГГ"
                  style={{ width: '100%' }}
                  status={errors.receiving_date ? 'error' : ''}
                  className="custom-date-picker"
                  rootClassName="custom-date-picker-root"
                  popupClassName="custom-date-picker-popup"
                  inputReadOnly={false}
                  showToday={false}
                  allowClear={true}
                  superNextIcon={null}
                  superPrevIcon={null}
                  onKeyDown={e => {
                    // Разрешаем цифры, точки, backspace и delete
                    if (!/[\d\.]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete') {
                      e.preventDefault();
                    }
                  }}
                  onInput={e => {
                    const input = e.target;
                    const cursorPosition = input.selectionStart;
                    const formatted = formatDateInput(input.value);

                    const dotsBeforeCursor = (
                      input.value.slice(0, cursorPosition).match(/\./g) || []
                    ).length;
                    input.value = formatted;
                    const newDotsBeforeCursor = (
                      formatted.slice(0, cursorPosition).match(/\./g) || []
                    ).length;
                    const newPosition = cursorPosition + (newDotsBeforeCursor - dotsBeforeCursor);
                    input.setSelectionRange(newPosition, newPosition);

                    if (formatted.length === 10 && isValidDate(formatted)) {
                      handleInputChange('receiving_date')(dayjs(formatted, 'DD.MM.YYYY'));
                    }
                  }}
                />
                {errors.receiving_date && (
                  <div className="error-message">{errors.receiving_date}</div>
                )}
              </div>

              <div className="form-group">
                <label>Шаблон протокола</label>
                <Select
                  value={formData.excel_template}
                  onChange={handleTemplateChange}
                  placeholder="Выберите шаблон протокола"
                  status={errors.excel_template ? 'error' : ''}
                  style={{ width: '100%' }}
                  loading={templates.length === 0}
                >
                  {templates.length > 0
                    ? templates.map(template => (
                        <Option
                          key={template.id}
                          value={template.id}
                          style={{
                            color: template.is_active ? 'inherit' : '#999',
                            fontStyle: template.is_active ? 'normal' : 'italic',
                          }}
                        >
                          {template.name} - {template.version}
                          {!template.is_active && ' (архивная версия)'}
                        </Option>
                      ))
                    : null}
                </Select>
                {errors.excel_template && (
                  <div className="error-message">{errors.excel_template}</div>
                )}
              </div>

              {formData.excel_template && (
                <SelectionConditionsForm
                  conditions={formData.selection_conditions}
                  onChange={handleSelectionConditionsChange}
                />
              )}
            </>
          )}
        </div>
      </div>

      {isConfirmModalVisible && (
        <Modal
          header="Подтверждение формирования"
          onClose={() => setIsConfirmModalVisible(false)}
          onSave={handleGenerateProtocol}
          style={{ width: '500px', margin: '0 auto', left: '50%' }}
          loading={isGenerating}
        >
          <div className="save-protocol-calculation-form">
            <p className="confirmation-message">
              Вы уверены, что хотите сформировать протокол № {formData.test_protocol_number}?
            </p>
            {error && <p className="error-message">{error}</p>}
          </div>
        </Modal>
      )}
    </Modal>
  );
};

export default EditProtocolModal;
