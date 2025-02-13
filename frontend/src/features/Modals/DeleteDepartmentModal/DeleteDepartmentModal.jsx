import React from 'react';
import Modal from '../ui/Modal';
import { message } from 'antd';
import axios from 'axios';
import './DeleteDepartmentModal.css';

const DeleteDepartmentModal = ({ isOpen, onClose, onSuccess, department }) => {
  const handleDelete = async () => {
    try {
      if (!department?.id) {
        message.error('Ошибка: подразделение не найдено');
        return;
      }

      await axios.delete(`${import.meta.env.VITE_API_URL}/api/departments/${department.id}/`);

      message.success('Подразделение успешно удалено');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Ошибка при удалении подразделения:', error);

      if (error.response?.status === 404) {
        message.error('Подразделение не найдено');
      } else if (error.response?.status === 403) {
        message.error('У вас нет прав на удаление этого подразделения');
      } else {
        message.error('Произошла ошибка при удалении подразделения');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      header="Удаление подразделения"
      onClose={onClose}
      onDelete={handleDelete}
      deleteTitle="Удалить"
      style={{ width: '400px' }}
    >
      <div className="delete-department-confirmation">
        <div className="confirmation-content">
          <p className="confirmation-text">
            Вы действительно хотите удалить подразделение "{department?.name}"?
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteDepartmentModal;
