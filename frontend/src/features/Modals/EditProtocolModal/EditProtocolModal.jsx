import React, { useState, useEffect, useRef } from 'react';
import { Input, DatePicker, Select, message, Spin, Table } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import locale from 'antd/es/date-picker/locale/ru_RU';
import Modal from '../ui/Modal';
import SelectionConditionsForm from '../CreateProtocolModal/SelectionConditionsForm';
import { protocolsApi } from '../../../shared/api/protocols';
import './EditProtocolModal.css';

const { Option } = Select;

// Устанавливаем русскую локаль для dayjs
dayjs.locale('ru');

// Компонент для отображения результатов расчетов одной пробы
const SampleCalculationsTable = ({ data, sampleNumber }) => {
  const columns = [
    {
      title: 'Метод',
      dataIndex: 'methodName',
      key: 'methodName',
      width: '15%',
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: '6%',
    },
    {
      title: 'Входные данные',
      dataIndex: 'inputData',
      key: 'inputData',
      width: '33%',
      render: inputData => {
        if (!inputData || inputData === '-') return '-';

        // Заменяем точки на запятые в числах
        const formattedText = inputData.replace(/(\d+)\.(\d+)/g, '$1,$2');

        return (
          <div
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: '1.5',
            }}
          >
            {formattedText}
          </div>
        );
      },
    },
    {
      title: 'Результат',
      dataIndex: 'result',
      key: 'result',
      width: '5%',
    },
    {
      title: 'Погр.',
      dataIndex: 'measurementError',
      key: 'measurementError',
      width: '5%',
    },
    {
      title: 'Приборы',
      dataIndex: 'equipment',
      key: 'equipment',
      width: '20%',
      render: equipment => {
        if (!equipment || equipment.length === 0) return '-';
        return (
          <div>
            {equipment.map((eq, index) => (
              <div key={index} className="equipment-item">
                <span className="equipment-name">{eq.name}</span>
                <span className="equipment-serial"> (Зав.№{eq.serial_number})</span>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      title: 'Исполнитель',
      dataIndex: 'executor',
      key: 'executor',
      width: '8%',
    },
  ];

  return (
    <div className="sample-calculations">
      <h3 className="sample-title">Проба №{sampleNumber}</h3>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        scroll={false}
        rowKey="key"
        size="small"
      />
    </div>
  );
};

const EditProtocolModal = ({ onClose, onSuccess, protocol, laboratoryId, departmentId }) => {
  const [formData, setFormData] = useState({
    test_protocol_number: protocol.test_protocol_number || '',
    test_protocol_date: protocol.test_protocol_date ? dayjs(protocol.test_protocol_date) : null,
    is_accredited: protocol.is_accredited || false,
    sampling_act_number: protocol.sampling_act_number || '',
    excel_template: protocol.excel_template,
    branch: protocol.branch || '',
    phone: protocol.phone || '',
    selection_conditions: null,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('calculations');
  const [isAnimating, setIsAnimating] = useState(false);

  const branchSearchRef = useRef(null);

  // Запрос на получение шаблонов
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['templates', laboratoryId, departmentId],
    queryFn: () => protocolsApi.getTemplates({ laboratoryId, departmentId }),
  });

  // Запрос на получение результатов расчетов
  const { data: calculations = [], isLoading: calculationsLoading } = useQuery({
    queryKey: ['calculations', protocol.id],
    queryFn: async () => {
      const data = await protocolsApi.getCalculations(protocol.id);
      console.log('Полученные данные расчетов:', data);
      return data.map(calc => {
        return {
          ...calc,
          key: `${calc.sampleNumber}-${calc.methodName}`,
        };
      });
    },
    enabled: !!protocol.id && activeTab === 'calculations',
  });

  useEffect(() => {
    if (protocol) {
      // Находим шаблон и его условия отбора
      let selectionConditions = null;
      if (templates.length > 0 && protocol.excel_template) {
        const selectedTemplate = templates.find(t => t.id === protocol.excel_template);
        if (selectedTemplate?.selection_conditions) {
          selectionConditions = selectedTemplate.selection_conditions.map(condition => ({
            ...condition,
            value: protocol.selection_conditions?.[condition.name] || null,
          }));
        }
      }

      // Устанавливаем все данные формы, включая условия отбора
      setFormData({
        ...protocol,
        test_protocol_date: protocol.test_protocol_date ? dayjs(protocol.test_protocol_date) : null,
        selection_conditions: selectionConditions,
      });
    }
  }, [protocol, templates]);

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

  const handleSave = async () => {
    try {
      setLoading(true);

      // Преобразуем массив условий отбора в объект
      const selectionConditionsObject = Array.isArray(formData.selection_conditions)
        ? formData.selection_conditions.reduce((acc, condition) => {
            acc[condition.name] = condition.value;
            return acc;
          }, {})
        : {};

      const protocolData = {
        test_protocol_number: formData.test_protocol_number,
        test_protocol_date: formData.test_protocol_date
          ? dayjs(formData.test_protocol_date).format('YYYY-MM-DD')
          : null,
        sampling_act_number: formData.sampling_act_number,
        excel_template: formData.excel_template,
        laboratory: laboratoryId,
        department: departmentId,
        branch: formData.branch,
        phone: formData.phone || '',
        selection_conditions: selectionConditionsObject,
        is_accredited: formData.is_accredited,
      };

      onSuccess(protocolData);
    } catch (error) {
      console.error('Ошибка при обновлении протокола:', error);
      if (error.response?.data?.error) {
        message.error(error.response.data.error);
      } else if (error.response?.data) {
        const serverErrors = error.response.data;
        const newErrors = {};

        Object.keys(serverErrors).forEach(field => {
          if (Array.isArray(serverErrors[field])) {
            newErrors[field] = serverErrors[field][0];
          } else {
            newErrors[field] = serverErrors[field];
          }
        });

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
          message.error('Ошибка валидации данных');
        }
      } else {
        message.error('Произошла ошибка при обновлении протокола');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateProtocol = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const blob = await protocolsApi.generateProtocolExcel(protocol.id);

      // Создаем ссылку для скачивания файла
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;

      // Формируем имя файла на основе данных протокола
      let filename;
      if (formData.is_accredited && formData.test_protocol_date) {
        const date = dayjs(formData.test_protocol_date).format('DD.MM.YYYY');
        filename = `Протокол_${formData.test_protocol_number}_от_${date}.xlsx`;
      } else {
        filename = `Протокол_${formData.test_protocol_number}.xlsx`;
      }

      // Очищаем имя файла от недопустимых символов
      filename = filename.replace(/[^\wа-яА-Я\s\.\-_]/g, '');

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success('Протокол успешно сформирован');
    } catch (error) {
      console.error('Ошибка при формировании протокола:', error);
      setError('Произошла ошибка при формировании протокола');
    } finally {
      setIsGenerating(false);
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

  const handleTabChange = tab => {
    if (tab !== activeTab) {
      setIsAnimating(true);
      setTimeout(() => {
        setActiveTab(tab);
        setTimeout(() => {
          setIsAnimating(false);
        }, 50);
      }, 300);
    }
  };

  // Группировка результатов по пробам
  const groupedCalculations = React.useMemo(() => {
    console.log('Группировка расчетов. Входные данные:', calculations);
    if (!calculations || calculations.length === 0) return {};

    const grouped = calculations.reduce((acc, calc) => {
      const sampleNumber = calc.sampleNumber;
      if (!acc[sampleNumber]) {
        acc[sampleNumber] = [];
      }
      acc[sampleNumber].push({
        ...calc,
        key: `${calc.sampleNumber}-${calc.methodName}`,
      });
      return acc;
    }, {});

    console.log('Сгруппированные расчеты:', grouped);
    return grouped;
  }, [calculations]);

  const calculationColumns = [
    {
      title: 'Номер пробы',
      dataIndex: 'sampleNumber',
      key: 'sampleNumber',
      width: '8%',
    },
    {
      title: 'Метод',
      dataIndex: 'methodName',
      key: 'methodName',
      width: '15%',
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: '6%',
    },
    {
      title: 'Входные данные',
      dataIndex: 'inputData',
      key: 'inputData',
      width: '33%',
      render: inputData => {
        if (!inputData || inputData === '-') return '-';

        // Заменяем точки на запятые в числах
        const formattedText = inputData.replace(/(\d+)\.(\d+)/g, '$1,$2');

        return (
          <div
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: '1.5',
            }}
          >
            {formattedText}
          </div>
        );
      },
    },
    {
      title: 'Результат',
      dataIndex: 'result',
      key: 'result',
      width: '5%',
    },
    {
      title: 'Погр.',
      dataIndex: 'measurementError',
      key: 'measurementError',
      width: '5%',
    },
    {
      title: 'Приборы',
      dataIndex: 'equipment',
      key: 'equipment',
      width: '20%',
      render: equipment => {
        if (!equipment || equipment.length === 0) return '-';
        return (
          <div>
            {equipment.map((eq, index) => (
              <div key={index} className="equipment-item">
                <span className="equipment-name">{eq.name}</span>
                <span className="equipment-serial"> (Зав.№{eq.serial_number})</span>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      title: 'Исполнитель',
      dataIndex: 'executor',
      key: 'executor',
      width: '8%',
    },
  ];

  return (
    <Modal
      header="Редактирование протокола"
      onClose={onClose}
      onSave={handleSave}
      loading={loading}
      onGenerate={handleGenerateProtocol}
      generateLoading={isGenerating}
      style={{ width: activeTab === 'calculations' ? '900px' : '600px' }}
    >
      <div className="edit-protocol-form">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'calculations' ? 'active' : ''}`}
            onClick={() => handleTabChange('calculations')}
            type="button"
          >
            Результаты расчетов
          </button>
          <button
            className={`tab ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => handleTabChange('edit')}
            type="button"
          >
            Редактирование
          </button>
        </div>

        <div className={`tab-content ${isAnimating ? 'entering' : ''}`}>
          {activeTab === 'calculations' ? (
            <div className="calculations-container">
              {calculationsLoading ? (
                <div className="loading-state">
                  <Spin size="large" />
                  <p>Загрузка результатов...</p>
                </div>
              ) : Object.entries(groupedCalculations).length === 0 ? (
                <div className="no-data-message">Нет данных для отображения</div>
              ) : (
                Object.entries(groupedCalculations).map(([sampleNumber, sampleData]) => (
                  <SampleCalculationsTable
                    key={sampleNumber}
                    sampleNumber={sampleNumber}
                    data={sampleData}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="edit-protocol-form">
              <div className="form-group">
                <label>Номер протокола испытаний</label>
                <Input
                  value={formData.test_protocol_number}
                  onChange={handleInputChange('test_protocol_number')}
                  placeholder="Введите номер протокола испытаний"
                  status={errors.test_protocol_number ? 'error' : ''}
                  style={{ width: '100%' }}
                />
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
                <label>Номер акта отбора</label>
                <Input
                  value={formData.sampling_act_number}
                  placeholder="Введите номер акта отбора"
                  disabled
                  style={{ width: '100%', background: '#f5f5f5' }}
                />
              </div>

              <div className="form-group">
                <label>Филиал</label>
                <div className="search-container" ref={branchSearchRef}>
                  <Input
                    value={formData.branch}
                    onChange={handleInputChange('branch')}
                    placeholder="Введите название филиала"
                    style={{ width: '100%' }}
                  />
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
                <label>Шаблон протокола</label>
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
                {errors.excel_template && (
                  <div className="error-message">{errors.excel_template}</div>
                )}
              </div>

              {formData.excel_template && (
                <SelectionConditionsForm
                  conditions={formData.selection_conditions}
                  onChange={handleSelectionConditionsChange}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default EditProtocolModal;
