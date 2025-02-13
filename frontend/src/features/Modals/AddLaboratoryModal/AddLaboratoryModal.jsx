import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Input } from 'antd';
import axios from 'axios';
import './AddLaboratoryModal.css';

const AddLaboratoryModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    full_name: '',
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
      });

      setFormData({
        name: '',
        full_name: '',
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
          <label>Аббревиатура</label>
          <Input
            value={formData.name}
            onChange={handleInputChange('name')}
            placeholder="Введите аббревиатуру"
            required
          />
        </div>
        <div className="form-group">
          <label>Полное название</label>
          <Input.TextArea
            value={formData.full_name}
            onChange={handleInputChange('full_name')}
            placeholder="Введите полное название"
            rows={3}
            required
          />
        </div>
      </div>
    </Modal>
  );
};

export default AddLaboratoryModal;
