import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Input, message } from 'antd';
import axios from 'axios';
import './EditLaboratoryModal.css';

const EditLaboratoryModal = ({ isOpen, onClose, onSuccess, laboratory }) => {
  const [formData, setFormData] = useState({
    name: '',
    full_name: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (laboratory) {
      setFormData({
        name: laboratory.name || '',
        full_name: laboratory.full_name || '',
      });
      setErrors({});
    }
  }, [laboratory]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Аббревиатура обязательна для заполнения';
    }
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Полное название обязательно для заполнения';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = field => e => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
    // Очищаем ошибку поля при изменении
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleSave = async () => {
    try {
      if (!validateForm()) {
        message.error('Пожалуйста, заполните все обязательные поля');
        return;
      }

      await axios.patch(`${import.meta.env.VITE_API_URL}/api/laboratories/${laboratory.id}/`, {
        name: formData.name.trim(),
        full_name: formData.full_name.trim(),
      });

      message.success('Лаборатория успешно обновлена');
      onSuccess();
      onClose();

      // Сброс формы
      setFormData({
        name: '',
        full_name: '',
      });
      setErrors({});
    } catch (error) {
      console.error('Ошибка при обновлении лаборатории:', error);

      if (error.response?.data) {
        // Обработка ошибок валидации с сервера
        setErrors(error.response.data);
        message.error('Ошибка валидации данных');
      } else {
        message.error('Произошла ошибка при обновлении лаборатории');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      header="Редактирование лаборатории"
      onClose={onClose}
      onSave={handleSave}
      style={{ width: '550px' }}
    >
      <div className="edit-laboratory-form">
        <div className="form-group">
          <label>Аббревиатура</label>
          <Input
            value={formData.name}
            onChange={handleInputChange('name')}
            placeholder="Введите аббревиатуру"
            status={errors.name ? 'error' : ''}
            required
          />
          {errors.name && <div className="error-message">{errors.name}</div>}
        </div>
        <div className="form-group">
          <label>Полное название</label>
          <Input.TextArea
            value={formData.full_name}
            onChange={handleInputChange('full_name')}
            placeholder="Введите полное название"
            rows={3}
            status={errors.full_name ? 'error' : ''}
            required
          />
          {errors.full_name && <div className="error-message">{errors.full_name}</div>}
        </div>
      </div>
    </Modal>
  );
};

export default EditLaboratoryModal;
