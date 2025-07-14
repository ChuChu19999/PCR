import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Input, Select, message, Table, Button, Spin, DatePicker } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Modal from '../ui/Modal';
import './EditSampleModal.css';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import locale from 'antd/es/date-picker/locale/ru_RU';
import { samplesApi } from '../../../shared/api/samples';
import { protocolsApi } from '../../../shared/api/protocols';

// Устанавливаем русскую локаль для dayjs
dayjs.locale('ru');

const { Option } = Select;

const EditSampleModal = ({ onClose, onSuccess, sample, laboratoryId, departmentId }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('calculations');
  const [isAnimating, setIsAnimating] = useState(false);
  const [formData, setFormData] = useState({
    registration_number: sample.registration_number || '',
    test_object: sample.test_object || '',
    protocol: sample.protocol || null,
    sampling_location_detail: sample.sampling_location_detail || '',
    sampling_date: sample.sampling_date || null,
    receiving_date: sample.receiving_date || null,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [protocolSearchValue, setProtocolSearchValue] = useState('');
  const [protocolsDropdownVisible, setProtocolsDropdownVisible] = useState(false);
  const protocolSearchRef = useRef(null);
  const [locationSearchValue, setLocationSearchValue] = useState(
    sample.sampling_location_detail || ''
  );
  const [locationsDropdownVisible, setLocationsDropdownVisible] = useState(false);
  const locationSearchRef = useRef(null);
  const [availableMethodsLoading, setAvailableMethodsLoading] = useState(false);

  // Запрос на получение всех протоколов с кэшированием
  const { data: allProtocols = [] } = useQuery({
    queryKey: ['protocols', laboratoryId, departmentId],
    queryFn: () => protocolsApi.getProtocols({ laboratoryId, departmentId }),
    staleTime: 5 * 60 * 1000, // кэш на 5 минут
  });

  // Фильтрация протоколов на клиентской стороне
  const filteredProtocols = useMemo(() => {
    if (!protocolSearchValue) return [];
    return allProtocols.filter(protocol =>
      protocol.test_protocol_number.toLowerCase().includes(protocolSearchValue.toLowerCase())
    );
  }, [allProtocols, protocolSearchValue]);

  // Запрос на получение мест отбора проб
  const { data: samplingLocations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['samplingLocations', locationSearchValue, laboratoryId, departmentId],
    queryFn: () =>
      samplesApi.getSamplingLocations({
        searchText: locationSearchValue,
        laboratoryId,
        departmentId,
      }),
    enabled: locationSearchValue.length >= 2,
  });

  // Запрос на получение расчетов
  const { data: calculations = [], isLoading: calculationsLoading } = useQuery({
    queryKey: ['calculations', sample.id],
    queryFn: async () => {
      const data = await samplesApi.getCalculations(sample.id);
      console.log('Полученные данные расчетов:', data);
      return data.map(calc => {
        console.log('Данные метода:', {
          name: calc.research_method?.name,
          groups: calc.research_method?.groups,
          full_method: calc.research_method,
          executor: calc.executor,
          rawCalc: calc,
        });

        // Форматируем метод
        let methodName = calc.research_method?.name || '-';
        if (calc.research_method?.groups && calc.research_method.groups.length > 0) {
          const groupName = calc.research_method.groups[0].name;
          const singleMethodName = methodName.charAt(0).toLowerCase() + methodName.slice(1);
          methodName = `${groupName} ${singleMethodName}`;
          console.log('Отформатированное имя метода:', methodName);
        }

        // Форматируем результат
        let formattedResult = calc.result;
        if (formattedResult && !isNaN(formattedResult)) {
          formattedResult = formattedResult.toString().replace('.', ',');
          if (formattedResult.startsWith('-')) {
            formattedResult = `менее ${formattedResult.substring(1)}`;
          }
        }

        // Форматируем входные данные
        let formattedInputData = '-';
        if (calc.input_data && typeof calc.input_data === 'object') {
          formattedInputData = Object.entries(calc.input_data)
            .map(([key, value]) => {
              const formattedValue =
                typeof value === 'number' ? value.toString().replace('.', ',') : value;
              return `${key}: ${formattedValue}`;
            })
            .join('\n');
        }

        // Форматируем погрешность
        let formattedError = calc.measurement_error || '-';
        if (formattedError && !isNaN(formattedError)) {
          formattedError = formattedError.toString().replace('.', ',');
        }

        return {
          key: calc.id,
          methodName,
          unit: calc.research_method?.unit || '-',
          inputData: formattedInputData,
          result: formattedResult || '-',
          measurementError: formattedError,
          equipment: calc.equipment || [],
          executor: calc.executor || '-',
          sampleNumber: calc.sample_number,
        };
      });
    },
    enabled: !!sample.id && activeTab === 'calculations',
  });

  useEffect(() => {
    if (sample.protocol) {
      const protocol = allProtocols.find(p => p.id === sample.protocol);
      if (protocol) {
        setProtocolSearchValue(protocol.test_protocol_number);
      }
    }
  }, [sample.protocol, allProtocols]);

  useEffect(() => {
    const handleClickOutside = event => {
      if (protocolSearchRef.current && !protocolSearchRef.current.contains(event.target)) {
        setProtocolsDropdownVisible(false);
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

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = ['registration_number', 'test_object'];

    requiredFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = 'Это поле обязательно для заполнения';
      }
    });

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
        laboratory: laboratoryId,
        department: departmentId,
        sampling_date: formData.sampling_date
          ? dayjs(formData.sampling_date).format('YYYY-MM-DD')
          : null,
        receiving_date: formData.receiving_date
          ? dayjs(formData.receiving_date).format('YYYY-MM-DD')
          : null,
      };

      await onSuccess(dataToSend);
      onClose();
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

  const handleAddCalculation = async () => {
    try {
      setAvailableMethodsLoading(true);
      const researchPageResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/research-pages/`,
        {
          params: {
            laboratory_id: laboratoryId,
            department_id: departmentId,
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
        `/research-method?sample_id=${sample.id}&laboratory=${laboratoryId}${departmentId ? `&department=${departmentId}` : ''}`
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
      render: text => <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text}</div>,
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
      render: text => (
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.5' }}>
          {text}
        </div>
      ),
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
      render: text => (text === '-' ? text : `±${text}`),
    },
    {
      title: 'Приборы',
      dataIndex: 'equipment',
      key: 'equipment',
      width: '20%',
      render: equipment => {
        if (!equipment || equipment.length === 0) return '-';
        return (
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {equipment.map((eq, index) => (
              <div key={eq.id} className="equipment-item">
                <span className="equipment-name">{eq.name}</span>
                <span className="equipment-serial"> (Зав.№{eq.serial_number})</span>
                {index < equipment.length - 1 && <br />}
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
                rowKey="key"
                size="small"
                onRow={record => {
                  console.log('Данные строки:', record);
                  return {};
                }}
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
                <label>Место отбора пробы</label>
                <div className="search-container" ref={locationSearchRef}>
                  <Input
                    value={locationSearchValue}
                    onChange={e => {
                      const value = e.target.value;
                      setLocationSearchValue(value);
                      setFormData(prev => ({ ...prev, sampling_location_detail: value }));
                      if (value.length >= 2) {
                        setLocationsDropdownVisible(true);
                      } else {
                        setLocationsDropdownVisible(false);
                      }
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
                <label>Протокол</label>
                <div className="search-container" ref={protocolSearchRef}>
                  <Input
                    value={protocolSearchValue}
                    onChange={e => {
                      const value = e.target.value;
                      setProtocolSearchValue(value);
                      if (value.length >= 1) {
                        setProtocolsDropdownVisible(true);
                      } else {
                        setProtocolsDropdownVisible(false);
                      }
                    }}
                    onFocus={() => {
                      if (protocolSearchValue && protocolSearchValue.length >= 1) {
                        setProtocolsDropdownVisible(true);
                      }
                    }}
                    placeholder="Введите номер протокола"
                    status={errors.protocol ? 'error' : ''}
                    style={{ width: '100%' }}
                  />
                  {protocolsDropdownVisible && filteredProtocols.length > 0 && (
                    <div className="search-dropdown">
                      {filteredProtocols.map(protocol => (
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
                      ))}
                    </div>
                  )}
                </div>
                {errors.protocol && <div className="error-message">{errors.protocol}</div>}
              </div>

              <div className="form-group">
                <label>Дата отбора пробы</label>
                <DatePicker
                  format="DD.MM.YYYY"
                  value={formData.sampling_date ? dayjs(formData.sampling_date) : null}
                  onChange={value => handleInputChange('sampling_date')(value)}
                  placeholder="ДД.ММ.ГГГГ"
                  style={{ width: '100%' }}
                  status={errors.sampling_date ? 'error' : ''}
                  locale={locale}
                  className="custom-date-picker"
                  rootClassName="custom-date-picker-root"
                  popupClassName="custom-date-picker-popup"
                  inputReadOnly={false}
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
                  format="DD.MM.YYYY"
                  value={formData.receiving_date ? dayjs(formData.receiving_date) : null}
                  onChange={value => handleInputChange('receiving_date')(value)}
                  placeholder="ДД.ММ.ГГГГ"
                  style={{ width: '100%' }}
                  status={errors.receiving_date ? 'error' : ''}
                  locale={locale}
                  className="custom-date-picker"
                  rootClassName="custom-date-picker-root"
                  popupClassName="custom-date-picker-popup"
                  inputReadOnly={false}
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
