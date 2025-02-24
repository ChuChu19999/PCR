import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import { Select, message } from 'antd';
import axios from 'axios';
import './SelectResearchObjectModal.css';

const SelectResearchObjectModal = ({ isOpen, onClose, department, laboratoryId }) => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState(null);
  const [error, setError] = useState(null);

  console.log('SelectResearchObjectModal props:', {
    isOpen,
    department,
    laboratoryId,
  });

  const handleTypeChange = value => {
    setSelectedType(value);
    setError(null);
  };

  const handleSave = async () => {
    try {
      if (!selectedType) {
        setError('Выберите тип объекта исследования');
        return;
      }

      if (!laboratoryId) {
        setError('Отсутствует ID лаборатории');
        return;
      }

      const requestData = {
        type: selectedType,
        laboratory: laboratoryId,
        department: department?.id || null,
      };

      console.log('Отправляемые данные:', JSON.stringify(requestData, null, 2));

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/research-pages/`,
        requestData
      );

      if (response.status === 201) {
        message.success('Страница расчетов успешно создана');

        if (selectedType === 'oil_products') {
          if (department) {
            navigate(`/departments/${department.id}/oil-products`);
          } else {
            navigate(`/laboratories/${laboratoryId}/oil-products`);
          }
        }
        onClose();
      }
    } catch (error) {
      console.error('Ошибка при создании объекта исследования:', error);
      setError(
        error.response?.data?.message || 'Произошла ошибка при создании объекта исследования'
      );
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      header="Выбор объекта исследования"
      onClose={onClose}
      onSave={handleSave}
      style={{ width: '550px' }}
    >
      <div className="select-research-object-form">
        <div className="form-group">
          <label>Тип объекта исследования</label>
          <Select
            value={selectedType}
            onChange={handleTypeChange}
            placeholder="Выберите тип объекта"
            className="select-field"
            options={[
              { value: 'oil_products', label: 'Нефтепродукты' },
              { value: 'condensate', label: 'Конденсат' },
            ]}
            status={error ? 'error' : ''}
          />
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    </Modal>
  );
};

export default SelectResearchObjectModal;
