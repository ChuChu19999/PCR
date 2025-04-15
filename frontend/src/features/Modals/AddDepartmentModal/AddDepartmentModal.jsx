import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Input } from 'antd';
import axios from 'axios';
import './AddDepartmentModal.css';

const AddDepartmentModal = ({ isOpen, onClose, onSuccess, laboratoryId }) => {
  const [formData, setFormData] = useState({
    name: '',
    laboratory: laboratoryId,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleInputChange = field => e => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
    // Очищаем ошибки при изменении поля
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Название обязательно';
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

      await axios.post(`${import.meta.env.VITE_API_URL}/api/departments/`, {
        name: formData.name.trim(),
        laboratory: laboratoryId,
      });

      setFormData({
        name: '',
        laboratory: laboratoryId,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Ошибка при создании подразделения:', error);
      if (error.response?.data) {
        // Проверяем наличие ошибки о дублировании имени
        if (error.response.data.name?.[0]?.includes('уже существует')) {
          setErrors({
            name: error.response.data.name[0],
          });
        } else {
          setErrors({
            general:
              error.response.data.detail ||
              error.response.data.error ||
              'Подразделение с таким именем уже существует',
          });
        }
      } else {
        setErrors({
          general: 'Произошла ошибка при создании подразделения',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      header="Добавление подразделения"
      onClose={onClose}
      onSave={handleSave}
      style={{ width: '550px' }}
      loading={loading}
    >
      <div className="add-department-form">
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

export default AddDepartmentModal;
