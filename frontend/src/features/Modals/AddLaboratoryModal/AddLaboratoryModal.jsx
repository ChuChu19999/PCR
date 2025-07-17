import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Input } from 'antd';
import axios from 'axios';
import './AddLaboratoryModal.css';

const AddLaboratoryModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    full_name: '',
    laboratory_location: '',
  });

  const handleInputChange = field => e => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleSave = async () => {
    try {
      if (!formData.name.trim() || !formData.full_name.trim()) {
        return;
      }

      await axios.post(`${import.meta.env.VITE_API_URL}/api/laboratories/`, {
        name: formData.name.trim(),
        full_name: formData.full_name.trim(),
        laboratory_location: formData.laboratory_location.trim(),
      });

      setFormData({
        name: '',
        full_name: '',
        laboratory_location: '',
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Ошибка при создании лаборатории:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      header="Добавление лаборатории"
      onClose={onClose}
      onSave={handleSave}
      style={{ width: '550px' }}
    >
      <div className="add-laboratory-form">
        <div className="form-group">
          <label>
            Аббревиатура <span style={{ color: 'red' }}>*</span>
          </label>
          <Input
            value={formData.name}
            onChange={handleInputChange('name')}
            placeholder="Введите аббревиатуру"
            required
          />
        </div>
        <div className="form-group">
          <label>
            Полное название <span style={{ color: 'red' }}>*</span>
          </label>
          <Input
            value={formData.full_name}
            onChange={handleInputChange('full_name')}
            placeholder="Введите полное название"
            required
          />
        </div>
        <div className="form-group">
          <label>Место осуществления лабораторной деятельности</label>
          <Input
            value={formData.laboratory_location}
            onChange={handleInputChange('laboratory_location')}
            placeholder="Введите место осуществления лабораторной деятельности (необязательно)"
          />
        </div>
      </div>
    </Modal>
  );
};

export default AddLaboratoryModal;
