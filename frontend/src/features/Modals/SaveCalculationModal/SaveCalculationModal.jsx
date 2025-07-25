import React, { useState } from 'react';
import { Input, Spin, message, Form, Select, Typography } from 'antd';
import { CloseCircleFilled } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import Modal from '../ui/Modal';
import './SaveCalculationModal.css';
import { employeesApi } from '../../../shared/api/employees';

const { Option } = Select;
const { Text } = Typography;

const SaveCalculationModal = ({
  isOpen,
  onClose,
  calculationResult,
  currentMethod,
  laboratoryId,
  departmentId,
  onSuccess,
}) => {
  const [executorSearch, setExecutorSearch] = useState('');
  const [executorLoading, setExecutorLoading] = useState(false);
  const [executorOptions, setExecutorOptions] = useState([]);
  const [selectedExecutor, setSelectedExecutor] = useState(null);
  const [selectedSample, setSelectedSample] = useState(null);
  const [samples, setSamples] = useState([]);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [searchValue, setSearchValue] = useState('');
  const [equipment, setEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [loadingEquipment, setLoadingEquipment] = useState(false);

  const searchSamples = async searchText => {
    if (!searchText) {
      setSamples([]);
      return;
    }

    setSamplesLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/samples/?search=${searchText}&laboratory=${laboratoryId}${departmentId ? `&department=${departmentId}` : ''}`
      );
      setSamples(response.data);
    } catch (error) {
      console.error('Ошибка при поиске проб:', error);
      message.error('Не удалось загрузить список проб');
    } finally {
      setSamplesLoading(false);
    }
  };

  const handleSampleSelect = async sampleId => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/samples/${sampleId}/`);
      const sample = response.data;
      setSelectedSample(sample);
    } catch (error) {
      console.error('Ошибка при загрузке пробы:', error);
      message.error('Не удалось загрузить данные пробы');
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      fetchEquipment();
    }
  }, [isOpen, laboratoryId, departmentId]);

  const fetchEquipment = async () => {
    try {
      setLoadingEquipment(true);
      const params = new URLSearchParams({
        laboratory: laboratoryId,
        ...(departmentId && { department: departmentId }),
      });

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/equipment/active_equipment/?${params}`
      );
      setEquipment(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке оборудования:', error);
      message.error('Не удалось загрузить список оборудования');
    } finally {
      setLoadingEquipment(false);
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!selectedSample) {
      newErrors.sample = 'Выберите пробу';
    }

    if (!selectedExecutor) {
      newErrors.executor = 'Выберите исполнителя из списка';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    try {
      if (!validate()) {
        return;
      }

      setLoading(true);

      // Создаем расчет
      const calculationData = {
        sample_id: selectedSample.id,
        input_data: calculationResult.input_data,
        equipment_data: selectedEquipment.map(id => ({ id })),
        result:
          calculationResult.convergence &&
          ['Неудовлетворительно', 'Следы', 'Отсутствие'].includes(calculationResult.convergence)
            ? calculationResult.convergence
            : calculationResult.result,
        measurement_error: calculationResult.measurement_error || '-',
        unit: currentMethod.unit,
        laboratory: laboratoryId,
        department: departmentId,
        research_method: currentMethod.id,
        executor: selectedExecutor?.hashMd5,
        laboratory_activity_date: calculationResult.laboratory_activity_date
          ? dayjs.isDayjs(calculationResult.laboratory_activity_date)
            ? calculationResult.laboratory_activity_date.format('YYYY-MM-DD')
            : dayjs(calculationResult.laboratory_activity_date).format('YYYY-MM-DD')
          : null,
      };

      console.log('Подготовленные данные для отправки:', {
        selectedEquipment,
        equipmentData: calculationData.equipment_data,
        fullRequestData: calculationData,
      });

      if (!calculationData.laboratory_activity_date) {
        setErrors({
          general: 'Необходимо указать дату лабораторной деятельности',
        });
        return;
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/save-calculation/`,
        calculationData
      );

      console.log('Ответ от сервера:', {
        status: response.status,
        data: response.data,
      });

      onSuccess(response.data);
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      setErrors({
        general:
          error.response?.data?.detail ||
          error.response?.data?.error ||
          'Произошла ошибка при сохранении результата расчета',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setSelectedSample(null);
    setErrors({});
    setSelectedEquipment([]);
    setSelectedExecutor(null);
    setExecutorSearch('');
    onClose();
  };

  return isOpen ? (
    <Modal
      header="Сохранение результата расчета"
      onClose={handleModalClose}
      onSave={handleSave}
      loading={loading}
      style={{ width: '600px' }}
    >
      <div className="save-calculation-form">
        <Form layout="vertical">
          <Form.Item
            label="Исполнитель"
            required
            validateStatus={errors.executor ? 'error' : ''}
            help={errors.executor}
          >
            <div className="executor-search-container">
              <Input
                value={executorSearch}
                placeholder="Введите ФИО исполнителя"
                readOnly={!!selectedExecutor}
                onChange={async e => {
                  const value = e.target.value;
                  setExecutorSearch(value);
                  setSelectedExecutor(null);

                  if (value.length < 3) {
                    setExecutorOptions([]);
                    return;
                  }

                  setExecutorLoading(true);
                  try {
                    const data = await employeesApi.searchByFio(value);
                    setExecutorOptions(data);
                  } catch (err) {
                    console.error('Ошибка при поиске сотрудников:', err);
                    message.error('Не удалось загрузить список сотрудников');
                  } finally {
                    setExecutorLoading(false);
                  }
                }}
                style={{ width: '100%' }}
                suffix={
                  selectedExecutor ? (
                    <CloseCircleFilled
                      style={{ color: '#ff4d4f', cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedExecutor(null);
                        setExecutorSearch('');
                        setExecutorOptions([]);
                      }}
                    />
                  ) : null
                }
              />
              {executorOptions.length > 0 && !selectedExecutor && (
                <div className="protocol-dropdown">
                  {executorLoading ? (
                    <div className="protocol-loading">
                      <Spin size="small" />
                    </div>
                  ) : (
                    executorOptions.map(emp => (
                      <div
                        key={emp.hashMd5}
                        className="protocol-option"
                        onClick={() => {
                          setSelectedExecutor(emp);
                          setExecutorSearch(emp.fullName);
                          setExecutorOptions([]);
                          setErrors(prev => ({ ...prev, executor: undefined }));
                        }}
                      >
                        {emp.fullName}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </Form.Item>

          <Form.Item
            label="Регистрационный номер пробы"
            required
            validateStatus={errors.sample ? 'error' : ''}
            help={errors.sample}
          >
            <div className="protocol-search-container">
              <Input
                value={searchValue}
                placeholder="Введите регистрационный номер пробы"
                onChange={e => {
                  const value = e.target.value;
                  setSearchValue(value);
                  searchSamples(value);
                  if (selectedSample) {
                    setSelectedSample(null);
                  }
                }}
                className="protocol-search"
                style={{ width: '100%' }}
              />
              {samples.length > 0 && !selectedSample && (
                <div className="protocol-dropdown">
                  {samplesLoading ? (
                    <div className="protocol-loading">
                      <Spin size="small" />
                    </div>
                  ) : (
                    samples.map(sample => (
                      <div
                        key={sample.id}
                        className="protocol-option"
                        onClick={() => {
                          handleSampleSelect(sample.id);
                          setSearchValue(sample.registration_number);
                        }}
                      >
                        {sample.registration_number} - {sample.test_object}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </Form.Item>

          <Form.Item
            label="Использованное оборудование"
            validateStatus={errors.equipment ? 'error' : ''}
            help={errors.equipment}
          >
            {loadingEquipment ? (
              <div style={{ textAlign: 'center', padding: '10px' }}>
                <Spin size="small" />
              </div>
            ) : (
              <>
                <Select
                  mode="multiple"
                  placeholder="Выберите оборудование"
                  value={selectedEquipment}
                  onChange={value => {
                    setSelectedEquipment(value);
                    setErrors(prev => ({ ...prev, equipment: undefined }));
                  }}
                  style={{ width: '100%' }}
                  optionFilterProp="children"
                  showSearch={false}
                  listHeight={110}
                  maxTagCount="responsive"
                  virtual={false}
                  popupClassName="equipment-select-dropdown"
                >
                  {equipment.map(item => (
                    <Option key={item.id} value={item.id}>
                      <div>
                        <Text>{item.name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {`Зав. № ${item.serial_number}`}
                        </Text>
                      </div>
                    </Option>
                  ))}
                </Select>
                {equipment.length === 0 && !loadingEquipment && (
                  <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
                    Нет доступного оборудования
                  </Text>
                )}
              </>
            )}
          </Form.Item>

          {errors.general && <div className="error-message general-error">{errors.general}</div>}
        </Form>
      </div>
    </Modal>
  ) : null;
};

export default SaveCalculationModal;
