import React, { useState, useRef, useEffect } from 'react';
import { Input, Select, message, Spin, DatePicker } from 'antd';
import axios from 'axios';
import Modal from '../ui/Modal';
import './CreateSampleModal.css';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import locale from 'antd/es/date-picker/locale/ru_RU';

const { Option } = Select;

// Устанавливаем русскую локаль для dayjs
dayjs.locale('ru');

const CreateSampleModal = ({ onClose, onSuccess, laboratoryId, departmentId }) => {
  const [formData, setFormData] = useState({
    registration_number: '',
    test_object: '',
    protocol: null,
    sampling_location_detail: '',
    sampling_date: null,
    receiving_date: null,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [protocolsLoading, setProtocolsLoading] = useState(false);
  const [protocols, setProtocols] = useState([]);
  const [protocolSearchValue, setProtocolSearchValue] = useState('');
  const [protocolsDropdownVisible, setProtocolsDropdownVisible] = useState(false);
  const protocolSearchRef = useRef(null);
  const [locationSearchValue, setLocationSearchValue] = useState('');
  const [locationsDropdownVisible, setLocationsDropdownVisible] = useState(false);
  const locationSearchRef = useRef(null);
  const [samplingLocations, setSamplingLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);

  useEffect(() => {
    const handleClickOutside = event => {
      if (protocolSearchRef.current && !protocolSearchRef.current.contains(event.target)) {
        setProtocolsDropdownVisible(false);
      }
      if (locationSearchRef.current && !locationSearchRef.current.contains(event.target)) {
        setLocationsDropdownVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = ['registration_number', 'test_object'];

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

      const dataToSend = {
        ...formData,
        laboratory: laboratoryId,
        department: departmentId,
        sampling_date: formData.sampling_date
          ? dayjs(formData.sampling_date).format('YYYY-MM-DD')
          : null,
        receiving_date: formData.receiving_date
          ? dayjs(formData.receiving_date).format('YYYY-MM-DD')
          : null,
      };

      await axios.post(`${import.meta.env.VITE_API_URL}/api/samples/`, dataToSend);

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

  const fetchProtocols = async (searchValue = '') => {
    try {
      setProtocolsLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/protocols/`, {
        params: {
          search: searchValue,
          laboratory: laboratoryId,
          department: departmentId,
        },
      });
      setProtocols(response.data);
      setProtocolsDropdownVisible(true);
    } catch (error) {
      console.error('Ошибка при загрузке протоколов:', error);
      message.error('Не удалось загрузить список протоколов');
    } finally {
      setProtocolsLoading(false);
    }
  };

  const searchLocations = async query => {
    try {
      setLocationsLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/get-sampling-locations/`,
        {
          params: {
            search: query,
            laboratory: laboratoryId,
            department: departmentId,
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
          <label>Протокол</label>
          <div className="search-container" ref={protocolSearchRef}>
            <Input
              value={protocolSearchValue}
              onChange={e => {
                const value = e.target.value;
                setProtocolSearchValue(value);
                fetchProtocols(value);
              }}
              onFocus={() => {
                if (protocolSearchValue && protocolSearchValue.length >= 1) {
                  setProtocolsDropdownVisible(true);
                }
              }}
              placeholder="Введите номер протокола"
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

        <div className="form-group">
          <label>Дата отбора пробы</label>
          <DatePicker
            format="DD.MM.YYYY"
            value={formData.sampling_date ? dayjs(formData.sampling_date) : null}
            onChange={value => handleInputChange('sampling_date')(value)}
            placeholder="ДД.ММ.ГГГГ"
            style={{ width: '100%' }}
            status={errors.sampling_date ? 'error' : ''}
            locale={locale}
            className="custom-date-picker"
            rootClassName="custom-date-picker-root"
            popupClassName="custom-date-picker-popup"
            inputReadOnly={false}
            allowClear={true}
            superNextIcon={null}
            superPrevIcon={null}
          />
          {errors.sampling_date && <div className="error-message">{errors.sampling_date}</div>}
        </div>

        <div className="form-group">
          <label>Дата получения пробы</label>
          <DatePicker
            format="DD.MM.YYYY"
            value={formData.receiving_date ? dayjs(formData.receiving_date) : null}
            onChange={value => handleInputChange('receiving_date')(value)}
            placeholder="ДД.ММ.ГГГГ"
            style={{ width: '100%' }}
            status={errors.receiving_date ? 'error' : ''}
            locale={locale}
            className="custom-date-picker"
            rootClassName="custom-date-picker-root"
            popupClassName="custom-date-picker-popup"
            inputReadOnly={false}
            allowClear={true}
            superNextIcon={null}
            superPrevIcon={null}
          />
          {errors.receiving_date && <div className="error-message">{errors.receiving_date}</div>}
        </div>
      </div>
    </Modal>
  );
};

export default CreateSampleModal;
