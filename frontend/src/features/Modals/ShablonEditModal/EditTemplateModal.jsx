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
} from '@ant-design/icons';
import axios from 'axios';
import ExcelEditor from './ExcelEditor';
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
  // Другие секции добавятся в будущем
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

  // Загрузка списка шаблонов при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/excel-templates/`);
      setTemplates(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке списка шаблонов:', error);
      message.error('Не удалось загрузить список шаблонов');
    } finally {
      setLoading(false);
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
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/excel-templates/`, {
        params: { name: type },
      });
      console.log('Ответ от сервера:', response.data);

      // Проверяем, что ответ - это массив или объект
      if (typeof response.data === 'object') {
        if (Array.isArray(response.data) && response.data.length > 0) {
          // Фильтруем шаблоны по имени (точное совпадение)
          const matchingTemplate = response.data.find(template => template.name === type);

          if (matchingTemplate) {
            console.log('Найден активный шаблон:', matchingTemplate);
            console.log('ID шаблона:', matchingTemplate.id);
            console.log('Версия шаблона:', matchingTemplate.version);
            console.log('Имя файла:', matchingTemplate.file_name);
            setActiveTemplate(matchingTemplate);
          } else {
            console.log('Активный шаблон с именем', type, 'не найден');
            setActiveTemplate(null);
          }
        } else {
          console.log('Активный шаблон не найден');
          setActiveTemplate(null);
        }
      } else {
        console.error('Неверный формат ответа от сервера');
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
      // Закрываем выпадающий список
      const selectElement = document.querySelector('.ant-select-dropdown');
      if (selectElement) {
        selectElement.classList.add('ant-select-dropdown-hidden');
      }
    } else {
      console.log('Выбран тип шаблона:', value);
      setIsCreatingNew(false);
      setSelectedType(value);
      setActiveTemplate(null);
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

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('name', newTemplateName.trim());

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
      message.success('Шаблон успешно создан');
      loadTemplates(); // Обновляем список шаблонов
    } catch (error) {
      console.error('Ошибка при создании шаблона:', error);
      message.error('Ошибка при создании шаблона');
    }
  };

  const handleFileSelect = file => {
    setSelectedFile(file);
    return false; // Предотвращаем автоматическую загрузку
  };

  const handleDataChange = (newData, newTemplateId, styles = null) => {
    console.log('handleDataChange:', { newData, newTemplateId, styles });
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
      if (isCreatingNew) {
        if (!newTemplateName.trim()) {
          message.error('Введите название шаблона');
          return;
        }

        if (!selectedFile) {
          message.error('Выберите файл шаблона');
          return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('name', newTemplateName.trim());

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
        message.success('Шаблон успешно создан');
        loadTemplates();
        onClose();
        return;
      }

      if (!excelData) {
        message.warning('Нет изменений для сохранения');
        return;
      }

      console.log('Сохранение данных и стилей:', {
        data: excelData,
        styles: cellStyles,
        type: selectedType,
        section: selectedSection.id,
      });

      const formData = new FormData();
      formData.append('data', JSON.stringify(excelData));
      formData.append('styles', JSON.stringify(cellStyles));
      formData.append('template_id', activeTemplate.id);
      formData.append('section', selectedSection.id);

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
    }
  };

  const handleSectionSelect = section => {
    setSelectedSection(section);
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
        onClose();
      }}
      onSave={handleSave}
      style={{ width: '1025px' }}
    >
      <div className="template-select">
        <Select
          placeholder="Выберите тип шаблона"
          onChange={handleTypeChange}
          value={selectedType}
          style={{ width: '100%', marginBottom: 24 }}
          dropdownRender={menu => (
            <>
              {menu}
              <div className="select-dropdown-divider" />
              <div className="select-dropdown-item" onClick={() => handleTypeChange('new')}>
                <PlusOutlined /> Создать новый шаблон
              </div>
            </>
          )}
        >
          {templates.map(template => (
            <Option key={template.name} value={template.name}>
              {template.name}
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
              />
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
                  <Dragger {...uploadProps} beforeUpload={handleFileSelect} showUploadList={false}>
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
      ) : (
        <div className="editor-container">
          <div className="editor-header">
            <Button title="Назад к разделам" onClick={handleBackToSections} type="default">
              Назад к разделам
            </Button>
          </div>
          <div className="editor-content">
            <ExcelEditor
              templateId={activeTemplate.id}
              section={selectedSection.id}
              onDataChange={handleDataChange}
            />
          </div>
        </div>
      )}
    </Modal>
  );
};

export default EditTemplateModal;
