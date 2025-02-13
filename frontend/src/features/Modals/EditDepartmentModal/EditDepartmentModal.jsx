import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Input, message } from 'antd';
import axios from 'axios';
import './EditDepartmentModal.css';

const EditDepartmentModal = ({ isOpen, onClose, onSuccess, department }) => {
  const [formData, setFormData] = useState({
    name: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name || '',
      });
      setErrors({});
    }
  }, [department]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Название подразделения обязательно для заполнения';
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

      await axios.patch(`${import.meta.env.VITE_API_URL}/api/departments/${department.id}/`, {
        name: formData.name.trim(),
      });

      message.success('Подразделение успешно обновлено');
      onSuccess();
      onClose();

      // Сброс формы
      setFormData({
        name: '',
      });
      setErrors({});
    } catch (error) {
      console.error('Ошибка при обновлении подразделения:', error);

      if (error.response?.data) {
        // Обработка ошибок валидации с сервера
        setErrors(error.response.data);
        message.error('Ошибка валидации данных');
      } else {
        message.error('Произошла ошибка при обновлении подразделения');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      header="Редактирование подразделения"
      onClose={onClose}
      onSave={handleSave}
      style={{ width: '550px' }}
    >
      <div className="edit-department-form">
        <div className="form-group">
          <label>Название подразделения</label>
          <Input
            value={formData.name}
            onChange={handleInputChange('name')}
            placeholder="Введите название подразделения"
            status={errors.name ? 'error' : ''}
            required
          />
          {errors.name && <div className="error-message">{errors.name}</div>}
        </div>
        {errors.general && <div className="error-message general-error">{errors.general}</div>}
      </div>
    </Modal>
  );
};

export default EditDepartmentModal;
