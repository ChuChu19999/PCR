import React from 'react';
import { useState } from 'react';
import { BiX } from 'react-icons/bi';
import ModalWrapper from './ModalWrapper';
import { Button } from '../../../shared/ui/Button/Button';
import './Modal.css';

const Modal = ({
  editable,
  showEditButton = true,
  header,
  deleteTitle,
  children,
  onClose,
  onSave,
  onDelete,
  onEdit,
  style,
  saveButtonText = 'Сохранить',
  saveButtonColor,
  onGenerate,
  generateButtonText = 'Сформировать протокол',
  generateLoading = false,
  extraButtons,
}) => {
  const [isLoading, setLoading] = useState({
    loading: false,
    type: '',
  });

  const chooseFunc = type => {
    switch (type) {
      case 'delete':
        return onDelete;
      case 'save':
        return onSave;
      case 'close':
        return onClose;
      case 'edit':
        return onEdit;
      default:
        return;
    }
  };

  const handleClick = type => {
    if (isLoading.loading) {
      return;
    }

    const func = chooseFunc(type);
    if (!func) {
      return;
    }

    setLoading({ loading: true, type });

    func();

    setTimeout(() => {
      setLoading({ loading: false, type: '' });
    }, 1000);
  };

  return (
    <ModalWrapper style={style}>
      <div className="modal-header" style={{ marginBottom: '0' }}>
        <p>{header}</p>
        <BiX size={25} className="modal-close" onClick={() => handleClick('close')} />
      </div>

      <div className="body">
        {children}

        <div className="body-buttons" style={{ marginTop: '0' }}>
          {extraButtons}
          {onDelete && (
            <Button
              danger
              loading={isLoading.loading && isLoading.type === 'delete'}
              title={deleteTitle || 'Удалить'}
              onClick={() => handleClick('delete')}
            >
              {deleteTitle || 'Удалить'}
            </Button>
          )}
          {showEditButton && editable && onEdit && (
            <Button
              loading={isLoading.loading && isLoading.type === 'edit'}
              title="Изменить"
              type="primary"
              onClick={() => handleClick('edit')}
            >
              Изменить
            </Button>
          )}
          {onSave && (
            <Button
              loading={isLoading.loading && isLoading.type === 'save'}
              title={saveButtonText}
              type="primary"
              buttonColor={saveButtonColor}
              onClick={() => handleClick('save')}
            >
              {saveButtonText}
            </Button>
          )}
          {onGenerate && (
            <Button
              loading={generateLoading}
              title={generateButtonText}
              type="primary"
              onClick={onGenerate}
            >
              {generateButtonText}
            </Button>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
};

export default Modal;
