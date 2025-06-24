import React, { useState, useEffect, useRef } from 'react';
import { Input, Select, message, Spin, DatePicker } from 'antd';
import axios from 'axios';
import Modal from '../ui/Modal';
import './CreateSampleModal.css';
import dayjs from 'dayjs';

const { Option } = Select;

const CreateSampleModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    registration_number: '',
    test_object: '',
    protocol: null,
    laboratory: null,
    department: null,
    sampling_location_detail: '',
    sampling_date: null,
    receiving_date: null,
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
  const [locationSearchValue, setLocationSearchValue] = useState('');
  const [locationsDropdownVisible, setLocationsDropdownVisible] = useState(false);
  const locationSearchRef = useRef(null);
  const [samplingLocations, setSamplingLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locale] = useState(dayjs.locale());

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

  useEffect(() => {
    const handleClickOutside = event => {
      if (locationSearchRef.current && !locationSearchRef.current.contains(event.target)) {
        setLocationsDropdownVisible(false);
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

  const searchLocations = async query => {
    try {
      setLocationsLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/get-sampling-locations/`,
        {
          params: {
            search: query,
            laboratory: formData.laboratory,
            department: formData.department,
          },
        }
      );
      setSamplingLocations(response.data);
    } catch (error) {
      console.error('Ошибка при поиске места отбора пробы:', error);
      message.error('Не удалось найти место отбора пробы');
      setSamplingLocations([]);
    } finally {
      setLocationsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!validateForm()) {
        return;
      }

      setLoading(true);

      const sampleData = {
        registration_number: formData.registration_number,
        test_object: formData.test_object,
        sampling_location_detail: formData.sampling_location_detail,
        sampling_date: formData.sampling_date ? formData.sampling_date.format('YYYY-MM-DD') : null,
        receiving_date: formData.receiving_date
          ? formData.receiving_date.format('YYYY-MM-DD')
          : null,
        laboratory: formData.laboratory,
        department: formData.department,
      };

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/samples/`, sampleData);

      message.success('Проба успешно создана');
      onSuccess();
    } catch (error) {
      console.error('Ошибка при создании пробы:', error);
      message.error(error.response?.data?.detail || 'Не удалось создать пробу');
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
            style={{ width: '100%' }}
          >
            <Option value="дегазированный конденсат">дегазированный конденсат</Option>
            <Option value="нефть">нефть</Option>
          </Select>
          {errors.test_object && <div className="error-message">{errors.test_object}</div>}
        </div>

        <div className="form-group">
          <label>Место отбора пробы</label>
          <div className="search-container" ref={locationSearchRef}>
            <Input
              value={locationSearchValue}
              onChange={e => {
                const value = e.target.value;
                setLocationSearchValue(value);
                setFormData(prev => ({ ...prev, sampling_location_detail: value }));
                if (value.length >= 2) {
                  searchLocations(value);
                  setLocationsDropdownVisible(true);
                } else {
                  setLocationsDropdownVisible(false);
                }
              }}
              onFocus={() => {
                if (locationSearchValue && locationSearchValue.length >= 2) {
                  searchLocations(locationSearchValue);
                  setLocationsDropdownVisible(true);
                }
              }}
              placeholder="Введите место отбора пробы"
              style={{ width: '100%' }}
            />
            {locationsDropdownVisible && samplingLocations.length > 0 && (
              <div className="search-dropdown">
                {locationsLoading ? (
                  <div className="search-loading">
                    <Spin size="small" />
                  </div>
                ) : (
                  samplingLocations.map((location, index) => (
                    <div
                      key={index}
                      className="search-option"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, sampling_location_detail: location }));
                        setLocationSearchValue(location);
                        setLocationsDropdownVisible(false);
                      }}
                    >
                      {location}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Дата отбора пробы</label>
          <DatePicker
            locale={locale}
            format="DD.MM.YYYY"
            value={formData.sampling_date ? dayjs(formData.sampling_date) : null}
            onChange={value => handleInputChange('sampling_date')(value)}
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
          />
          {errors.sampling_date && <div className="error-message">{errors.sampling_date}</div>}
        </div>

        <div className="form-group">
          <label>Дата получения пробы</label>
          <DatePicker
            locale={locale}
            format="DD.MM.YYYY"
            value={formData.receiving_date ? dayjs(formData.receiving_date) : null}
            onChange={value => handleInputChange('receiving_date')(value)}
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
          />
          {errors.receiving_date && <div className="error-message">{errors.receiving_date}</div>}
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
                        setProtocolSearchValue(protocol.test_protocol_number);
                        setProtocolsDropdownVisible(false);
                      }}
                    >
                      {protocol.test_protocol_number}
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
