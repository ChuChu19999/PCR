import React from 'react';
import Modal from '../ui/Modal';
import './ConfirmProtocolModal.css';

const ConfirmProtocolModal = ({ isOpen, onClose, protocolNumber, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <Modal
      header="Подтверждение формирования протокола"
      onClose={onClose}
      onSave={onConfirm}
      saveText="Сформировать протокол"
      style={{ width: '550px' }}
    >
      <div className="confirm-protocol-form">
        <div className="form-group">
          <label>
            Вы действительно хотите сформировать протокол для пробы с регистрационным номером{' '}
            <strong>{protocolNumber}</strong>?
          </label>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmProtocolModal;
