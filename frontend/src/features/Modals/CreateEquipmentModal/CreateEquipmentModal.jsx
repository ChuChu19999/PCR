import React, { useState, useEffect } from 'react';
import { Input, DatePicker, Select, message } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import locale from 'antd/es/date-picker/locale/ru_RU';
import Modal from '../ui/Modal';
import './CreateEquipmentModal.css';

const { Option } = Select;

const CreateEquipmentModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: undefined,
    serial_number: '',
    verification_info: '',
    verification_date: null,
    verification_end_date: null,
    version: 'v1',
    is_active: true,
    laboratory: null,
    department: null,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [laboratories, setLaboratories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [laboratoriesLoading, setLaboratoriesLoading] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);

  useEffect(() => {
    fetchLaboratories();
  }, []);

  useEffect(() => {
    if (formData.laboratory) {
      fetchDepartments(formData.laboratory);
    } else {
      setDepartments([]);
      setFormData(prev => ({ ...prev, department: null }));
    }
  }, [formData.laboratory]);

  const fetchLaboratories = async () => {
    try {
      setLaboratoriesLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/laboratories/`);
      setLaboratories(response.data.filter(lab => !lab.is_deleted));
    } catch (error) {
      console.error('Ошибка при загрузке лабораторий:', error);
      message.error('Не удалось загрузить список лабораторий');
    } finally {
      setLaboratoriesLoading(false);
    }
  };

  const fetchDepartments = async laboratoryId => {
    try {
      setDepartmentsLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/departments/?laboratory=${laboratoryId}`
      );
      setDepartments(
        response.data.filter(dept => !dept.is_deleted && dept.laboratory === laboratoryId)
      );
    } catch (error) {
      console.error('Ошибка при загрузке подразделений:', error);
      message.error('Не удалось загрузить список подразделений');
      setDepartments([]);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const handleInputChange = field => e => {
    const value = e?.target ? e.target.value : e;

    // Специальная обработка для дат
    if (field === 'verification_date' || field === 'verification_end_date') {
      setFormData(prev => ({
        ...prev,
        [field]: value ? dayjs(value) : null,
      }));
    } else if (field === 'laboratory') {
      // При смене лаборатории сбрасываем подразделение
      setFormData(prev => ({
        ...prev,
        [field]: value,
        department: null,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      'name',
      'type',
      'serial_number',
      'verification_info',
      'verification_date',
      'verification_end_date',
      'laboratory',
    ];

    requiredFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = 'Это поле обязательно для заполнения';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    try {
      if (!validateForm()) {
        return;
      }

      setLoading(true);

      const equipmentData = {
        name: formData.name,
        type: formData.type,
        serial_number: formData.serial_number,
        verification_info: formData.verification_info,
        verification_date: formData.verification_date?.format('YYYY-MM-DD'),
        verification_end_date: formData.verification_end_date?.format('YYYY-MM-DD'),
        version: 'v1',
        is_active: true,
        laboratory: formData.laboratory,
      };

      // Добавляем department только если он выбран
      if (formData.department) {
        equipmentData.department = formData.department;
      }

      console.log('Отправляемые данные в CreateEquipmentModal:', equipmentData);

      await axios.post(`${import.meta.env.VITE_API_URL}/api/equipment/`, equipmentData);

      message.success('Прибор успешно создан');
      onSuccess();
    } catch (error) {
      console.error('Ошибка при создании прибора:', error);

      if (error.response?.data) {
        const serverErrors = error.response.data;
        const newErrors = {};

        Object.keys(serverErrors).forEach(field => {
          if (Array.isArray(serverErrors[field])) {
            newErrors[field] = serverErrors[field][0];
          } else {
            newErrors[field] = serverErrors[field];
          }
        });

        setErrors(prev => ({ ...prev, ...newErrors }));

        if (Object.keys(newErrors).length === 0 && error.response?.data?.error) {
          message.error(error.response.data.error);
        }
      } else {
        message.error('Произошла ошибка при создании прибора');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      header="Создание прибора"
      onClose={onClose}
      onSave={handleSave}
      loading={loading}
      style={{ width: '600px' }}
    >
      <div className="create-equipment-form">
        <div className="form-group">
          <label>
            Наименование <span className="required">*</span>
          </label>
          <Input
            value={formData.name}
            onChange={handleInputChange('name')}
            placeholder="Введите наименование прибора"
            status={errors.name ? 'error' : ''}
            style={{ width: '100%' }}
          />
          {errors.name && <div className="error-message">{errors.name}</div>}
        </div>

        <div className="form-group">
          <label>
            Тип прибора <span className="required">*</span>
          </label>
          <Select
            value={formData.type}
            onChange={value => handleInputChange('type')(value)}
            placeholder="Выберите тип прибора"
            status={errors.type ? 'error' : ''}
            style={{ width: '100%' }}
          >
            <Option value="measuring_instrument">Средство измерения</Option>
            <Option value="test_equipment">Испытательное оборудование</Option>
          </Select>
          {errors.type && <div className="error-message">{errors.type}</div>}
        </div>

        <div className="form-group">
          <label>
            Заводской номер <span className="required">*</span>
          </label>
          <Input
            value={formData.serial_number}
            onChange={handleInputChange('serial_number')}
            placeholder="Введите заводской номер"
            status={errors.serial_number ? 'error' : ''}
            style={{ width: '100%' }}
          />
          {errors.serial_number && <div className="error-message">{errors.serial_number}</div>}
        </div>

        <div className="form-group">
          <label>
            Сведения о результатах поверки <span className="required">*</span>
          </label>
          <Input
            value={formData.verification_info}
            onChange={handleInputChange('verification_info')}
            placeholder="Введите сведения о поверке"
            status={errors.verification_info ? 'error' : ''}
            style={{ width: '100%' }}
          />
          {errors.verification_info && (
            <div className="error-message">{errors.verification_info}</div>
          )}
        </div>

        <div className="form-group">
          <label>
            Дата поверки <span className="required">*</span>
          </label>
          <DatePicker
            locale={locale}
            format="DD.MM.YYYY"
            value={formData.verification_date}
            onChange={value => handleInputChange('verification_date')(value)}
            placeholder="ДД.ММ.ГГГГ"
            style={{ width: '100%' }}
            status={errors.verification_date ? 'error' : ''}
            className="custom-date-picker"
            rootClassName="custom-date-picker-root"
            popupClassName="custom-date-picker-popup"
            inputReadOnly={false}
            showToday={false}
            allowClear={true}
            superNextIcon={null}
            superPrevIcon={null}
          />
          {errors.verification_date && (
            <div className="error-message">{errors.verification_date}</div>
          )}
        </div>

        <div className="form-group">
          <label>
            Дата окончания поверки <span className="required">*</span>
          </label>
          <DatePicker
            locale={locale}
            format="DD.MM.YYYY"
            value={formData.verification_end_date}
            onChange={value => handleInputChange('verification_end_date')(value)}
            placeholder="ДД.ММ.ГГГГ"
            style={{ width: '100%' }}
            status={errors.verification_end_date ? 'error' : ''}
            className="custom-date-picker"
            rootClassName="custom-date-picker-root"
            popupClassName="custom-date-picker-popup"
            inputReadOnly={false}
            showToday={false}
            allowClear={true}
            superNextIcon={null}
            superPrevIcon={null}
          />
          {errors.verification_end_date && (
            <div className="error-message">{errors.verification_end_date}</div>
          )}
        </div>

        <div className="form-group">
          <label>
            Лаборатория <span className="required">*</span>
          </label>
          <Select
            value={formData.laboratory}
            onChange={value => handleInputChange('laboratory')(value)}
            placeholder="Выберите лабораторию"
            loading={laboratoriesLoading}
            status={errors.laboratory ? 'error' : ''}
            style={{ width: '100%' }}
          >
            {laboratories.map(lab => (
              <Option key={lab.id} value={lab.id}>
                {lab.name}
              </Option>
            ))}
          </Select>
          {errors.laboratory && <div className="error-message">{errors.laboratory}</div>}
        </div>

        <div className="form-group">
          <label>Подразделение</label>
          <Select
            value={formData.department}
            onChange={value => handleInputChange('department')(value)}
            placeholder="Выберите подразделение"
            loading={departmentsLoading}
            disabled={!formData.laboratory}
            status={errors.department ? 'error' : ''}
            style={{ width: '100%' }}
          >
            {departments.map(dept => (
              <Option key={dept.id} value={dept.id}>
                {dept.name}
              </Option>
            ))}
          </Select>
          {errors.department && <div className="error-message">{errors.department}</div>}
        </div>
      </div>
    </Modal>
  );
};

export default CreateEquipmentModal;
