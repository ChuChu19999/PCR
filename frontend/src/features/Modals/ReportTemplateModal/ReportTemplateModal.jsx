import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { Input, Upload, message, Spin } from 'antd';
import { InboxOutlined, DeleteOutlined, FileExcelOutlined } from '@ant-design/icons';
import { reportsApi } from '../../../shared/api/reports';
import { Button } from '../../../shared/ui/Button/Button';
import './ReportTemplateModal.css';

const { Dragger } = Upload;

const ReportTemplateModal = ({ isOpen, onClose, laboratoryId, departmentId }) => {
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState(null);
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadTemplate();
    }
  }, [isOpen, laboratoryId, departmentId]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const data = await reportsApi.getReportTemplate({ laboratoryId, departmentId });
      setTemplate(data || null);
      setName(data?.name || '');
      setFileName(data?.file_name || '');
    } catch (e) {
      console.error(e);
      message.error('Не удалось получить шаблон отчета');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (loading) return;
    try {
      setLoading(true);
      if (template) {
        if (file) {
          await reportsApi.uploadNewVersion({ id: template.id, file, name });
        } else if (name !== template.name) {
          await reportsApi.renameReportTemplate({ id: template.id, name });
        }
      } else {
        if (!file) {
          message.warning('Выберите файл');
          return;
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', name || file.name);
        formData.append('file_name', file.name);
        formData.append('laboratory', laboratoryId);
        if (departmentId) formData.append('department', departmentId);
        await reportsApi.createReportTemplate(formData);
      }
      message.success('Сохранено');
      setFile(null);
      setFileName('');
      onClose();
    } catch (e) {
      console.error(e);
      message.error('Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!template) return;
    try {
      setLoading(true);
      await reportsApi.renameReportTemplate({ id: template.id, name });
      message.success('Имя шаблона обновлено');
      onClose();
    } catch (e) {
      console.error(e);
      message.error('Ошибка обновления');
    } finally {
      setLoading(false);
    }
  };

  const handleNewVersion = async () => {
    if (!template || !file) return;
    try {
      setLoading(true);
      await reportsApi.uploadNewVersion({ id: template.id, file, fileName: file.name });
      message.success('Новая версия загружена');
      onClose();
    } catch (e) {
      console.error(e);
      message.error('Ошибка загрузки версии');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      header="Шаблон отчета"
      onClose={onClose}
      onSave={handleSave}
      saveButtonText="Сохранить"
      style={{ width: 600 }}
    >
      {loading ? (
        <Spin />
      ) : (
        <div className="report-template-modal">
          {template ? (
            <>
              <div className="form-group">
                <label>Имя шаблона</label>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </div>

              <div style={{ margin: '20px 0' }}>
                {file || fileName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <FileExcelOutlined style={{ fontSize: 20 }} />
                    <span>{file ? file.name : fileName}</span>
                    <DeleteOutlined
                      className="delete-icon"
                      style={{ color: 'red', cursor: 'pointer' }}
                      onClick={() => {
                        setFile(null);
                        setFileName('');
                      }}
                    />
                  </div>
                ) : (
                  <Dragger
                    beforeUpload={f => {
                      setFile(f);
                      setFileName(f.name);
                      return false;
                    }}
                    accept=".xlsx"
                    maxCount={1}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">Перетащите файл .xlsx или нажмите для выбора</p>
                  </Dragger>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Имя шаблона</label>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </div>
              {file || fileName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <FileExcelOutlined style={{ fontSize: 20 }} />
                  <span>{file ? file.name : fileName}</span>
                  <DeleteOutlined
                    className="delete-icon"
                    style={{ color: 'red', cursor: 'pointer' }}
                    onClick={() => {
                      setFile(null);
                      setFileName('');
                    }}
                  />
                </div>
              ) : (
                <Dragger
                  beforeUpload={f => {
                    setFile(f);
                    setFileName(f.name);
                    return false;
                  }}
                  accept=".xlsx"
                  maxCount={1}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">Перетащите файл .xlsx или нажмите для выбора</p>
                </Dragger>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ReportTemplateModal;
