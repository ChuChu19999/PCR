import React, { useState, useEffect, useRef } from 'react';
import Modal from '../ui/Modal';
import { Button, List } from 'antd';
import DescriptionIcon from '@mui/icons-material/Description';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import ExcelEditor from './ExcelEditor.jsx';
import './EditTemplateModal.css';

const EditTemplateModal = ({ isOpen, onClose }) => {
  const [selectedSection, setSelectedSection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentData, setCurrentData] = useState(null);
  const excelEditorRef = useRef(null);

  const sections = [
    {
      id: 'header',
      name: 'Шапка',
      description: 'Редактирование шапки документа',
      icon: <DescriptionIcon style={{ color: '#1976d2' }} />,
    },
  ];

  useEffect(() => {
    if (!isOpen) {
      setSelectedSection(null);
      setCurrentData(null);
    }
  }, [isOpen]);

  const handleSectionSelect = section => {
    setSelectedSection(section);
  };

  const handleBack = () => {
    setSelectedSection(null);
    setCurrentData(null);
  };

  const handleDataChange = data => {
    setCurrentData(data);
  };

  const handleSave = async () => {
    if (!currentData) {
      console.error('Нет данных для сохранения');
      return;
    }

    try {
      setSaving(true);
      await excelEditorRef.current.saveDataWithStyles();
      setTimeout(() => {
        if (excelEditorRef.current?.loadExcelData) {
          excelEditorRef.current.loadExcelData();
        }
        setSaving(false);
        onClose();
      }, 500);
    } catch (error) {
      console.error('Ошибка при сохранении шаблона:', error);
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      header={selectedSection ? selectedSection.name : 'Редактирование шаблона'}
      onClose={onClose}
      onSave={selectedSection ? handleSave : null}
      style={{ width: '990px', minHeight: '100px' }}
    >
      <div className="edit-template-content">
        {!selectedSection ? (
          <div className="sections-list">
            <List
              dataSource={sections}
              renderItem={section => (
                <div className="section-item" onClick={() => handleSectionSelect(section)}>
                  <div className="section-icon">{section.icon}</div>
                  <div className="section-info">
                    <div className="section-name">{section.name}</div>
                    <div className="section-description">{section.description}</div>
                  </div>
                  <KeyboardArrowRightIcon className="section-arrow" />
                </div>
              )}
            />
          </div>
        ) : (
          <div className="editor-container">
            <div className="editor-header">
              <Button icon={<KeyboardBackspaceIcon />} onClick={handleBack} className="back-button">
                Назад к разделам
              </Button>
            </div>
            <div className="editor-content">
              <ExcelEditor
                ref={excelEditorRef}
                onDataChange={handleDataChange}
                section={selectedSection.id}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default EditTemplateModal;
