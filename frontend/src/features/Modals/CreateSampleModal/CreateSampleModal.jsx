import React, { useState, useEffect, useRef } from 'react';
import { Input, Select, message, Spin } from 'antd';
import axios from 'axios';
import Modal from '../ui/Modal';
import './CreateSampleModal.css';

const { Option } = Select;

const CreateSampleModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    registration_number: '',
    test_object: '',
    protocol: null,
    laboratory: null,
    department: null,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [laboratories, setLaboratories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [protocols, setProtocols] = useState([]);
  const [laboratoriesLoading, setLaboratoriesLoading] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [protocolsLoading, setProtocolsLoading] = useState(false);
  const [protocolSearchValue, setProtocolSearchValue] = useState('');
  const [protocolsDropdownVisible, setProtocolsDropdownVisible] = useState(false);
  const protocolSearchRef = useRef(null);

  useEffect(() => {
    fetchLaboratories();
  }, []);

  useEffect(() => {
    if (formData.laboratory) {
      fetchDepartments(formData.laboratory);
      fetchProtocols(formData.laboratory, formData.department);
    } else {
      setDepartments([]);
      setProtocols([]);
      setFormData(prev => ({ ...prev, department: null, protocol: null }));
    }
  }, [formData.laboratory]);

  useEffect(() => {
    if (formData.laboratory && formData.department) {
      fetchProtocols(formData.laboratory, formData.department);
    }
  }, [formData.department]);

  useEffect(() => {
    const handleClickOutside = event => {
      if (protocolSearchRef.current && !protocolSearchRef.current.contains(event.target)) {
        setProtocolsDropdownVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
        `${import.meta.env.VITE_API_URL}/api/departments/by_laboratory/?laboratory_id=${laboratoryId}`
      );
      setDepartments(response.data.filter(dept => !dept.is_deleted));
    } catch (error) {
      console.error('Ошибка при загрузке подразделений:', error);
      message.error('Не удалось загрузить список подразделений');
      setDepartments([]);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const fetchProtocols = async (laboratoryId, departmentId = null, searchQuery = '') => {
    try {
      setProtocolsLoading(true);
      let url = `${import.meta.env.VITE_API_URL}/api/search-protocols/`;
      const params = {
        laboratory: laboratoryId,
        search: searchQuery,
      };
      if (departmentId) {
        params.department = departmentId;
      }
      const response = await axios.get(url, { params });
      setProtocols(response.data);
      if (searchQuery && searchQuery.length >= 1) {
        setProtocolsDropdownVisible(true);
      }
    } catch (error) {
      console.error('Ошибка при загрузке протоколов:', error);
      message.error('Не удалось загрузить список протоколов');
      setProtocols([]);
    } finally {
      setProtocolsLoading(false);
    }
  };

  const handleInputChange = field => e => {
    const value = e?.target ? e.target.value : e;

    if (field === 'laboratory') {
      setFormData(prev => ({
        ...prev,
        [field]: value,
        department: null,
        protocol: null,
      }));
    } else if (field === 'department') {
      setFormData(prev => ({
        ...prev,
        [field]: value,
        protocol: null,
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

  const handleProtocolSearch = value => {
    setProtocolSearchValue(value);
    if (formData.laboratory) {
      fetchProtocols(formData.laboratory, formData.department, value);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = ['registration_number', 'test_object', 'laboratory'];

    requiredFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = 'Это поле обязательно для заполнения';
      }
    });

    // Проверяем обязательность подразделения
    if (formData.laboratory && departments.length > 0 && !formData.department) {
      newErrors.department = 'В выбранной лаборатории необходимо указать подразделение';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    try {
      if (!validateForm()) {
        return;
      }

      setLoading(true);

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/samples/`, formData);

      message.success('Проба успешно создана');
      onSuccess();
    } catch (error) {
      console.error('Ошибка при создании пробы:', error);

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
        message.error('Произошла ошибка при создании пробы');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      header="Создание пробы"
      onClose={onClose}
      onSave={handleSave}
      loading={loading}
      style={{ width: '600px' }}
    >
      <div className="create-sample-form">
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

        {departments.length > 0 && (
          <div className="form-group">
            <label>
              Подразделение <span className="required">*</span>
            </label>
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
        )}

        <div className="form-group">
          <label>Протокол</label>
          <div className="search-container" ref={protocolSearchRef}>
            <Input
              value={protocolSearchValue}
              onChange={e => {
                const value = e.target.value;
                setProtocolSearchValue(value);
                handleProtocolSearch(value);
              }}
              onFocus={() => {
                if (protocolSearchValue && protocolSearchValue.length >= 1) {
                  setProtocolsDropdownVisible(true);
                }
              }}
              placeholder="Введите номер протокола"
              disabled={!formData.laboratory}
              status={errors.protocol ? 'error' : ''}
              style={{ width: '100%' }}
            />
            {protocolsDropdownVisible && protocols.length > 0 && (
              <div className="search-dropdown">
                {protocolsLoading ? (
                  <div className="search-loading">
                    <Spin size="small" />
                  </div>
                ) : (
                  protocols.map(protocol => (
                    <div
                      key={protocol.id}
                      className="search-option"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, protocol: protocol.id }));
                        setProtocolSearchValue(
                          protocol.test_protocol_number || 'Протокол без номера'
                        );
                        setProtocolsDropdownVisible(false);
                      }}
                    >
                      {protocol.test_protocol_number || 'Протокол без номера'}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          {errors.protocol && <div className="error-message">{errors.protocol}</div>}
        </div>
      </div>
    </Modal>
  );
};

export default CreateSampleModal;
