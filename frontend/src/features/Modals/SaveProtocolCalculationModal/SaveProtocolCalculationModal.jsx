import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import axios from 'axios';
import dayjs from 'dayjs';
import { Input, Form } from 'antd';
import './SaveProtocolCalculationModal.css';

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

  useEffect(() => {
    if (isOpen) {
      setExecutor('');
      setExecutorError('');
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

      setExecutorError('');
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

      const requiredFields = {
        Результат: requestData.result,
        'ID протокола': requestData.protocol_id,
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
        console.error(errorMsg);
        setError(errorMsg);
        return;
      }

      console.log('Отправляемые данные на сервер:', JSON.stringify(requestData, null, 2));
      console.log('Значение поля executor:', requestData.executor);
      console.log('Тип данных executor:', typeof requestData.executor);

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/save-calculation/`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

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
      style={{ width: '500px' }}
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
