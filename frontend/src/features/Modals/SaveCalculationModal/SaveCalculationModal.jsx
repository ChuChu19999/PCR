import React, { useState, useEffect } from 'react';
import { Input, Button, DatePicker, Select, message, Switch, Spin } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import locale from 'antd/es/date-picker/locale/ru_RU';
import Modal from '../ui/Modal';
import './SaveCalculationModal.css';

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

const SaveCalculationModal = ({
  isOpen,
  onClose,
  calculationResult,
  currentMethod,
  laboratoryId,
  departmentId,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    test_protocol_number: '',
    test_object: '',
    laboratory_location: '',
    selectedBranch: '',
    sampling_location_detail: '',
    sampling_act_number: '',
    registration_number: '',
    sampling_date: null,
    receiving_date: null,
    excel_template: undefined,
    phone: '',
  });

  const [calculationFormData, setCalculationFormData] = useState({
    executor: '',
  });

  const [useExistingProtocol, setUseExistingProtocol] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [protocols, setProtocols] = useState([]);
  const [protocolsLoading, setProtocolsLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [searchValue, setSearchValue] = useState('');
  const [samplingLocations, setSamplingLocations] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, laboratoryId, departmentId]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleProtocolDetailsChange = field => value => {
    if (!useExistingProtocol) {
      if (field === 'branch') {
        setFormData(prev => ({
          ...prev,
          selectedBranch: value,
          protocol_details_id: null,
        }));

        if (errors.protocol_details?.branch) {
          setErrors(prev => ({
            ...prev,
            protocol_details: {
              ...prev.protocol_details,
              branch: '',
            },
          }));
        }
      } else if (field === 'sampling_location_detail') {
        const selectedLocation = samplingLocations.find(
          loc => loc.sampling_location_detail === value
        );
        if (selectedLocation) {
          setFormData(prev => ({
            ...prev,
            protocol_details_id: selectedLocation.id,
          }));
        }

        if (errors.protocol_details?.sampling_location_detail) {
          setErrors(prev => ({
            ...prev,
            protocol_details: {
              ...prev.protocol_details,
              sampling_location_detail: '',
            },
          }));
        }
      }
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/excel-templates/`);
      const allTemplates = response.data.filter(template => template.is_active);
      console.log('Все активные шаблоны:', allTemplates);

      // Фильтруем шаблоны по лаборатории и подразделению
      const filteredTemplates = allTemplates.filter(template => {
        // Приводим значения к числам для корректного сравнения
        const templateLab = Number(template.laboratory);
        const templateDept = template.department ? Number(template.department) : null;
        const lab = Number(laboratoryId);
        const dept = departmentId ? Number(departmentId) : null;

        const matchesLaboratory = templateLab === lab;
        if (dept) {
          return matchesLaboratory && templateDept === dept;
        }
        return matchesLaboratory && !templateDept;
      });
      console.log('Отфильтрованные шаблоны:', filteredTemplates, {
        laboratoryId: Number(laboratoryId),
        departmentId: departmentId ? Number(departmentId) : null,
      });

      // Сортируем шаблоны по имени и версии
      const sortedTemplates = filteredTemplates.sort((a, b) => {
        if (a.name !== b.name) {
          return a.name.localeCompare(b.name);
        }
        // Извлекаем номер версии и сравниваем как числа
        const versionA = parseInt(a.version.replace('v', ''));
        const versionB = parseInt(b.version.replace('v', ''));
        return versionB - versionA; // Сортировка по убыванию версии
      });
      console.log('Отсортированные шаблоны:', sortedTemplates);

      setTemplates(sortedTemplates);
    } catch (error) {
      console.error('Ошибка при загрузке шаблонов:', error);
      message.error('Не удалось загрузить список шаблонов');
    }
  };

  const searchProtocols = async searchText => {
    if (!searchText) {
      setProtocols([]);
      return;
    }

    setProtocolsLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/protocols/?search=${searchText}&laboratory=${laboratoryId}${departmentId ? `&department=${departmentId}` : ''}`
      );
      // Фильтруем протоколы, чтобы искать только по регистрационному номеру
      const filteredProtocols = response.data.filter(protocol =>
        protocol.registration_number.toLowerCase().includes(searchText.toLowerCase())
      );
      setProtocols(filteredProtocols);
    } catch (error) {
      console.error('Ошибка при поиске протоколов:', error);
      message.error('Не удалось загрузить список протоколов');
    } finally {
      setProtocolsLoading(false);
    }
  };

  const handleProtocolSelect = async protocolId => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/protocols/${protocolId}/`
      );
      const protocol = response.data;
      setSelectedProtocol(protocol);
      setFormData({
        test_protocol_number: protocol.test_protocol_number,
        test_object: protocol.test_object || 'дегазированный конденсат',
        laboratory_location: protocol.laboratory_location || '',
        protocol_details_id: protocol.protocol_details_id,
        sampling_act_number: protocol.sampling_act_number,
        registration_number: protocol.registration_number,
        sampling_date: dayjs(protocol.sampling_date),
        receiving_date: dayjs(protocol.receiving_date),
        excel_template: protocol.excel_template,
        phone: protocol.phone || '',
      });
    } catch (error) {
      console.error('Ошибка при загрузке протокола:', error);
      message.error('Не удалось загрузить данные протокола');
    }
  };

  const handleInputChange = field => value => {
    if (!useExistingProtocol) {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
      // Очищаем ошибки при изменении поля
      if (errors[field]) {
        setErrors(prev => ({
          ...prev,
          [field]: '',
        }));
      }
    }
  };

  const validate = () => {
    if (useExistingProtocol && !selectedProtocol) {
      setErrors({ protocol: 'Выберите протокол' });
      return false;
    }

    const newErrors = {};

    if (!calculationFormData.executor) {
      newErrors.executor = 'Введите ФИО исполнителя расчета';
    }

    if (!useExistingProtocol) {
      if (!formData.sampling_act_number) {
        newErrors.sampling_act_number = 'Введите номер акта отбора';
      }
      if (!formData.registration_number) {
        newErrors.registration_number = 'Введите регистрационный номер';
      }
      if (!formData.test_object) {
        newErrors.test_object = 'Введите объект испытаний';
      }
      if (!formData.excel_template) {
        newErrors.excel_template = 'Выберите шаблон протокола';
      }
      if (!formData.selectedBranch) {
        newErrors.branch = 'Выберите филиал';
      }
      if (!formData.sampling_location_detail) {
        newErrors.sampling_location_detail = 'Введите место отбора пробы';
      }
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

      let protocolId;

      if (useExistingProtocol) {
        protocolId = selectedProtocol.id;
      } else {
        // Создаем протокол
        const protocolData = {
          test_protocol_number: formData.test_protocol_number,
          test_object: formData.test_object || 'дегазированный конденсат',
          laboratory_location: formData.laboratory_location,
          branch: formData.selectedBranch,
          sampling_location_detail: formData.sampling_location_detail,
          phone: formData.phone || '',
          sampling_act_number: formData.sampling_act_number,
          registration_number: formData.registration_number,
          sampling_date: formData.sampling_date?.format('YYYY-MM-DD'),
          receiving_date: formData.receiving_date?.format('YYYY-MM-DD'),
          excel_template: formData.excel_template,
          laboratory: laboratoryId,
          department: departmentId || null,
        };

        const protocolResponse = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/protocols/`,
          protocolData
        );
        protocolId = protocolResponse.data.id;
      }

      // Затем создаем расчет
      const calculationData = {
        protocol_id: protocolId,
        input_data: calculationResult.input_data,
        result:
          calculationResult.convergence &&
          ['Неудовлетворительно', 'Следы', 'Отсутствие'].includes(calculationResult.convergence)
            ? calculationResult.convergence
            : calculationResult.result,
        measurement_error: calculationResult.measurement_error || '-',
        unit: currentMethod.unit,
        laboratory: laboratoryId,
        department: departmentId,
        research_method: currentMethod.id,
        executor: calculationFormData.executor,
        laboratory_activity_date: calculationResult.laboratory_activity_date
          ? dayjs.isDayjs(calculationResult.laboratory_activity_date)
            ? calculationResult.laboratory_activity_date.format('YYYY-MM-DD')
            : dayjs(calculationResult.laboratory_activity_date).format('YYYY-MM-DD')
          : null,
      };

      if (!calculationData.laboratory_activity_date) {
        setErrors({
          general: 'Необходимо указать дату лабораторной деятельности',
        });
        return;
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/save-calculation/`,
        calculationData
      );

      onSuccess(response.data);
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      if (error.response?.data) {
        // Проверяем наличие ошибки регистрационного номера
        if (error.response.data.registration_number) {
          setErrors(prev => ({
            ...prev,
            registration_number: error.response.data.registration_number[0],
          }));
          // Прокручиваем страницу к полю с ошибкой
          const registrationNumberField = document.querySelector('[name="registration_number"]');
          if (registrationNumberField) {
            registrationNumberField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }
      }

      setErrors({
        general:
          error.response?.data?.detail ||
          error.response?.data?.error ||
          'Произошла ошибка при сохранении результата расчета',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setSelectedProtocol(null);
    setUseExistingProtocol(false);
    setErrors({});
    onClose();
  };

  return isOpen ? (
    <Modal
      header="Сохранение результата расчета"
      onClose={handleModalClose}
      onSave={handleSave}
      loading={loading}
      style={{ width: '600px' }}
    >
      <div className="save-calculation-form">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <Switch
            checked={useExistingProtocol}
            onChange={checked => {
              setUseExistingProtocol(checked);
              setSelectedProtocol(null);
              if (!checked) {
                setFormData({
                  test_protocol_number: '',
                  test_object: '',
                  laboratory_location: '',
                  selectedBranch: '',
                  sampling_location_detail: '',
                  sampling_act_number: '',
                  registration_number: '',
                  sampling_date: null,
                  receiving_date: null,
                  excel_template: undefined,
                  phone: '',
                });
                setErrors({});
              }
            }}
          />
          <span style={{ marginLeft: '8px' }}>Использовать существующий протокол</span>
        </div>

        <div className="form-group">
          <label>
            ФИО исполнителя расчета <span className="required">*</span>
          </label>
          <Input
            value={calculationFormData.executor}
            onChange={e => setCalculationFormData(prev => ({ ...prev, executor: e.target.value }))}
            placeholder="Введите ФИО исполнителя"
            status={errors.executor ? 'error' : ''}
            required
            style={{ width: '100%' }}
          />
          {errors.executor && <div className="error-message">{errors.executor}</div>}
        </div>

        {useExistingProtocol ? (
          <div className="form-group">
            <label>Регистрационный номер протокола</label>
            <div className="protocol-search-container">
              <Input
                value={searchValue}
                placeholder="Введите регистрационный номер"
                onChange={e => {
                  const value = e.target.value;
                  setSearchValue(value);
                  searchProtocols(value);
                  if (selectedProtocol) {
                    setSelectedProtocol(null);
                  }
                }}
                className="protocol-search"
                style={{ width: '100%' }}
              />
              {protocols.length > 0 && !selectedProtocol && (
                <div className="protocol-dropdown">
                  {protocolsLoading ? (
                    <div className="protocol-loading">
                      <Spin size="small" />
                    </div>
                  ) : (
                    protocols.map(protocol => (
                      <div
                        key={protocol.id}
                        className="protocol-option"
                        onClick={() => {
                          handleProtocolSelect(protocol.id);
                          setSearchValue(protocol.registration_number);
                        }}
                      >
                        {protocol.registration_number}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            {errors.protocol && <div className="error-message">{errors.protocol}</div>}
          </div>
        ) : null}

        {/* Отображаем информацию о выбранном протоколе */}
        {selectedProtocol && (
          <div className="selected-protocol-info">
            <div className="info-row">
              <span className="info-label">Номер протокола:</span>
              <span className="info-value">{selectedProtocol.test_protocol_number}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Номер акта отбора:</span>
              <span className="info-value">{selectedProtocol.sampling_act_number}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Дата отбора:</span>
              <span className="info-value">
                {dayjs(selectedProtocol.sampling_date).format('DD.MM.YYYY')}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Дата получения:</span>
              <span className="info-value">
                {dayjs(selectedProtocol.receiving_date).format('DD.MM.YYYY')}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Исполнитель:</span>
              <span className="info-value">{selectedProtocol.executor}</span>
            </div>
          </div>
        )}

        {!useExistingProtocol && (
          <>
            <div className="form-group">
              <label>Номер протокола испытаний</label>
              <Input
                value={formData.test_protocol_number}
                onChange={e => handleInputChange('test_protocol_number')(e.target.value)}
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
                onChange={e => handleInputChange('sampling_act_number')(e.target.value)}
                placeholder="Введите номер акта отбора"
                status={errors.sampling_act_number ? 'error' : ''}
                required
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
                name="registration_number"
                value={formData.registration_number}
                onChange={e => handleInputChange('registration_number')(e.target.value)}
                placeholder="Введите регистрационный номер"
                status={errors.registration_number ? 'error' : ''}
                required
                style={{ width: '100%' }}
              />
              {errors.registration_number && (
                <div className="error-message">{errors.registration_number}</div>
              )}
            </div>

            <div className="form-group">
              <label>Филиал</label>
              <Input
                value={formData.selectedBranch}
                onChange={e => handleInputChange('selectedBranch')(e.target.value)}
                placeholder="Введите филиал"
                status={errors.branch ? 'error' : ''}
                style={{ width: '100%' }}
              />
              {errors.branch && <div className="error-message">{errors.branch}</div>}
            </div>

            <div className="form-group">
              <label>Место отбора пробы</label>
              <Input
                value={formData.sampling_location_detail}
                onChange={e => handleInputChange('sampling_location_detail')(e.target.value)}
                placeholder="Введите место отбора пробы"
                status={errors.sampling_location_detail ? 'error' : ''}
                style={{ width: '100%' }}
              />
              {errors.sampling_location_detail && (
                <div className="error-message">{errors.sampling_location_detail}</div>
              )}
            </div>

            <div className="form-group">
              <label>Телефон</label>
              <Input
                value={formData.phone}
                onChange={e => handleInputChange('phone')(e.target.value)}
                placeholder="Введите номер телефона"
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label>Место осуществления лабораторной деятельности</label>
              <Input
                value={formData.laboratory_location}
                onChange={e => handleInputChange('laboratory_location')(e.target.value)}
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
                  const newDotsBeforeCursor = (
                    formatted.slice(0, cursorPosition).match(/\./g) || []
                  ).length;
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
                  const newDotsBeforeCursor = (
                    formatted.slice(0, cursorPosition).match(/\./g) || []
                  ).length;
                  const newPosition = cursorPosition + (newDotsBeforeCursor - dotsBeforeCursor);
                  input.setSelectionRange(newPosition, newPosition);

                  if (formatted.length === 10 && isValidDate(formatted)) {
                    handleInputChange('receiving_date')(dayjs(formatted, 'DD.MM.YYYY'));
                  }
                }}
              />
              {errors.receiving_date && (
                <div className="error-message">{errors.receiving_date}</div>
              )}
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
                required
              >
                {templates.map(template => (
                  <Option key={template.id} value={template.id}>
                    {template.name} - {template.version}
                  </Option>
                ))}
              </Select>
              {errors.excel_template && (
                <div className="error-message">{errors.excel_template}</div>
              )}
            </div>
          </>
        )}

        {errors.general && <div className="error-message general-error">{errors.general}</div>}
      </div>
    </Modal>
  ) : null;
};

export default SaveCalculationModal;
