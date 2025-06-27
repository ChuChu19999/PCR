import React, { useState, useRef } from 'react';
import { Input, DatePicker, Select, message, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import locale from 'antd/es/date-picker/locale/ru_RU';
import Modal from '../ui/Modal';
import SelectionConditionsForm from './SelectionConditionsForm';
import { protocolsApi } from '../../../shared/api/protocols';
import './CreateProtocolModal.css';

const { Option } = Select;

// Устанавливаем русскую локаль для dayjs
dayjs.locale('ru');

const CreateProtocolModal = ({ onClose, onSuccess, laboratoryId, departmentId }) => {
  const [formData, setFormData] = useState({
    test_protocol_number: '',
    test_protocol_date: null,
    is_accredited: false,
    laboratory_location: '',
    sampling_act_number: '',
    excel_template: undefined,
    branch: '',
    phone: '',
    selection_conditions: null,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [branchSearchValue, setBranchSearchValue] = useState('');
  const [branchesDropdownVisible, setBranchesDropdownVisible] = useState(false);

  const branchSearchRef = useRef(null);

  // Запрос на получение шаблонов
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['templates', laboratoryId, departmentId],
    queryFn: () => protocolsApi.getTemplates({ laboratoryId, departmentId }),
  });

  // Запрос на поиск филиалов
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['branches', branchSearchValue],
    queryFn: () => protocolsApi.searchBranches(branchSearchValue),
    enabled: branchSearchValue.length >= 2,
  });

  const handleInputChange = field => e => {
    const value = e?.target ? e.target.value : e;

    if (field === 'test_protocol_date') {
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
    const requiredFields = ['sampling_act_number', 'excel_template'];

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

      const protocolData = {
        test_protocol_number: formData.test_protocol_number,
        test_protocol_date: formData.test_protocol_date
          ? formData.test_protocol_date.format('YYYY-MM-DD')
          : null,
        laboratory_location: formData.laboratory_location,
        sampling_act_number: formData.sampling_act_number,
        excel_template: formData.excel_template,
        laboratory: laboratoryId,
        department: departmentId,
        branch: formData.branch,
        phone: formData.phone || '',
        selection_conditions:
          formData.selection_conditions?.reduce((acc, condition) => {
            acc[condition.name] = condition.value;
            return acc;
          }, {}) || {},
        is_accredited: formData.is_accredited,
      };

      onSuccess(protocolData);
    } catch (error) {
      console.error('Ошибка при создании протокола:', error);

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
        message.error('Произошла ошибка при создании протокола');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = async value => {
    try {
      const selectedTemplate = templates.find(t => t.id === value);
      if (selectedTemplate && selectedTemplate.selection_conditions) {
        // Добавляем поле value к каждому условию
        const conditionsWithValues = selectedTemplate.selection_conditions.map(condition => ({
          ...condition,
          value: null,
        }));
        setFormData(prev => ({
          ...prev,
          excel_template: value,
          selection_conditions: conditionsWithValues,
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          excel_template: value,
          selection_conditions: null,
        }));
      }
    } catch (error) {
      console.error('Ошибка при получении условий отбора:', error);
      message.error('Не удалось загрузить условия отбора');
    }
  };

  const handleSelectionConditionsChange = conditions => {
    setFormData(prev => ({
      ...prev,
      selection_conditions: conditions,
    }));
  };

  return (
    <Modal
      header="Создание протокола"
      onClose={onClose}
      onSave={handleSave}
      loading={loading}
      style={{ width: '600px' }}
    >
      <div className="create-protocol-form">
        <div className="form-group">
          <label>Номер протокола испытаний</label>
          <Input
            value={formData.test_protocol_number}
            onChange={handleInputChange('test_protocol_number')}
            placeholder="Введите номер протокола испытаний"
            status={errors.test_protocol_number ? 'error' : ''}
            style={{ width: '100%' }}
          />
          {errors.test_protocol_number && (
            <div className="error-message">{errors.test_protocol_number}</div>
          )}
        </div>

        <div className="form-group">
          <label>Дата протокола испытаний</label>
          <DatePicker
            format="DD.MM.YYYY"
            value={formData.test_protocol_date ? dayjs(formData.test_protocol_date) : null}
            onChange={value => handleInputChange('test_protocol_date')(value)}
            placeholder="ДД.ММ.ГГГГ"
            style={{ width: '100%' }}
            status={errors.test_protocol_date ? 'error' : ''}
            locale={locale}
            className="custom-date-picker"
            rootClassName="custom-date-picker-root"
            popupClassName="custom-date-picker-popup"
            inputReadOnly={false}
            allowClear={true}
            superNextIcon={null}
            superPrevIcon={null}
          />
          {errors.test_protocol_date && (
            <div className="error-message">{errors.test_protocol_date}</div>
          )}
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.is_accredited}
              onChange={e => handleInputChange('is_accredited')(e.target.checked)}
            />
            <span>Аккредитован</span>
          </label>
        </div>

        <div className="form-group">
          <label>
            Номер акта отбора <span className="required">*</span>
          </label>
          <Input
            value={formData.sampling_act_number}
            onChange={handleInputChange('sampling_act_number')}
            placeholder="Введите номер акта отбора"
            status={errors.sampling_act_number ? 'error' : ''}
            style={{ width: '100%' }}
          />
          {errors.sampling_act_number && (
            <div className="error-message">{errors.sampling_act_number}</div>
          )}
        </div>

        <div className="form-group">
          <label>Филиал</label>
          <div className="search-container" ref={branchSearchRef}>
            <Input
              value={branchSearchValue}
              onChange={e => {
                const value = e.target.value;
                setBranchSearchValue(value);
                setFormData(prev => ({ ...prev, branch: value }));
              }}
              onFocus={() => {
                if (branchSearchValue && branchSearchValue.length >= 2) {
                  setBranchesDropdownVisible(true);
                }
              }}
              placeholder="Введите название филиала"
              style={{ width: '100%' }}
            />
            {branchesDropdownVisible && branches.length > 0 && (
              <div className="search-dropdown">
                {branchesLoading ? (
                  <div className="search-loading">
                    <Spin size="small" />
                  </div>
                ) : (
                  branches.map((branch, index) => (
                    <div
                      key={index}
                      className="search-option"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, branch }));
                        setBranchSearchValue(branch);
                        setBranchesDropdownVisible(false);
                      }}
                    >
                      {branch}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Телефон</label>
          <Input
            value={formData.phone}
            onChange={handleInputChange('phone')}
            placeholder="Введите контактный телефон"
            style={{ width: '100%' }}
          />
        </div>

        <div className="form-group">
          <label>Место осуществления лабораторной деятельности</label>
          <Input
            value={formData.laboratory_location}
            onChange={handleInputChange('laboratory_location')}
            placeholder="Введите место осуществления лабораторной деятельности"
            style={{ width: '100%' }}
          />
        </div>

        <div className="form-group">
          <label>
            Шаблон протокола <span className="required">*</span>
          </label>
          <Select
            value={formData.excel_template}
            onChange={handleTemplateChange}
            placeholder="Выберите шаблон протокола"
            loading={templatesLoading}
            status={errors.excel_template ? 'error' : ''}
            style={{ width: '100%' }}
          >
            {templates.map(template => (
              <Option
                key={template.id}
                value={template.id}
                style={{
                  color: template.is_active ? 'inherit' : '#999',
                  fontStyle: template.is_active ? 'normal' : 'italic',
                }}
              >
                {template.name} - {template.version}
                {!template.is_active && ' (архивная версия)'}
              </Option>
            ))}
          </Select>
          {errors.excel_template && <div className="error-message">{errors.excel_template}</div>}
        </div>

        {formData.excel_template && (
          <SelectionConditionsForm
            conditions={formData.selection_conditions}
            onChange={handleSelectionConditionsChange}
          />
        )}
      </div>
    </Modal>
  );
};

export default CreateProtocolModal;
