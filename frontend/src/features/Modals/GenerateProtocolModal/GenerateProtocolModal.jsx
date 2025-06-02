import React, { useState, useEffect, useRef } from 'react';
import Modal from '../ui/Modal';
import { Input, message } from 'antd';
import axios from 'axios';
import './GenerateProtocolModal.css';
import dayjs from 'dayjs';

const GenerateProtocolModal = ({ isOpen, onClose, laboratoryId, departmentId }) => {
  const [protocols, setProtocols] = useState([]);
  const [searchValue, setSearchValue] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [selectedProtocolData, setSelectedProtocolData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const [inputWidth, setInputWidth] = useState(0);

  useEffect(() => {
    console.log('laboratoryId:', laboratoryId);
    console.log('departmentId:', departmentId);
    if (isOpen && laboratoryId) {
      fetchProtocols();
    }
    if (!isOpen) {
      setSearchValue('');
      setSelectedProtocol(null);
      setShowSuggestions(false);
    }
  }, [isOpen, laboratoryId, departmentId]);

  useEffect(() => {
    if (inputRef.current) {
      setInputWidth(inputRef.current.offsetWidth);
    }
  }, [isOpen]);

  const fetchProtocols = async () => {
    try {
      setLoading(true);
      let url = `${import.meta.env.VITE_API_URL}/api/protocols/?is_deleted=false`;

      const filters = [];
      if (laboratoryId) {
        filters.push(`laboratory=${laboratoryId}`);
      }
      if (departmentId) {
        filters.push(`department=${departmentId}`);
      }

      if (filters.length > 0) {
        url += '&' + filters.join('&');
      }

      console.log('Запрос к API для получения протоколов:', url);

      const response = await axios.get(url);
      setProtocols(response.data);
    } catch (error) {
      console.error('Ошибка при получении списка протоколов:', error);
      message.error('Не удалось загрузить список протоколов');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = e => {
    const value = e.target.value;
    setSearchValue(value);
    setSelectedProtocol(null);
    setShowSuggestions(value.length > 0);
  };

  const handleSelectProtocol = protocol => {
    setSearchValue(protocol.registration_number);
    setSelectedProtocol(protocol.id);
    setSelectedProtocolData(protocol);
    setShowSuggestions(false);
  };

  const filteredProtocols = protocols.filter(protocol =>
    protocol.registration_number.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleGenerateProtocol = async () => {
    if (!selectedProtocol) {
      message.warning('Выберите регистрационный номер пробы');
      return;
    }

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/generate-protocol-excel/?protocol_id=${selectedProtocol}`,
        {
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      let filename;
      if (selectedProtocolData?.is_accredited && selectedProtocolData?.test_protocol_date) {
        const date = dayjs(selectedProtocolData.test_protocol_date).format('DD.MM.YYYY');
        filename = `Протокол_${selectedProtocolData.test_protocol_number}_от_${date}.xlsx`;
      } else {
        filename = `Протокол_${selectedProtocolData.test_protocol_number}.xlsx`;
      }

      filename = filename.replace(/[^\wа-яА-Я\s\.\-_]/g, '');

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      onClose();
      message.success('Протокол успешно сформирован');
    } catch (error) {
      console.error('Ошибка при формировании протокола:', error);
      message.error('Не удалось сформировать протокол');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      header="Формирование протокола"
      onClose={onClose}
      onSave={handleGenerateProtocol}
      saveText="Сформировать протокол"
      style={{ width: '550px' }}
    >
      <div className="generate-protocol-form">
        <div className="form-group">
          <label>Регистрационный номер</label>
          <div className="input-container">
            <Input
              ref={inputRef}
              value={searchValue}
              onChange={handleInputChange}
              placeholder="Введите регистрационный номер"
              disabled={loading}
            />
            {showSuggestions && searchValue > 0 && (
              <div className="suggestions-list" style={{ width: inputWidth }}>
                {filteredProtocols.map(protocol => (
                  <div
                    key={protocol.registration_number}
                    className="suggestion-item"
                    onClick={() => handleSelectProtocol(protocol)}
                  >
                    {protocol.registration_number}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default GenerateProtocolModal;
