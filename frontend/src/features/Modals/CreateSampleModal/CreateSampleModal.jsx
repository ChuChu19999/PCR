import React, { useState, useRef, useEffect } from 'react';
import { Input, Select, message, Spin, DatePicker } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import locale from 'antd/es/date-picker/locale/ru_RU';
import Modal from '../ui/Modal';
import { samplesApi } from '../../../shared/api/samples';
import { protocolsApi } from '../../../shared/api/protocols';
import './CreateSampleModal.css';

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

  const [errors, setErrors] = useState({});
  const [protocolSearchValue, setProtocolSearchValue] = useState('');
  const [protocolsDropdownVisible, setProtocolsDropdownVisible] = useState(false);
  const protocolSearchRef = useRef(null);
  const [locationSearchValue, setLocationSearchValue] = useState('');
  const [locationsDropdownVisible, setLocationsDropdownVisible] = useState(false);
  const locationSearchRef = useRef(null);

  // Запрос на получение протоколов
  const { data: protocols = [], isLoading: protocolsLoading } = useQuery({
    queryKey: ['protocols', protocolSearchValue, laboratoryId, departmentId],
    queryFn: () =>
      protocolsApi.getProtocols({
        laboratoryId,
        departmentId,
        search: protocolSearchValue,
      }),
    enabled: protocolSearchValue.length > 0,
  });

  // Запрос на получение мест отбора проб
  const { data: samplingLocations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['samplingLocations', locationSearchValue, laboratoryId, departmentId],
    queryFn: () =>
      samplesApi.getSamplingLocations({
        searchText: locationSearchValue,
        laboratoryId,
        departmentId,
      }),
    enabled: locationSearchValue.length >= 2,
  });

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
    if (!validateForm()) {
      return;
    }

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

    onSuccess(dataToSend);
  };

  return (
    <Modal header="Создание пробы" onClose={onClose} onSave={handleSave} style={{ width: '600px' }}>
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
                  setLocationsDropdownVisible(true);
                } else {
                  setLocationsDropdownVisible(false);
                }
              }}
              onFocus={() => {
                if (locationSearchValue && locationSearchValue.length >= 2) {
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
                if (value.length >= 1) {
                  setProtocolsDropdownVisible(true);
                } else {
                  setProtocolsDropdownVisible(false);
                }
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
