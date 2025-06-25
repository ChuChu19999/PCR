import React, { useState, useEffect, useRef } from 'react';
import { Input, DatePicker, Select, message, Spin, Table } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import locale from 'antd/es/date-picker/locale/ru_RU';
import Modal from '../ui/Modal';
import SelectionConditionsForm from '../CreateProtocolModal/SelectionConditionsForm';
import './EditProtocolModal.css';

const { Option } = Select;

// Устанавливаем русскую локаль для dayjs
dayjs.locale('ru');

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

// Компонент для отображения результатов расчетов одной пробы
const SampleCalculationsTable = ({ data, sampleNumber }) => {
  const columns = [
    {
      title: 'Метод',
      dataIndex: 'methodName',
      key: 'methodName',
      width: '15%',
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: '6%',
    },
    {
      title: 'Входные данные',
      dataIndex: 'inputData',
      key: 'inputData',
      width: '33%',
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
      width: '5%',
    },
    {
      title: 'Погр.',
      dataIndex: 'measurementError',
      key: 'measurementError',
      width: '5%',
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
              <div key={index} className="equipment-item">
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
      width: '8%',
    },
  ];

  return (
    <div className="sample-calculations">
      <h3 className="sample-title">Проба №{sampleNumber}</h3>
      <Table columns={columns} dataSource={data} pagination={false} scroll={false} />
    </div>
  );
};

