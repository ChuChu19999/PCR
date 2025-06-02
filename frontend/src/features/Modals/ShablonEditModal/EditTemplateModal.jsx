import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Button } from '../../../shared/ui/Button/Button';
import { Upload, message, Spin, Select, Input } from 'antd';
import {
  InboxOutlined,
  FileTextOutlined,
  PlusOutlined,
  FileExcelOutlined,
  DeleteOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  NumberOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import ExcelEditor from './ExcelEditor';
import SelectionConditionsEditor from './SelectionConditionsEditor';
import './EditTemplateModal.css';

const { Dragger } = Upload;
const { Option } = Select;

const SECTIONS = [
  {
    id: 'header',
    name: 'Шапка',
    description: 'Редактирование шапки протокола',
    icon: <FileTextOutlined />,
  },
  {
    id: 'selection_conditions',
    name: 'Условия отбора',
    description: 'Настройка условий отбора проб',
    icon: <SettingOutlined />,
  },
  {
    id: 'accreditation',
    name: 'Аккредитация',
    description: 'Настройка строки шапки аккредитации',
    icon: <SettingOutlined />,
  },
  // Другие секции
];

const EditTemplateModal = ({ isOpen, onClose }) => {
  const [selectedType, setSelectedType] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [excelData, setExcelData] = useState(null);
  const [cellStyles, setCellStyles] = useState({});
  const [templates, setTemplates] = useState([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [laboratories, setLaboratories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedLaboratory, setSelectedLaboratory] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [accreditationHeaderRow, setAccreditationHeaderRow] = useState('');

  // Загрузка списка шаблонов при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadLaboratories();
    }
  }, [isOpen]);

  // Загрузка списка подразделений при выборе лаборатории
  useEffect(() => {
    if (selectedLaboratory) {
      loadDepartments(selectedLaboratory);
    } else {
      setDepartments([]);
      setSelectedDepartment(null);
    }
  }, [selectedLaboratory]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/excel-templates/`);
      // Фильтруем только активные шаблоны и сортируем по имени
      const activeTemplates = response.data
        .filter(template => template.is_active)
        .sort((a, b) => a.name.localeCompare(b.name));
      setTemplates(activeTemplates);
    } catch (error) {
      console.error('Ошибка при загрузке списка шаблонов:', error);
      message.error('Не удалось загрузить список шаблонов');
    } finally {
      setLoading(false);
    }
  };

  const loadLaboratories = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/laboratories/`);
      setLaboratories(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке списка лабораторий:', error);
      message.error('Не удалось загрузить список лабораторий');
    }
  };

  const loadDepartments = async laboratoryId => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/departments/by_laboratory/`,
        {
          params: { laboratory_id: laboratoryId },
        }
      );
      setDepartments(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке списка подразделений:', error);
      message.error('Не удалось загрузить список подразделений');
    }
  };

  useEffect(() => {
    if (isOpen && selectedType) {
      console.log('Проверка активного шаблона:', { isOpen, selectedType });
      checkActiveTemplate(selectedType);
    }
  }, [isOpen, selectedType]);

  const checkActiveTemplate = async type => {
    try {
      console.log('Начало проверки шаблона:', type);
      setLoading(true);
      // Если у нас уже есть activeTemplate, используем его
      if (activeTemplate) {
        return;
      }

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/excel-templates/`, {
        params: { name: type },
      });
      console.log('Ответ от сервера:', response.data);

      if (
        typeof response.data === 'object' &&
        Array.isArray(response.data) &&
        response.data.length > 0
      ) {
        // Находим шаблон с точным совпадением имени и активным статусом
        const matchingTemplate = response.data.find(
          template => template.name === type && template.is_active
        );

        if (matchingTemplate) {
          console.log('Найден активный шаблон:', matchingTemplate);
          setActiveTemplate(matchingTemplate);
        } else {
          console.log('Активный шаблон с именем', type, 'не найден');
          setActiveTemplate(null);
        }
      } else {
        console.log('Активный шаблон не найден');
        setActiveTemplate(null);
      }
    } catch (error) {
      console.error('Ошибка при проверке активного шаблона:', error);
      message.error('Ошибка при проверке активного шаблона');
      setActiveTemplate(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async file => {
    if (!selectedType) {
      message.error('Выберите тип шаблона');
      return false;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', selectedType);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/excel-templates/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setActiveTemplate(response.data);
      message.success('Файл успешно загружен');
      return false;
    } catch (error) {
      console.error('Ошибка при загрузке файла:', error);
      message.error('Ошибка при загрузке файла');
      return false;
    }
  };

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx',
    beforeUpload: handleUpload,
    showUploadList: false,
  };

  const handleTypeChange = value => {
    if (value === 'new') {
      setIsCreatingNew(true);
      setSelectedType(null);
      setIsSelectOpen(false);
      setActiveTemplate(null);
    } else {
      setIsCreatingNew(false);
      const selectedTemplate = templates.find(template => template.id === value);
      if (selectedTemplate) {
        setSelectedType(selectedTemplate.name);
        setActiveTemplate(selectedTemplate);
      }
    }
  };

  const handleCreateNewTemplate = async () => {
    if (!newTemplateName.trim()) {
      message.error('Введите название шаблона');
      return;
    }

    if (!selectedFile) {
      message.error('Выберите файл шаблона');
      return;
    }

    if (!selectedLaboratory) {
      message.error('Выберите лабораторию');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('name', newTemplateName.trim());
    formData.append('laboratory', selectedLaboratory);
    if (selectedDepartment) {
      formData.append('department', selectedDepartment);
    }

    console.log('Отправляемые данные при создании шаблона:');
    console.log('- Название шаблона:', newTemplateName.trim());
    console.log('- ID лаборатории:', selectedLaboratory);
    console.log('- ID подразделения:', selectedDepartment || 'не выбрано');
    console.log('- Файл:', selectedFile);

    console.log('FormData содержит:');
    for (let pair of formData.entries()) {
      console.log(pair[0] + ':', pair[1]);
    }

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/excel-templates/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setActiveTemplate(response.data);
      setSelectedType(newTemplateName.trim());
      setIsCreatingNew(false);
      setNewTemplateName('');
      setSelectedFile(null);
      setSelectedLaboratory(null);
      setSelectedDepartment(null);
      message.success('Шаблон успешно создан');
      loadTemplates();
    } catch (error) {
      console.error('Ошибка при создании шаблона:', error);
      message.error('Ошибка при создании шаблона');
    }
  };

  const handleFileSelect = file => {
    setSelectedFile(file);
    return false; // Предотвращаем автоматическую загрузку
  };

  const handleDataChange = async (newData, newTemplateId, styles = null) => {
    console.log('handleDataChange:', { newData, newTemplateId, styles });

    if (selectedSection.id === 'selection_conditions') {
      setExcelData(newData);
      return;
    }

    setExcelData(newData);
    if (styles !== null) {
      console.log('Обновление стилей:', styles);
      setCellStyles(styles);
    }
    if (newTemplateId) {
      console.log('Обновление activeTemplate с новым ID:', newTemplateId);
      setActiveTemplate(prev => {
        const updated = {
          ...prev,
          id: newTemplateId,
        };
        console.log('Обновленный activeTemplate:', updated);
        return updated;
      });
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (selectedSection.id === 'accreditation' && activeTemplate) {
        const headerRow = parseInt(accreditationHeaderRow);
        if (isNaN(headerRow) || headerRow < 1) {
          message.error('Введите корректный номер строки (положительное целое число)');
          return;
        }

        const response = await axios.patch(
          `${import.meta.env.VITE_API_URL}/api/excel-templates/${activeTemplate.id}/update_accreditation_header_row/`,
          { accreditation_header_row: headerRow }
        );

        // Обновляем текущий шаблон без изменения версии
        setActiveTemplate(response.data);
        message.success('Номер строки шапки аккредитации успешно сохранен');
        onClose();
        return;
      }

      if (isCreatingNew) {
        if (!newTemplateName.trim()) {
          message.error('Введите название шаблона');
          return;
        }

        if (!selectedFile) {
          message.error('Выберите файл шаблона');
          return;
        }

        if (!selectedLaboratory) {
          message.error('Выберите лабораторию');
          return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('name', newTemplateName.trim());
        formData.append('laboratory', selectedLaboratory);
        if (selectedDepartment) {
          formData.append('department', selectedDepartment);
        }

        console.log('Отправляемые данные при создании шаблона:');
        console.log('- Название шаблона:', newTemplateName.trim());
        console.log('- ID лаборатории:', selectedLaboratory);
        console.log('- ID подразделения:', selectedDepartment || 'не выбрано');
        console.log('- Файл:', selectedFile);

        console.log('FormData содержит:');
        for (let pair of formData.entries()) {
          console.log(pair[0] + ':', pair[1]);
        }

        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/excel-templates/`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        setActiveTemplate(response.data);
        setSelectedType(newTemplateName.trim());
        setIsCreatingNew(false);
        setNewTemplateName('');
        setSelectedFile(null);
        setSelectedLaboratory(null);
        setSelectedDepartment(null);
        message.success('Шаблон успешно создан');
        loadTemplates();
        onClose();
        return;
      }

      if (selectedSection.id === 'selection_conditions') {
        try {
          console.log('=== Отправка условий отбора на сервер ===');
          console.log('Отправляемые данные:', excelData);

          const response = await axios.patch(
            `${import.meta.env.VITE_API_URL}/api/excel-templates/${activeTemplate.id}/update_selection_conditions/`,
            { selection_conditions: excelData.selection_conditions }
          );

          setActiveTemplate(response.data);
          message.success('Условия отбора успешно обновлены');
          onClose();
          return;
        } catch (error) {
          console.error('Ошибка при обновлении условий отбора:', error);
          console.error('Детали ошибки:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
          });
          message.error('Не удалось обновить условия отбора');
          return;
        }
      }

      console.log('Отправляемые данные при обновлении шаблона:', {
        data: excelData,
        styles: cellStyles,
        type: selectedType,
        section: selectedSection?.id,
        templateId: activeTemplate?.id,
      });

      const formData = new FormData();
      formData.append('data', JSON.stringify(excelData));
      formData.append('styles', JSON.stringify(cellStyles));
      formData.append('template_id', activeTemplate.id);
      formData.append('section', selectedSection.id);

      console.log('FormData при обновлении содержит:');
      for (let pair of formData.entries()) {
        console.log(pair[0] + ':', pair[1]);
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/save-excel/`,
        formData
      );
      console.log('Ответ сервера при сохранении:', response.data);

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      // Обновляем templateId на новую версию
      if (response.data.template_id) {
        handleDataChange(excelData, response.data.template_id);
      }

      message.success('Изменения сохранены');
      onClose();
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      message.error('Ошибка при сохранении изменений');
    } finally {
      setLoading(false);
    }
  };

  const handleSectionSelect = section => {
    console.log('Выбрана секция:', section);
    setSelectedSection(section);
    if (section.id === 'accreditation' && activeTemplate) {
      console.log('Загрузка данных аккредитации:', activeTemplate);
      setAccreditationHeaderRow(activeTemplate.accreditation_header_row?.toString() || '');
    }
  };

  const handleBackToSections = () => {
    setSelectedSection(null);
  };

  console.log('Текущее состояние:', { selectedType, activeTemplate, loading, selectedSection });

  if (!isOpen) return null;

  return (
    <Modal
      header={isCreatingNew ? 'Создание нового шаблона' : 'Редактирование шаблона'}
      onClose={() => {
        setIsCreatingNew(false);
        setNewTemplateName('');
        setSelectedFile(null);
        setSelectedLaboratory(null);
        setSelectedDepartment(null);
        setSelectedType(null);
        setActiveTemplate(null);
        setIsSelectOpen(false);
        onClose();
      }}
      onSave={handleSave}
      style={{ width: '1025px' }}
    >
      <div className="template-modal-content">
        <div className="template-select">
          <Select
            placeholder="Выберите тип шаблона"
            onChange={handleTypeChange}
            value={selectedType}
            style={{ width: '100%', marginBottom: 24 }}
            open={isSelectOpen}
            onDropdownVisibleChange={setIsSelectOpen}
            dropdownRender={menu => (
              <>
                {menu}
                <div className="select-dropdown-divider" />
                <div
                  className="select-dropdown-item"
                  onClick={() => {
                    handleTypeChange('new');
                    setIsSelectOpen(false);
                  }}
                >
                  <PlusOutlined /> Создать новый шаблон
                </div>
              </>
            )}
          >
            {templates.map(template => (
              <Option key={template.id} value={template.id}>
                {template.name} - {template.version}
              </Option>
            ))}
          </Select>
        </div>

        {isCreatingNew ? (
          <div className="new-template-form">
            <div className="form-section">
              <div className="form-group">
                <label className="form-label">Название шаблона</label>
                <Input
                  placeholder="Введите название шаблона"
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  className="template-name-input"
                  size="large"
                  style={{ height: '40px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Лаборатория</label>
                <Select
                  placeholder="Выберите лабораторию"
                  value={selectedLaboratory}
                  onChange={value => {
                    setSelectedLaboratory(value);
                    setSelectedDepartment(null);
                    if (value) {
                      loadDepartments(value);
                    } else {
                      setDepartments([]);
                    }
                  }}
                  className="template-select-input"
                  style={{ width: '100%' }}
                >
                  {laboratories.map(lab => (
                    <Option key={lab.id} value={lab.id}>
                      {lab.name}
                    </Option>
                  ))}
                </Select>
              </div>

              <div className="form-group">
                <label className="form-label">Подразделение (необязательно)</label>
                <Select
                  placeholder="Выберите подразделение"
                  value={selectedDepartment}
                  onChange={value => setSelectedDepartment(value)}
                  className="template-select-input"
                  style={{ width: '100%' }}
                  disabled={!selectedLaboratory}
                >
                  {departments.map(dept => (
                    <Option key={dept.id} value={dept.id}>
                      {dept.name}
                    </Option>
                  ))}
                </Select>
              </div>

              <div className="form-group">
                <label className="form-label">Файл шаблона</label>
                <div className="upload-container">
                  {selectedFile ? (
                    <div className="selected-file">
                      <div className="file-info">
                        <FileExcelOutlined className="file-icon" />
                        <span className="file-name">{selectedFile.name}</span>
                      </div>
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => setSelectedFile(null)}
                        className="delete-file-btn"
                      />
                    </div>
                  ) : (
                    <Dragger
                      {...uploadProps}
                      beforeUpload={handleFileSelect}
                      showUploadList={false}
                    >
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                      </p>
                      <p className="ant-upload-text">Нажмите или перетащите файл для загрузки</p>
                      <p className="ant-upload-hint">Поддерживаются только файлы формата .xlsx</p>
                    </Dragger>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : !selectedType ? (
          <div className="select-type-message"></div>
        ) : loading ? (
          <div className="loading-state">
            <Spin size="large" />
            <p>Загрузка...</p>
          </div>
        ) : !activeTemplate ? (
          <div className="upload-container">
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Нажмите или перетащите файл для загрузки</p>
              <p className="ant-upload-hint">Поддерживаются только файлы формата .xlsx</p>
            </Dragger>
          </div>
        ) : !selectedSection ? (
          <div className="sections-list">
            {SECTIONS.map(section => (
              <div
                key={section.id}
                className="section-item"
                onClick={() => handleSectionSelect(section)}
              >
                <span className="section-icon">{section.icon}</span>
                <div className="section-info">
                  <div className="section-name">{section.name}</div>
                  <div className="section-description">{section.description}</div>
                </div>
                <span className="section-arrow">→</span>
              </div>
            ))}
          </div>
        ) : selectedSection?.id === 'accreditation' ? (
          <div className="editor-container">
            <div className="editor-header">
              <Button title="Назад к разделам" onClick={handleBackToSections} type="default">
                Назад к разделам
              </Button>
            </div>
            <div className="editor-content">
              <div className="accreditation-section">
                <div className="accreditation-card">
                  <div className="card-header">
                    <NumberOutlined className="card-icon" />
                    <span>Расположение в документе</span>
                  </div>
                  <div className="form-group">
                    <Input
                      type="number"
                      min="1"
                      value={accreditationHeaderRow}
                      onChange={e => setAccreditationHeaderRow(e.target.value)}
                      placeholder="Введите номер строки"
                      style={{ width: '200px' }}
                    />
                    <div className="hint-text">
                      <InfoCircleOutlined style={{ marginRight: '8px' }} />
                      Укажите номер строки, в которой находится информация об аккредитации
                      (учитывайте наличие меток разметки шаблона)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="editor-container">
            <div className="editor-header">
              <Button title="Назад к разделам" onClick={handleBackToSections} type="default">
                Назад к разделам
              </Button>
            </div>
            <div className="editor-content">
              {selectedSection.id === 'header' ? (
                <ExcelEditor
                  templateId={activeTemplate.id}
                  section={selectedSection.id}
                  onDataChange={handleDataChange}
                />
              ) : selectedSection.id === 'selection_conditions' ? (
                <SelectionConditionsEditor
                  templateId={activeTemplate.id}
                  onDataChange={data => handleDataChange({ selection_conditions: data })}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default EditTemplateModal;
