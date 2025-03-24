import React from 'react';
import Modal from '../ui/Modal';
import { Typography } from '@mui/material';
import './HideMethodModal.css';

const HideMethodModal = ({ isOpen, onClose, onConfirm, methodName }) => {
  if (!isOpen) return null;

  return (
    <Modal
      header="Скрытие метода расчета"
      onClose={onClose}
      onSave={onConfirm}
      saveButtonText="Скрыть"
      style={{ width: '450px', fontSize: '24px' }}
    >
      <div className="hide-method-form">
        <Typography align="center">Вы действительно хотите скрыть "{methodName}"?</Typography>
      </div>
    </Modal>
  );
};

export default HideMethodModal;
