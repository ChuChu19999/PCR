import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import axios from 'axios';
import dayjs from 'dayjs';
import { Input, Form, Select, Spin, Typography } from 'antd';
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
  protocolId,
  calculationResult,
  currentMethod,
  laboratoryActivityDate,
  laboratoryId,
  departmentId,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [executor, setExecutor] = useState('');
  const [executorError, setExecutorError] = useState('');
  const [equipment, setEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [equipmentError, setEquipmentError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setExecutor('');
      setExecutorError('');
      setSelectedEquipment([]);
      setEquipmentError('');
      fetchEquipment();
      console.log('SaveProtocolCalculationModal - входящие данные:', {
        calculationResult,
        currentMethod,
        protocolId,
        laboratoryActivityDate,
        laboratoryId,
        departmentId,
      });
    }
  }, [
    isOpen,
    calculationResult,
    currentMethod,
    protocolId,
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
      // Проверяем заполнение исполнителя
      const trimmedExecutor = executor.trim();
      if (!trimmedExecutor) {
        setExecutorError('Необходимо указать исполнителя');
        return;
      }

      // Проверяем длину и формат имени исполнителя
      if (trimmedExecutor.length < 2) {
        setExecutorError('ФИО исполнителя должно содержать не менее 2 символов');
        return;
      }

      // Проверяем выбор оборудования
      if (selectedEquipment.length === 0) {
        setEquipmentError('Необходимо выбрать хотя бы один прибор');
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
        laboratory: laboratoryId,
        department: departmentId,
        protocol_id: protocolId,
        research_method: currentMethod.id,
        executor: trimmedExecutor,
        result: result,
        measurement_error: measurement_error,
      };

      console.log('Подготовленные данные для отправки:', {
        selectedEquipment,
        equipmentData: requestData.equipment_data,
        fullRequestData: requestData,
      });

      const requiredFields = {
        Результат: requestData.result,
        'ID протокола': requestData.protocol_id,
        'ID метода': requestData.research_method,
        'ID лаборатории': requestData.laboratory,
        Дата: requestData.laboratory_activity_date,
        Исполнитель: requestData.executor,
        Оборудование: requestData.equipment_data.length > 0,
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
            <Input
              placeholder="Введите ФИО исполнителя"
              value={executor}
              onChange={e => {
                setExecutor(e.target.value);
                setExecutorError('');
              }}
              style={{ width: '100%' }}
              maxLength={100}
            />
          </Form.Item>

          <Form.Item
            label="Использованное оборудование"
            required
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
        </Form>

        {error && (
          <p className="error-message" style={{ color: '#ff4d4f', marginTop: '8px' }}>
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
};

export default SaveProtocolCalculationModal;
