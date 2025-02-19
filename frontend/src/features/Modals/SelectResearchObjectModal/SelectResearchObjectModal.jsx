import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Select } from 'antd';
import './SelectResearchObjectModal.css';

const SelectResearchObjectModal = ({ isOpen, onClose }) => {
  const [selectedType, setSelectedType] = useState(null);

  const handleTypeChange = value => {
    setSelectedType(value);
  };

  const handleSave = async () => {
    try {
      if (!selectedType) {
        return;
      }
      // Здесь будет логика сохранения
      onClose();
    } catch (error) {
      console.error('Ошибка при создании объекта исследования:', error);
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
          />
        </div>
      </div>
    </Modal>
  );
};

export default SelectResearchObjectModal;
