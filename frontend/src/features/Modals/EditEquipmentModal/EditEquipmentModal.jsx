import React, { useState, useEffect } from 'react';
import { Input, DatePicker, Select, Button } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import locale from 'antd/es/date-picker/locale/ru_RU';
import Modal from '../ui/Modal';
import './EditEquipmentModal.css';

const { Option } = Select;

// Устанавливаем русскую локаль для dayjs
dayjs.locale('ru');

const EditEquipmentModal = ({ onClose, onSuccess, equipment, laboratoryId, departmentId }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: undefined,
    serial_number: '',
    verification_info: '',
    verification_date: null,
    verification_end_date: null,
  });

  const [errors, setErrors] = useState({});
  const [isConfirmDeleteModalVisible, setIsConfirmDeleteModalVisible] = useState(false);

  useEffect(() => {
    if (equipment) {
      setFormData({
        name: equipment.name,
        type: equipment.type,
        serial_number: equipment.serial_number,
        verification_info: equipment.verification_info,
        verification_date: equipment.verification_date ? dayjs(equipment.verification_date) : null,
        verification_end_date: equipment.verification_end_date
          ? dayjs(equipment.verification_end_date)
          : null,
      });
    }
  }, [equipment]);

  const handleInputChange = field => e => {
    const value = e?.target ? e.target.value : e;

    if (field === 'verification_date' || field === 'verification_end_date') {
      setFormData(prev => ({
        ...prev,
        [field]: value ? dayjs(value) : null,
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
    ];

    requiredFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = 'Это поле обязательно для заполнения';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const equipmentData = {
      name: formData.name,
      type: formData.type,
      serial_number: formData.serial_number,
      verification_info: formData.verification_info,
      verification_date: formData.verification_date?.format('YYYY-MM-DD'),
      verification_end_date: formData.verification_end_date?.format('YYYY-MM-DD'),
      laboratory: laboratoryId,
      department: departmentId,
    };

    onSuccess(equipmentData);
  };

  return (
    <Modal
      header="Редактирование прибора"
      onClose={onClose}
      onSave={handleSave}
      style={{ width: '600px' }}
      extraButtons={
        <Button danger onClick={() => setIsConfirmDeleteModalVisible(true)}>
          Удалить
        </Button>
      }
    >
      <div className="edit-equipment-form">
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
            allowClear={true}
            superNextIcon={null}
            superPrevIcon={null}
          />
          {errors.verification_end_date && (
            <div className="error-message">{errors.verification_end_date}</div>
          )}
        </div>
      </div>

      {isConfirmDeleteModalVisible && (
        <Modal
          header="Подтверждение удаления"
          onClose={() => setIsConfirmDeleteModalVisible(false)}
          onSave={() => {
            onSuccess({ delete: true, id: equipment.id });
            setIsConfirmDeleteModalVisible(false);
          }}
          saveButtonText="Подтвердить"
          style={{ width: '500px', margin: '0 auto', left: '50%' }}
        >
          <div className="delete-equipment-confirmation">
            <p className="confirmation-message">
              Вы уверены, что хотите удалить прибор "{equipment.name}"?
            </p>
          </div>
        </Modal>
      )}
    </Modal>
  );
};

export default EditEquipmentModal;
