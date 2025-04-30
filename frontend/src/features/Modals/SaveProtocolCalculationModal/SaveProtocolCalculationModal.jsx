import React, { useState } from 'react';
import Modal from '../ui/Modal';
import axios from 'axios';
import './SaveProtocolCalculationModal.css';

const SaveProtocolCalculationModal = ({
  isOpen,
  onClose,
  onSuccess,
  protocolId,
  calculationResult,
  currentMethod,
  laboratoryActivityDate,
  laboratoryId,
  departmentId,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const requestData = {
        input_data: calculationResult.input_data,
        result: calculationResult.result,
        measurement_error: calculationResult.measurement_error,
        unit: currentMethod.unit,
        laboratory_activity_date: laboratoryActivityDate.format('YYYY-MM-DD'),
        laboratory: laboratoryId,
        department: departmentId,
        protocol_id: protocolId,
        research_method: currentMethod.id,
      };

      await axios.post(`${import.meta.env.VITE_API_URL}/api/save-calculation/`, requestData);

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Ошибка при сохранении расчета:', error);
      setError(
        error.response?.data?.detail ||
          error.response?.data?.error ||
          'Произошла ошибка при сохранении расчета'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      header="Подтверждение сохранения"
      onClose={onClose}
      onSave={handleSave}
      style={{ width: '500px' }}
      loading={loading}
    >
      <div className="save-protocol-calculation-form">
        <p className="confirmation-message">
          Вы уверены, что хотите сохранить результаты в протокол?
        </p>
        {error && (
          <p className="error-message" style={{ color: '#ff4d4f', marginTop: '8px' }}>
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
};

export default SaveProtocolCalculationModal;
