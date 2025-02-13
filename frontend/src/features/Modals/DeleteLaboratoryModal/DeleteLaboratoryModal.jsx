import React from 'react';
import Modal from '../ui/Modal';
import { message } from 'antd';
import axios from 'axios';
import './DeleteLaboratoryModal.css';

const DeleteLaboratoryModal = ({ isOpen, onClose, onSuccess, laboratory }) => {
  const handleDelete = async () => {
    try {
      if (!laboratory?.id) {
        message.error('Ошибка: лаборатория не найдена');
        return;
      }

      await axios.delete(`${import.meta.env.VITE_API_URL}/api/laboratories/${laboratory.id}/`);

      message.success('Лаборатория успешно удалена');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Ошибка при удалении лаборатории:', error);

      if (error.response?.status === 404) {
        message.error('Лаборатория не найдена');
      } else if (error.response?.status === 403) {
        message.error('У вас нет прав на удаление этой лаборатории');
      } else {
        message.error('Произошла ошибка при удалении лаборатории');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      header="Удаление лаборатории"
      onClose={onClose}
      onDelete={handleDelete}
      deleteTitle="Удалить"
      style={{ width: '400px' }}
    >
      <div className="delete-laboratory-confirmation">
        <div className="confirmation-content">
          <p className="confirmation-text">
            Вы действительно хотите удалить лабораторию "{laboratory?.name}"?
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteLaboratoryModal;
