import React, { useState } from 'react';
import { DatePicker } from 'antd';
import Modal from '../ui/Modal';
import { reportsApi } from '../../../shared/api/reports';
import './SaveReportModal.css';

const { RangePicker } = DatePicker;

const SaveReportModal = ({ isOpen, onClose, laboratoryId, departmentId }) => {
  const [dateRange, setDateRange] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!dateRange) {
      message.warning('Выберите период');
      return;
    }

    try {
      setLoading(true);
      await reportsApi.generateReport({
        laboratoryId,
        departmentId,
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
      });
      message.success('Отчет успешно сформирован');
      onClose();
    } catch (error) {
      console.error('Ошибка при формировании отчета:', error);
      message.error('Не удалось сформировать отчет');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      header="Формирование отчета"
      onClose={onClose}
      onSave={handleSave}
      saveButtonText="Сформировать"
      style={{ width: 500 }}
    >
      <div className="save-report-modal">
        <div className="form-group">
          <label>Выберите период</label>
          <RangePicker
            style={{ width: '100%' }}
            onChange={setDateRange}
            format="DD.MM.YYYY"
            placeholder={['Начало периода', 'Конец периода']}
          />
        </div>
      </div>
    </Modal>
  );
};

export default SaveReportModal;