const EditProtocolModal = ({ onClose, onSuccess, protocol, laboratoryId, departmentId }) => {
  console.log('Protocol prop:', protocol);

  const [formData, setFormData] = useState({
    test_protocol_number: protocol.test_protocol_number || '',
    test_protocol_date: protocol.test_protocol_date ? dayjs(protocol.test_protocol_date) : null,
    is_accredited: protocol.is_accredited || false,
    laboratory_location: protocol.laboratory_location || '',
    sampling_act_number: protocol.sampling_act_number || '',
    excel_template: protocol.excel_template,
    branch: protocol.branch || '',
    phone: protocol.phone || '',
    selection_conditions: null,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const [branchSearchValue, setBranchSearchValue] = useState('');
  const [branchesDropdownVisible, setBranchesDropdownVisible] = useState(false);

  const branchSearchRef = useRef(null);

  const [activeTab, setActiveTab] = useState('calculations');
  const [isAnimating, setIsAnimating] = useState(false);
  const [calculations, setCalculations] = useState([]);
  const [calculationsLoading, setCalculationsLoading] = useState(false);

  useEffect(() => {
    if (protocol) {
      setFormData({
        ...protocol,
        test_protocol_date: protocol.test_protocol_date ? dayjs(protocol.test_protocol_date) : null,
      });
      setBranchSearchValue(protocol.branch || '');

      // Загружаем шаблоны
      fetchTemplates(laboratoryId, departmentId);
    }
  }, [protocol, laboratoryId, departmentId]);

  const handleInputChange = field => e => {
    const value = e?.target ? e.target.value : e;

    if (field === 'test_protocol_date') {
      setFormData(prev => ({
        ...prev,
        [field]: value ? dayjs(value) : null,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Преобразуем массив условий отбора в объект
      const selectionConditionsObject = Array.isArray(formData.selection_conditions)
        ? formData.selection_conditions.reduce((acc, condition) => {
            acc[condition.name] = condition.value;
            return acc;
          }, {})
        : {};

      const protocolData = {
        test_protocol_number: formData.test_protocol_number,
        test_protocol_date: formData.test_protocol_date
          ? dayjs(formData.test_protocol_date).format('YYYY-MM-DD')
          : null,
        laboratory_location: formData.laboratory_location,
        sampling_act_number: formData.sampling_act_number,
        excel_template: formData.excel_template,
        laboratory: laboratoryId,
        department: departmentId,
        branch: formData.branch,
        phone: formData.phone || '',
        selection_conditions: selectionConditionsObject,
        is_accredited: formData.is_accredited,
      };

      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/protocols/${protocol.id}/`,
        protocolData
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
        // Добавляем поле value к каждому условию
        const conditionsWithValues = selectedTemplate.selection_conditions.map(condition => ({
          ...condition,
          value: null,
        }));
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
      const template = templates.find(t => t.id === protocol.excel_template);
      console.log('Found template:', template);
      console.log('Protocol selection conditions:', protocol.selection_conditions);

      if (template && template.selection_conditions) {
        // Преобразуем объект условий отбора в массив
        const conditionsArray = template.selection_conditions.map(condition => ({
          ...condition,
          value: protocol.selection_conditions?.[condition.name] || null,
        }));

        console.log('Setting initial selection conditions:', conditionsArray);
        setFormData(prev => ({
          ...prev,
          selection_conditions: conditionsArray,
        }));
      }
    }
  }, [protocol, templates]);

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

  const fetchCalculations = async protocolId => {
    try {
      setCalculationsLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/protocols/${protocolId}/calculations/`
      );

      const formattedCalculations = response.data.map(calc => {
        let methodName = calc.research_method.name;
        if (calc.research_method.is_group_member && calc.research_method.groups?.length > 0) {
          const groupName = calc.research_method.groups[0].name;
          const methodNameLower = methodName.charAt(0).toLowerCase() + methodName.slice(1);
          methodName = `${groupName} ${methodNameLower}`;
        }

        let formattedResult = calc.result;
        if (
          formattedResult &&
          !isNaN(formattedResult.replace(',', '.')) &&
          formattedResult.match(/^-?\d*[.,]?\d*$/)
        ) {
          const numValue = parseFloat(formattedResult.replace(',', '.'));
          if (numValue < 0) {
            formattedResult = `минус ${Math.abs(numValue).toString().replace('.', ',')}`;
          } else {
            formattedResult = formattedResult.toString().replace('.', ',');
          }
        }

        return {
          key: calc.key,
          methodName,
          unit: calc.unit,
          inputData: formatInputData(calc.input_data),
          result: formattedResult,
          measurementError: formatMeasurementError(calc.measurement_error),
          equipment: calc.equipment,
          executor: calc.executor,
          sampleNumber: calc.sample.registration_number,
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

  useEffect(() => {
    if (protocol?.id) {
      fetchCalculations(protocol.id);
    }
  }, [protocol?.id]);

  const formatInputData = inputData => {
    return Object.entries(inputData)
      .map(([key, value]) => {
        let formattedValue = value;
        if (!isNaN(value)) {
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

  // Группировка результатов по пробам
  const groupedCalculations = React.useMemo(() => {
    if (!calculations || calculations.length === 0) return {};

    return calculations.reduce((acc, calc) => {
      const sampleNumber = calc.sampleNumber;
      if (!acc[sampleNumber]) {
        acc[sampleNumber] = [];
      }
      // Создаем новый объект без поля sampleNumber
      const { sampleNumber: _, ...calcWithoutSample } = calc;
      acc[sampleNumber].push(calcWithoutSample);
      return acc;
    }, {});
  }, [calculations]);

  const calculationColumns = [
    {
      title: 'Номер пробы',
      dataIndex: 'sampleNumber',
      key: 'sampleNumber',
      width: '8%',
    },
    {
      title: 'Метод',
      dataIndex: 'methodName',
      key: 'methodName',
      width: '15%',
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: '6%',
    },
    {
      title: 'Входные данные',
      dataIndex: 'inputData',
      key: 'inputData',
      width: '33%',
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
      width: '5%',
    },
    {
      title: 'Погр.',
      dataIndex: 'measurementError',
      key: 'measurementError',
      width: '5%',
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
              <div key={index} className="equipment-item">
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
      width: '8%',
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

  const fetchTemplates = async (laboratoryId, departmentId = null) => {
    try {
      setTemplatesLoading(true);
      const params = { laboratory: laboratoryId };
      if (departmentId) {
        params.department = departmentId;
      }
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/excel-templates/by-laboratory/`,
        {
          params,
        }
      );
      setTemplates(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке шаблонов:', error);
      message.error('Не удалось загрузить список шаблонов');
    } finally {
      setTemplatesLoading(false);
    }
  };

  return (
    <Modal
      header="Редактирование протокола"
      onClose={onClose}
      onSave={handleSave}
      loading={loading}
      onGenerate={handleGenerateProtocol}
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
            <div className="calculations-container">
              {calculationsLoading ? (
                <div className="loading-state">
                  <Spin size="large" />
                  <p>Загрузка результатов...</p>
                </div>
              ) : Object.entries(groupedCalculations).length === 0 ? (
                <div className="no-data-message">Нет данных для отображения</div>
              ) : (
                Object.entries(groupedCalculations).map(([sampleNumber, sampleData]) => (
                  <SampleCalculationsTable
                    key={sampleNumber}
                    sampleNumber={sampleNumber}
                    data={sampleData}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="edit-protocol-form">
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
                  format="DD.MM.YYYY"
                  value={formData.test_protocol_date ? dayjs(formData.test_protocol_date) : null}
                  onChange={value => handleInputChange('test_protocol_date')(value)}
                  placeholder="ДД.ММ.ГГГГ"
                  style={{ width: '100%' }}
                  status={errors.test_protocol_date ? 'error' : ''}
                  locale={locale}
                  className="custom-date-picker"
                  rootClassName="custom-date-picker-root"
                  popupClassName="custom-date-picker-popup"
                  inputReadOnly={false}
                  allowClear={true}
                  superNextIcon={null}
                  superPrevIcon={null}
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
                <label>Шаблон протокола</label>
                <Select
                  value={formData.excel_template}
                  onChange={handleTemplateChange}
                  placeholder="Выберите шаблон протокола"
                  loading={templatesLoading}
                  status={errors.excel_template ? 'error' : ''}
                  style={{ width: '100%' }}
                >
                  {templates.map(template => (
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
                  ))}
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
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default EditProtocolModal;
