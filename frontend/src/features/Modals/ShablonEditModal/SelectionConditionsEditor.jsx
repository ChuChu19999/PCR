import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Form, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import './SelectionConditionsEditor.css';

const SelectionConditionsEditor = ({ templateId, onDataChange }) => {
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConditions();
  }, [templateId]);

  const loadConditions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/excel-templates/${templateId}/`
      );
      const loadedConditions = response.data.selection_conditions || [];
      setConditions(loadedConditions);
      onDataChange(loadedConditions);
    } catch (error) {
      console.error('Ошибка при загрузке условий отбора:', error);
      message.error('Не удалось загрузить условия отбора');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setConditions([
      ...conditions,
      {
        name: '',
        unit: '',
      },
    ]);
  };

  const handleDelete = index => {
    const newConditions = conditions.filter((_, idx) => idx !== index);
    setConditions(newConditions);
  };

  const handleNameChange = (index, value) => {
    const updatedConditions = conditions.map((condition, idx) =>
      idx === index ? { ...condition, name: value } : condition
    );
    setConditions(updatedConditions);
  };

  const handleUnitChange = (index, value) => {
    const updatedConditions = conditions.map((condition, idx) =>
      idx === index ? { ...condition, unit: value.trim() } : condition
    );
    setConditions(updatedConditions);
  };

  useEffect(() => {
    onDataChange(conditions);
  }, [conditions]);

  const columns = [
    {
      title: 'Название условия',
      dataIndex: 'name',
      key: 'name',
      width: '40%',
      render: (text, _, index) => (
        <Input
          value={text}
          onChange={e => handleNameChange(index, e.target.value)}
          placeholder="Введите название условия"
        />
      ),
    },
    {
      title: 'Единица измерения',
      dataIndex: 'unit',
      key: 'unit',
      width: '40%',
      render: (unit, _, index) => (
        <Input
          value={unit}
          onChange={e => handleUnitChange(index, e.target.value)}
          placeholder="Введите единицу измерения"
        />
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: '20%',
      render: (_, __, index) => (
        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(index)} />
      ),
    },
  ];

  return (
    <div className="selection-conditions-editor">
      <div className="editor-header">
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Добавить условие
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={conditions}
        rowKey={(_, index) => index}
        pagination={false}
        loading={loading}
      />
    </div>
  );
};

export default SelectionConditionsEditor;
