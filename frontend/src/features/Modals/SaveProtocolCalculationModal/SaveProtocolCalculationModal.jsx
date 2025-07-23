import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import axios from 'axios';
import dayjs from 'dayjs';
import { Input, Form, Select, Spin, Typography, message } from 'antd';
import { CloseCircleFilled } from '@ant-design/icons';
import { employeesApi } from '../../../shared/api/employees';
import './SaveProtocolCalculationModal.css';

const { Option } = Select;
const { Text } = Typography;

const CONVERGENCE_MAPPING = {
  unsatisfactory: 'Неудовлетворительно',
  traces: 'Следы',
  absence: 'Отсутствие',
};

const SaveProtocolCalculationModal = ({
  isOpen,
  onClose,
  onSuccess,
  sampleId,
  calculationResult,
  currentMethod,
  laboratoryActivityDate,
  laboratoryId,
  departmentId,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [executorSearch, setExecutorSearch] = useState('');
  const [executorOptions, setExecutorOptions] = useState([]);
  const [executorLoading, setExecutorLoading] = useState(false);
  const [selectedExecutor, setSelectedExecutor] = useState(null);
  const [executorError, setExecutorError] = useState('');
  const [equipment, setEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [equipmentError, setEquipmentError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setExecutorSearch('');
      setSelectedExecutor(null);
      setExecutorError('');
      setSelectedEquipment([]);
      setEquipmentError('');
      fetchEquipment();
      console.log('SaveProtocolCalculationModal - входящие данные:', {
        calculationResult,
        currentMethod,
        sampleId,
        laboratoryActivityDate,
        laboratoryId,
        departmentId,
      });
    }
  }, [
    isOpen,
    calculationResult,
    currentMethod,
    sampleId,
    laboratoryActivityDate,
    laboratoryId,
    departmentId,
  ]);

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
      setEquipmentError('Не удалось загрузить список оборудования');
    } finally {
      setLoadingEquipment(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!selectedExecutor) {
        setExecutorError('Необходимо выбрать исполнителя из списка');
        return;
      }

      setExecutorError('');
      setEquipmentError('');
      setLoading(true);
      setError(null);

      if (!calculationResult) {
        console.error('Отсутствуют данные для сохранения:', calculationResult);
        setError('Отсутствуют данные расчета');
        return;
      }

      const convergenceValue = calculationResult.convergence;
      let result, measurement_error;

      if (['Неудовлетворительно', 'Следы', 'Отсутствие'].includes(convergenceValue)) {
        console.log('Обнаружен особый результат:', convergenceValue);
        result = convergenceValue;
        measurement_error = '-';
      } else if (calculationResult.result) {
        result = calculationResult.result;
        measurement_error = calculationResult.measurement_error;
      } else {
        console.error('Нет результата для сохранения:', calculationResult);
        setError('Отсутствует результат расчета');
        return;
      }

      const requestData = {
        input_data: calculationResult.input_data || {},
        equipment_data: selectedEquipment.map(id => ({ id })),
        unit: currentMethod.unit,
        laboratory_activity_date: calculationResult.laboratory_activity_date
          ? dayjs(calculationResult.laboratory_activity_date).format('YYYY-MM-DD')
          : laboratoryActivityDate.format('YYYY-MM-DD'),
        laboratory: parseInt(laboratoryId, 10),
        department: departmentId ? parseInt(departmentId, 10) : null,
        sample_id: parseInt(sampleId, 10),
        research_method: parseInt(currentMethod.id, 10),
        executor: selectedExecutor.hashMd5,
        result: result.toString(),
        measurement_error: measurement_error ? measurement_error.toString() : null,
      };

      // Проверяем корректность преобразования ID
      if (
        isNaN(requestData.laboratory) ||
        isNaN(requestData.sample_id) ||
        isNaN(requestData.research_method)
      ) {
        setError('Ошибка в формате ID лаборатории, пробы или метода исследования');
        return;
      }

      // Проверяем корректность department ID если он есть
      if (departmentId && isNaN(requestData.department)) {
        setError('Ошибка в формате ID подразделения');
        return;
      }

      console.log('=== ДАННЫЕ ДЛЯ ОТПРАВКИ НА СЕРВЕР ===');
      console.log('1. Основные данные:');
      console.log('- ID пробы:', sampleId);
      console.log('- ID лаборатории:', laboratoryId);
      console.log('- ID подразделения:', departmentId);
      console.log('- ID метода исследования:', currentMethod.id);
      console.log('- Единица измерения:', currentMethod.unit);

      const requiredFields = {
        Результат: requestData.result,
        'ID пробы': requestData.sample_id,
        'ID метода': requestData.research_method,
        'ID лаборатории': requestData.laboratory,
        Дата: requestData.laboratory_activity_date,
        Исполнитель: requestData.executor,
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

      if (missingFields.length > 0) {
        const errorMsg = `Отсутствуют обязательные поля: ${missingFields.join(', ')}`;
        console.error('Ошибка валидации:', errorMsg);
        setError(errorMsg);
        return;
      }

      console.log('Отправка запроса на сервер:', {
        url: `${import.meta.env.VITE_API_URL}/api/save-calculation/`,
        method: 'POST',
        data: requestData,
      });

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/save-calculation/`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Ответ от сервера:', {
        status: response.status,
        data: response.data,
      });

      if (response.data) {
        console.log('Успешный ответ от сервера:', response.data);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Ошибка при сохранении расчета:', error);
      console.error('Детали ошибки:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
      });

      if (error.response?.data) {
        if (error.response.data.executor) {
          setExecutorError(
            Array.isArray(error.response.data.executor)
              ? error.response.data.executor[0]
              : error.response.data.executor
          );
        } else if (error.response.data.equipment_data) {
          setEquipmentError(
            Array.isArray(error.response.data.equipment_data)
              ? error.response.data.equipment_data[0]
              : error.response.data.equipment_data
          );
        } else {
          const errorMessage =
            error.response.data.error ||
            error.response.data.detail ||
            'Произошла ошибка при сохранении расчета';
          setError(errorMessage);
        }
      } else {
        setError('Произошла ошибка при сохранении расчета');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      header="Подтверждение сохранения"
      onClose={onClose}
      onSave={handleSave}
      style={{ width: '600px' }}
      loading={loading}
    >
      <div className="save-protocol-calculation-form">
        <Form layout="vertical">
          <Form.Item
            label="Исполнитель"
            required
            validateStatus={executorError ? 'error' : ''}
            help={executorError}
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
                          setExecutorError('');
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
            label="Использованное оборудование"
            validateStatus={equipmentError ? 'error' : ''}
            help={equipmentError}
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
                    setEquipmentError('');
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

          {error && (
            <p className="error-message" style={{ color: '#ff4d4f', marginTop: '8px' }}>
              {error}
            </p>
          )}
        </Form>
      </div>
    </Modal>
  );
};

export default SaveProtocolCalculationModal;
