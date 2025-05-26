import React, { useState, useEffect } from 'react';
import { Input, DatePicker, Select, message, Switch } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import locale from 'antd/es/date-picker/locale/ru_RU';
import Modal from '../ui/Modal';
import './CreateProtocolModal.css';

const { Option } = Select;

// Функция для форматирования ввода даты
const formatDateInput = value => {
  // Убираем все нецифровые символы
  const numbers = value.replace(/\D/g, '');

  // Ограничиваем длину до 8 цифр
  const limitedNumbers = numbers.slice(0, 8);

  // Форматируем в ДД.ММ.ГГГГ
  if (limitedNumbers.length <= 2) return limitedNumbers;
  if (limitedNumbers.length <= 4) return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2)}`;
  return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 4)}.${limitedNumbers.slice(4)}`;
};

// Функция для валидации даты
const isValidDate = dateString => {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) return false;

  const [day, month, year] = dateString.split('.').map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getDate() === day &&
    date.getMonth() === month - 1 &&
    date.getFullYear() === year &&
    year >= 1900 &&
    year <= 2100
  );
};

const CreateProtocolModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    test_protocol_number: '',
    test_object: '',
    laboratory_location: '',
    sampling_act_number: '',
    registration_number: '',
    sampling_date: null,
    receiving_date: null,
    excel_template: undefined,
    protocol_details_id: null,
    branch: '',
    sampling_location_detail: '',
    phone: '',
    laboratory: null,
    department: null,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [templates, setTemplates] = useState([]);
  const [branches, setBranches] = useState([]);
  const [samplingLocations, setSamplingLocations] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [laboratories, setLaboratories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [laboratoriesLoading, setLaboratoriesLoading] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);

  useEffect(() => {
    fetchLaboratories();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (formData.laboratory) {
      fetchDepartments(formData.laboratory);
    } else {
      setDepartments([]);
      setFormData(prev => ({ ...prev, department: null }));
    }
  }, [formData.laboratory]);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/excel-templates/`);
      setTemplates(response.data.filter(template => template.is_active));
    } catch (error) {
      console.error('Ошибка при загрузке шаблонов:', error);
      message.error('Не удалось загрузить список шаблонов');
    }
  };

  const fetchLaboratories = async () => {
    try {
      setLaboratoriesLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/laboratories/`);
      setLaboratories(response.data);
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
        `${import.meta.env.VITE_API_URL}/api/departments/by_laboratory/?laboratory_id=${laboratoryId}`
      );
      setDepartments(Array.isArray(response.data) ? response.data : []);
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
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleProtocolDetailsChange = field => value => {
    if (field === 'branch') {
      setFormData(prev => ({
        ...prev,
        selectedBranch: value,
        protocol_details_id: null,
        phone: '',
      }));
    } else if (field === 'sampling_location_detail') {
      const selectedLocation = samplingLocations.find(
        loc => loc.sampling_location_detail === value
      );
      if (selectedLocation) {
        setFormData(prev => ({
          ...prev,
          protocol_details_id: selectedLocation.id,
          phone: selectedLocation.phone || '',
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      'sampling_act_number',
      'registration_number',
      'test_object',
      'excel_template',
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
      console.log('Текущее состояние формы:', formData);

      const protocolData = {
        test_protocol_number: formData.test_protocol_number,
        test_object: formData.test_object || 'дегазированный конденсат',
        laboratory_location: formData.laboratory_location,
        sampling_act_number: formData.sampling_act_number,
        registration_number: formData.registration_number,
        sampling_date: formData.sampling_date?.format('YYYY-MM-DD'),
        receiving_date: formData.receiving_date?.format('YYYY-MM-DD'),
        excel_template: formData.excel_template,
        laboratory: formData.laboratory,
        department: formData.department,
        branch: formData.branch,
        sampling_location_detail: formData.sampling_location_detail,
        phone: formData.phone || '',
      };

      console.log('Данные для отправки на сервер:', protocolData);

      if (!validateForm()) {
        console.log('Ошибки валидации:', errors);
        return;
      }

      setLoading(true);

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/protocols/`,
        protocolData
      );

      message.success('Протокол успешно создан');
      onSuccess();
    } catch (error) {
      console.error('Ошибка при создании протокола:', error);

      // Обработка ошибок валидации с сервера
      if (error.response?.data) {
        const serverErrors = error.response.data;
        const newErrors = {};

        // Обрабатываем ошибки для каждого поля
        Object.keys(serverErrors).forEach(field => {
          if (Array.isArray(serverErrors[field])) {
            newErrors[field] = serverErrors[field][0];
          } else {
            newErrors[field] = serverErrors[field];
          }
        });

        // Устанавливаем ошибки в состояние формы
        setErrors(prev => ({ ...prev, ...newErrors }));

        // Если есть конкретная ошибка для поля, не показываем общее сообщение
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
          <label>
            Регистрационный номер <span className="required">*</span>
          </label>
          <Input
            value={formData.registration_number}
            onChange={handleInputChange('registration_number')}
            placeholder="Введите регистрационный номер"
            status={errors.registration_number ? 'error' : ''}
            style={{ width: '100%' }}
          />
          {errors.registration_number && (
            <div className="error-message">{errors.registration_number}</div>
          )}
        </div>

        <div className="form-group">
          <label>Филиал</label>
          <Input
            value={formData.branch}
            onChange={handleInputChange('branch')}
            placeholder="Введите название филиала"
            style={{ width: '100%' }}
          />
        </div>

        <div className="form-group">
          <label>Место отбора пробы</label>
          <Input
            value={formData.sampling_location_detail}
            onChange={handleInputChange('sampling_location_detail')}
            placeholder="Введите место отбора пробы"
            style={{ width: '100%' }}
          />
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
            Объект испытаний <span className="required">*</span>
          </label>
          <Select
            value={formData.test_object}
            onChange={value => handleInputChange('test_object')(value)}
            placeholder="Выберите объект испытаний"
            status={errors.test_object ? 'error' : ''}
            style={{ width: '100%' }}
          >
            <Option value="дегазированный конденсат">дегазированный конденсат</Option>
            <Option value="нефть">нефть</Option>
          </Select>
          {errors.test_object && <div className="error-message">{errors.test_object}</div>}
        </div>

        <div className="form-group">
          <label>Дата отбора пробы</label>
          <DatePicker
            locale={locale}
            format="DD.MM.YYYY"
            value={formData.sampling_date}
            onChange={handleInputChange('sampling_date')}
            placeholder="ДД.ММ.ГГГГ"
            style={{ width: '100%' }}
            status={errors.sampling_date ? 'error' : ''}
            className="custom-date-picker"
            rootClassName="custom-date-picker-root"
            popupClassName="custom-date-picker-popup"
            inputReadOnly={false}
            showToday={false}
            allowClear={true}
            superNextIcon={null}
            superPrevIcon={null}
            onKeyDown={e => {
              // Разрешаем цифры, точки, backspace и delete
              if (!/[\d\.]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete') {
                e.preventDefault();
              }
            }}
            onInput={e => {
              const input = e.target;
              const cursorPosition = input.selectionStart;
              const formatted = formatDateInput(input.value);

              const dotsBeforeCursor = (input.value.slice(0, cursorPosition).match(/\./g) || [])
                .length;
              input.value = formatted;
              const newDotsBeforeCursor = (formatted.slice(0, cursorPosition).match(/\./g) || [])
                .length;
              const newPosition = cursorPosition + (newDotsBeforeCursor - dotsBeforeCursor);
              input.setSelectionRange(newPosition, newPosition);

              if (formatted.length === 10 && isValidDate(formatted)) {
                handleInputChange('sampling_date')(dayjs(formatted, 'DD.MM.YYYY'));
              }
            }}
          />
          {errors.sampling_date && <div className="error-message">{errors.sampling_date}</div>}
        </div>

        <div className="form-group">
          <label>Дата получения пробы</label>
          <DatePicker
            locale={locale}
            format="DD.MM.YYYY"
            value={formData.receiving_date}
            onChange={handleInputChange('receiving_date')}
            placeholder="ДД.ММ.ГГГГ"
            style={{ width: '100%' }}
            status={errors.receiving_date ? 'error' : ''}
            className="custom-date-picker"
            rootClassName="custom-date-picker-root"
            popupClassName="custom-date-picker-popup"
            inputReadOnly={false}
            showToday={false}
            allowClear={true}
            superNextIcon={null}
            superPrevIcon={null}
            onKeyDown={e => {
              // Разрешаем цифры, точки, backspace и delete
              if (!/[\d\.]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete') {
                e.preventDefault();
              }
            }}
            onInput={e => {
              const input = e.target;
              const cursorPosition = input.selectionStart;
              const formatted = formatDateInput(input.value);

              const dotsBeforeCursor = (input.value.slice(0, cursorPosition).match(/\./g) || [])
                .length;
              input.value = formatted;
              const newDotsBeforeCursor = (formatted.slice(0, cursorPosition).match(/\./g) || [])
                .length;
              const newPosition = cursorPosition + (newDotsBeforeCursor - dotsBeforeCursor);
              input.setSelectionRange(newPosition, newPosition);

              if (formatted.length === 10 && isValidDate(formatted)) {
                handleInputChange('receiving_date')(dayjs(formatted, 'DD.MM.YYYY'));
              }
            }}
          />
          {errors.receiving_date && <div className="error-message">{errors.receiving_date}</div>}
        </div>

        <div className="form-group">
          <label>
            Шаблон протокола <span className="required">*</span>
          </label>
          <Select
            value={formData.excel_template}
            onChange={handleInputChange('excel_template')}
            placeholder="Выберите шаблон протокола"
            status={errors.excel_template ? 'error' : ''}
            style={{ width: '100%' }}
          >
            {templates.map(template => (
              <Option key={template.id} value={template.id}>
                {template.name} - {template.version}
              </Option>
            ))}
          </Select>
          {errors.excel_template && <div className="error-message">{errors.excel_template}</div>}
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
            {Array.isArray(departments) &&
              departments.map(dept => (
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

export default CreateProtocolModal;
