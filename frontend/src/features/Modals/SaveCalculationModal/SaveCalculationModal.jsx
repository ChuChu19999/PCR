import React, { useState } from 'react';
import { Input, Spin, message } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import Modal from '../ui/Modal';
import './SaveCalculationModal.css';

const SaveCalculationModal = ({
  isOpen,
  onClose,
  calculationResult,
  currentMethod,
  laboratoryId,
  departmentId,
  onSuccess,
}) => {
  const [calculationFormData, setCalculationFormData] = useState({
    executor: '',
  });
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [protocols, setProtocols] = useState([]);
  const [protocolsLoading, setProtocolsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [searchValue, setSearchValue] = useState('');

  const searchProtocols = async searchText => {
    if (!searchText) {
      setProtocols([]);
      return;
    }

    setProtocolsLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/protocols/?search=${searchText}&laboratory=${laboratoryId}${departmentId ? `&department=${departmentId}` : ''}`
      );
      // Фильтруем протоколы, чтобы искать только по регистрационному номеру
      const filteredProtocols = response.data.filter(protocol =>
        protocol.registration_number.toLowerCase().includes(searchText.toLowerCase())
      );
      setProtocols(filteredProtocols);
    } catch (error) {
      console.error('Ошибка при поиске протоколов:', error);
      message.error('Не удалось загрузить список протоколов');
    } finally {
      setProtocolsLoading(false);
    }
  };

  const handleProtocolSelect = async protocolId => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/protocols/${protocolId}/`
      );
      const protocol = response.data;
      setSelectedProtocol(protocol);
    } catch (error) {
      console.error('Ошибка при загрузке протокола:', error);
      message.error('Не удалось загрузить данные протокола');
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!selectedProtocol) {
      newErrors.protocol = 'Выберите протокол';
    }

    if (!calculationFormData.executor) {
      newErrors.executor = 'Введите ФИО исполнителя расчета';
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
        protocol_id: selectedProtocol.id,
        input_data: calculationResult.input_data,
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
        executor: calculationFormData.executor,
        laboratory_activity_date: calculationResult.laboratory_activity_date
          ? dayjs.isDayjs(calculationResult.laboratory_activity_date)
            ? calculationResult.laboratory_activity_date.format('YYYY-MM-DD')
            : dayjs(calculationResult.laboratory_activity_date).format('YYYY-MM-DD')
          : null,
      };

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
    setSelectedProtocol(null);
    setErrors({});
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
        <div className="form-group">
          <label>
            ФИО исполнителя расчета <span className="required">*</span>
          </label>
          <Input
            value={calculationFormData.executor}
            onChange={e => setCalculationFormData(prev => ({ ...prev, executor: e.target.value }))}
            placeholder="Введите ФИО исполнителя"
            status={errors.executor ? 'error' : ''}
            required
            style={{ width: '100%' }}
          />
          {errors.executor && <div className="error-message">{errors.executor}</div>}
        </div>

        <div className="form-group">
          <label>
            Регистрационный номер пробы <span className="required">*</span>
          </label>
          <div className="protocol-search-container">
            <Input
              value={searchValue}
              placeholder="Введите регистрационный номер"
              onChange={e => {
                const value = e.target.value;
                setSearchValue(value);
                searchProtocols(value);
                if (selectedProtocol) {
                  setSelectedProtocol(null);
                }
              }}
              className="protocol-search"
              style={{ width: '100%' }}
            />
            {protocols.length > 0 && !selectedProtocol && (
              <div className="protocol-dropdown">
                {protocolsLoading ? (
                  <div className="protocol-loading">
                    <Spin size="small" />
                  </div>
                ) : (
                  protocols.map(protocol => (
                    <div
                      key={protocol.id}
                      className="protocol-option"
                      onClick={() => {
                        handleProtocolSelect(protocol.id);
                        setSearchValue(protocol.registration_number);
                      }}
                    >
                      {protocol.registration_number}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          {errors.protocol && <div className="error-message">{errors.protocol}</div>}
        </div>

        {selectedProtocol && (
          <div className="selected-protocol-info">
            <div className="info-row">
              <span className="info-label">Номер протокола:</span>
              <span className="info-value">{selectedProtocol.test_protocol_number}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Номер акта отбора:</span>
              <span className="info-value">{selectedProtocol.sampling_act_number}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Дата отбора:</span>
              <span className="info-value">
                {dayjs(selectedProtocol.sampling_date).format('DD.MM.YYYY')}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Дата получения:</span>
              <span className="info-value">
                {dayjs(selectedProtocol.receiving_date).format('DD.MM.YYYY')}
              </span>
            </div>
          </div>
        )}

        {errors.general && <div className="error-message general-error">{errors.general}</div>}
      </div>
    </Modal>
  ) : null;
};

export default SaveCalculationModal;
