import React, { useState, useEffect, useRef } from 'react';
import { Input, Select, message, Table, Button, Spin, DatePicker } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Modal from '../ui/Modal';
import './EditSampleModal.css';
import dayjs from 'dayjs';

const { Option } = Select;

const EditSampleModal = ({ onClose, onSuccess, sample }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('calculations');
  const [isAnimating, setIsAnimating] = useState(false);
  const [formData, setFormData] = useState({
    registration_number: sample.registration_number || '',
    test_object: sample.test_object || '',
    protocol: sample.protocol || null,
    laboratory: sample.laboratory || null,
    department: sample.department || null,
    sampling_location_detail: sample.sampling_location_detail || '',
    sampling_date: sample.sampling_date || null,
    receiving_date: sample.receiving_date || null,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [laboratories, setLaboratories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [protocols, setProtocols] = useState([]);
  const [laboratoriesLoading, setLaboratoriesLoading] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [protocolsLoading, setProtocolsLoading] = useState(false);
  const [calculations, setCalculations] = useState([]);
  const [calculationsLoading, setCalculationsLoading] = useState(false);
  const [availableMethodsLoading, setAvailableMethodsLoading] = useState(false);
  const [protocolSearchValue, setProtocolSearchValue] = useState(sample.test_protocol_number);
  const [protocolsDropdownVisible, setProtocolsDropdownVisible] = useState(false);
  const protocolSearchRef = useRef(null);
  const [locationSearchValue, setLocationSearchValue] = useState(
    sample.sampling_location_detail || ''
  );
  const [locationsDropdownVisible, setLocationsDropdownVisible] = useState(false);
  const locationSearchRef = useRef(null);
  const [samplingLocations, setSamplingLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locale, setLocale] = useState('ru');

  useEffect(() => {
    fetchLaboratories();
    if (sample.id) {
      fetchCalculations(sample.id);
    }
    if (sample.protocol) {
      fetchProtocolDetails(sample.protocol);
    }
  }, [sample.id, sample.protocol]);

  useEffect(() => {
    if (formData.laboratory) {
      fetchDepartments(formData.laboratory);
      fetchProtocols(formData.laboratory, formData.department);
    } else {
      setDepartments([]);
      setProtocols([]);
      setFormData(prev => ({ ...prev, department: null, protocol: null }));
    }
  }, [formData.laboratory]);

  useEffect(() => {
    if (formData.laboratory && formData.department) {
      fetchProtocols(formData.laboratory, formData.department);
    }
  }, [formData.department]);

  useEffect(() => {
    const handleClickOutside = event => {
      if (protocolSearchRef.current && !protocolSearchRef.current.contains(event.target)) {
        setProtocolsDropdownVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchLaboratories = async () => {
    try {
      setLaboratoriesLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/laboratories/`);
      setLaboratories(response.data.filter(lab => !lab.is_deleted));
    } catch (error) {
      console.error('Ошибка при загрузке лабораторий:', error);
      message.error('Не удалось загрузить список лабораторий');
    } finally {
      setLaboratoriesLoading(false);
    }
  };

  const fetchDepartments = async laboratoryId => {
    try {
      setDepartmentsLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/departments/by_laboratory/?laboratory_id=${laboratoryId}`
      );
      setDepartments(response.data.filter(dept => !dept.is_deleted));
    } catch (error) {
      console.error('Ошибка при загрузке подразделений:', error);
      message.error('Не удалось загрузить список подразделений');
      setDepartments([]);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const fetchProtocols = async (laboratoryId, departmentId = null, searchQuery = '') => {
    try {
      setProtocolsLoading(true);
      let url = `${import.meta.env.VITE_API_URL}/api/search-protocols/`;
      const params = {
        laboratory: laboratoryId,
        search: searchQuery,
      };
      if (departmentId) {
        params.department = departmentId;
      }
      const response = await axios.get(url, { params });
      setProtocols(response.data);
      if (searchQuery && searchQuery.length >= 1) {
        setProtocolsDropdownVisible(true);
      }
    } catch (error) {
      console.error('Ошибка при загрузке протоколов:', error);
      message.error('Не удалось загрузить список протоколов');
      setProtocols([]);
    } finally {
      setProtocolsLoading(false);
    }
  };

  const fetchProtocolDetails = async protocolId => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/protocols/${protocolId}/`
      );
      setProtocolSearchValue(response.data.test_protocol_number);
    } catch (error) {
      console.error('Ошибка при загрузке информации о протоколе:', error);
      message.error('Не удалось загрузить информацию о протоколе');
    }
  };

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

  const fetchCalculations = async sampleId => {
    try {
      setCalculationsLoading(true);

      // Получаем страницу исследований для определения порядка методов
      const researchPageResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/research-pages/`,
        {
          params: {
            laboratory_id: sample.laboratory,
            department_id: sample.department || null,
            type: 'oil_products',
          },
        }
      );

      const researchPage = researchPageResponse.data.find(page => page.type === 'oil_products');
      if (!researchPage) {
        throw new Error('Страница исследований не найдена');
      }

      // Получаем доступные методы для определения порядка
      const methodsResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/research-methods/available-methods/`,
        {
          params: {
            research_page_id: researchPage.id,
          },
        }
      );

      // Создаем словарь для сортировки методов
      const methodOrder = {};
      methodsResponse.data.methods.forEach((method, index) => {
        if (method.is_group) {
          method.methods.forEach(groupMethod => {
            methodOrder[groupMethod.id] = {
              sort_order: method.sort_order,
              name: groupMethod.name,
            };
          });
        } else {
          methodOrder[method.id] = {
            sort_order: method.sort_order,
            name: method.name,
          };
        }
      });

      // Получаем расчеты для пробы
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/calculations/`, {
        params: {
          sample: sampleId,
          is_deleted: false,
        },
      });

      const formattedCalculations = response.data.map(calc => {
        let methodName = calc.research_method.name;
        if (calc.research_method.is_group_member && calc.research_method.groups?.length > 0) {
          const groupName = calc.research_method.groups[0].name;
          const methodNameLower = methodName.charAt(0).toLowerCase() + methodName.slice(1);
          methodName = `${groupName} ${methodNameLower}`;
        }

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
          // Сортировка
          sort_order: methodOrder[calc.research_method.id]?.sort_order ?? -1,
          method_name: methodOrder[calc.research_method.id]?.name || methodName,
        };
      });

      // Сортируем расчеты по sort_order и имени метода
      formattedCalculations.sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order;
        }
        return a.method_name.localeCompare(b.method_name);
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
      const researchPageResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/research-pages/`,
        {
          params: {
            laboratory_id: sample.laboratory,
            department_id: sample.department || null,
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
            sample_id: sample.id,
            research_page_id: researchPage.id,
          },
        }
      );

      sessionStorage.setItem('available_methods', JSON.stringify(response.data));

      navigate(
        `/research-method?sample_id=${sample.id}&laboratory=${sample.laboratory}${sample.department ? `&department=${sample.department}` : ''}`
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

  const handleInputChange = field => e => {
    const value = e?.target ? e.target.value : e;

    if (field === 'laboratory') {
      setFormData(prev => ({
        ...prev,
        [field]: value,
        department: null,
        protocol: null,
      }));
    } else if (field === 'department') {
      setFormData(prev => ({
        ...prev,
        [field]: value,
        protocol: null,
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

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = ['registration_number', 'test_object', 'laboratory'];

    requiredFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = 'Это поле обязательно для заполнения';
      }
    });

    // Проверяем обязательность подразделения
    if (formData.laboratory && departments.length > 0 && !formData.department) {
      newErrors.department = 'В выбранной лаборатории необходимо указать подразделение';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    try {
      if (!validateForm()) {
        return;
      }

      setLoading(true);

      const dataToSend = {
        ...formData,
        sampling_date: formData.sampling_date
          ? dayjs(formData.sampling_date).format('YYYY-MM-DD')
          : null,
        receiving_date: formData.receiving_date
          ? dayjs(formData.receiving_date).format('YYYY-MM-DD')
          : null,
      };

      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/samples/${sample.id}/`,
        dataToSend
      );

      message.success('Проба успешно обновлена');
      onSuccess();
    } catch (error) {
      console.error('Ошибка при обновлении пробы:', error);

      if (error.response?.data) {
        const serverErrors = error.response.data;
        const newErrors = {};

        Object.keys(serverErrors).forEach(field => {
          if (Array.isArray(serverErrors[field])) {
            newErrors[field] = serverErrors[field][0];
          } else {
            newErrors[field] = serverErrors[field];
          }
        });

        setErrors(prev => ({ ...prev, ...newErrors }));

        if (Object.keys(newErrors).length === 0 && error.response?.data?.error) {
          message.error(error.response.data.error);
        }
      } else {
        message.error('Произошла ошибка при обновлении пробы');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProtocolSearch = value => {
    setProtocolSearchValue(value);
    if (formData.laboratory) {
      fetchProtocols(formData.laboratory, formData.department, value);
    }
  };

  const searchLocations = async query => {
    try {
      setLocationsLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/get-sampling-locations/`,
        {
          params: {
            search: query,
            laboratory: formData.laboratory,
            department: formData.department,
          },
        }
      );
      setSamplingLocations(response.data);
    } catch (error) {
      console.error('Ошибка при поиске места отбора пробы:', error);
      message.error('Не удалось найти место отбора пробы');
      setSamplingLocations([]);
    } finally {
      setLocationsLoading(false);
    }
  };

  return (
    <Modal
      header="Редактирование пробы"
      onClose={onClose}
      onSave={activeTab === 'edit' ? handleSave : null}
      loading={loading}
      style={{ width: activeTab === 'calculations' ? '900px' : '600px' }}
    >
      <div className="edit-sample-form">
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
            <div className="edit-form-content">
              <div className="form-group">
                <label>
                  Регистрационный номер <span className="required">*</span>
                </label>
                <Input
                  value={formData.registration_number}
                  onChange={handleInputChange('registration_number')}
                  placeholder="Введите регистрационный номер"
                  status={errors.registration_number ? 'error' : ''}
                  style={{ width: '100%' }}
                />
                {errors.registration_number && (
                  <div className="error-message">{errors.registration_number}</div>
                )}
              </div>

              <div className="form-group">
                <label>
                  Объект испытаний <span className="required">*</span>
                </label>
                <Select
                  value={formData.test_object}
                  onChange={value => handleInputChange('test_object')(value)}
                  placeholder="Выберите объект испытаний"
                  style={{ width: '100%' }}
                >
                  <Option value="дегазированный конденсат">дегазированный конденсат</Option>
                  <Option value="нефть">нефть</Option>
                </Select>
                {errors.test_object && <div className="error-message">{errors.test_object}</div>}
              </div>

              <div className="form-group">
                <label>Протокол</label>
                <div className="search-container" ref={protocolSearchRef}>
                  <Input
                    value={protocolSearchValue}
                    onChange={e => {
                      const value = e.target.value;
                      setProtocolSearchValue(value);
                      handleProtocolSearch(value);
                    }}
                    onFocus={() => {
                      if (protocolSearchValue && protocolSearchValue.length >= 1) {
                        setProtocolsDropdownVisible(true);
                      }
                    }}
                    placeholder="Введите номер протокола"
                    disabled={!formData.laboratory}
                    status={errors.protocol ? 'error' : ''}
                    style={{ width: '100%' }}
                  />
                  {protocolsDropdownVisible && protocols.length > 0 && (
                    <div className="search-dropdown">
                      {protocolsLoading ? (
                        <div className="search-loading">
                          <Spin size="small" />
                        </div>
                      ) : (
                        protocols.map(protocol => (
                          <div
                            key={protocol.id}
                            className="search-option"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, protocol: protocol.id }));
                              setProtocolSearchValue(protocol.test_protocol_number);
                              setProtocolsDropdownVisible(false);
                            }}
                          >
                            {protocol.test_protocol_number}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {errors.protocol && <div className="error-message">{errors.protocol}</div>}
              </div>

              <div className="form-group">
                <label>
                  Лаборатория <span className="required">*</span>
                </label>
                <Select
                  value={formData.laboratory}
                  onChange={value => handleInputChange('laboratory')(value)}
                  placeholder="Выберите лабораторию"
                  loading={laboratoriesLoading}
                  status={errors.laboratory ? 'error' : ''}
                  style={{ width: '100%' }}
                >
                  {laboratories.map(lab => (
                    <Option key={lab.id} value={lab.id}>
                      {lab.name}
                    </Option>
                  ))}
                </Select>
                {errors.laboratory && <div className="error-message">{errors.laboratory}</div>}
              </div>

              {departments.length > 0 && (
                <div className="form-group">
                  <label>
                    Подразделение <span className="required">*</span>
                  </label>
                  <Select
                    value={formData.department}
                    onChange={value => handleInputChange('department')(value)}
                    placeholder="Выберите подразделение"
                    loading={departmentsLoading}
                    disabled={!formData.laboratory}
                    status={errors.department ? 'error' : ''}
                    style={{ width: '100%' }}
                  >
                    {departments.map(dept => (
                      <Option key={dept.id} value={dept.id}>
                        {dept.name}
                      </Option>
                    ))}
                  </Select>
                  {errors.department && <div className="error-message">{errors.department}</div>}
                </div>
              )}

              <div className="form-group">
                <label>Место отбора пробы</label>
                <div className="search-container" ref={locationSearchRef}>
                  <Input
                    value={locationSearchValue}
                    onChange={e => {
                      const value = e.target.value;
                      setLocationSearchValue(value);
                      setFormData(prev => ({ ...prev, sampling_location_detail: value }));
                      if (value.length >= 2) {
                        searchLocations(value);
                        setLocationsDropdownVisible(true);
                      } else {
                        setLocationsDropdownVisible(false);
                      }
                    }}
                    onFocus={() => {
                      if (locationSearchValue && locationSearchValue.length >= 2) {
                        searchLocations(locationSearchValue);
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
                <label>Дата отбора пробы</label>
                <DatePicker
                  locale={locale}
                  format="DD.MM.YYYY"
                  value={formData.sampling_date ? dayjs(formData.sampling_date) : null}
                  onChange={value => handleInputChange('sampling_date')(value)}
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
                  value={formData.receiving_date ? dayjs(formData.receiving_date) : null}
                  onChange={value => handleInputChange('receiving_date')(value)}
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
                />
                {errors.receiving_date && (
                  <div className="error-message">{errors.receiving_date}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default EditSampleModal;
