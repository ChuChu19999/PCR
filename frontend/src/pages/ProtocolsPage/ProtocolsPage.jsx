import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Select, Form, Button, Table, Input, Space } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import Layout from '../../shared/ui/Layout/Layout';
import ProtocolsPageWrapper from './ProtocolsPageWrapper';
import EditProtocolModal from '../../features/Modals/EditProtocolModal/EditProtocolModal';
import CreateProtocolModal from '../../features/Modals/CreateProtocolModal/CreateProtocolModal';

const { Option } = Select;

const ProtocolsPage = () => {
  const [laboratories, setLaboratories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedLaboratory, setSelectedLaboratory] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const [form] = Form.useForm();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const formatDate = dateString => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const handleReset = clearFilters => {
    clearFilters();
    setSearchText('');
  };

  const getColumnSearchProps = (dataIndex, title) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Input
          placeholder={`Поиск по ${title.toLowerCase()}`}
          value={selectedKeys[0]}
          onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
          style={{ width: 188, marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Поиск
          </Button>
          <Button
            onClick={() => handleReset(clearFilters)}
            size="small"
            style={{ width: 90, fontFamily: 'HeliosCondC' }}
          >
            Сброс
          </Button>
        </Space>
      </div>
    ),
    filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
    onFilter: (value, record) => {
      if (dataIndex === 'sampling_date' || dataIndex === 'receiving_date') {
        return formatDate(record[dataIndex]).toLowerCase().includes(value.toLowerCase());
      }
      return record[dataIndex]
        ? record[dataIndex].toString().toLowerCase().includes(value.toLowerCase())
        : '';
    },
    render: (text, record) => {
      if (dataIndex === 'sampling_date' || dataIndex === 'receiving_date') {
        return formatDate(text);
      }
      return text;
    },
  });

  const handleRowClick = record => {
    setSelectedProtocol(record);
    setEditModalVisible(true);
  };

  const handleEditSuccess = async () => {
    setEditModalVisible(false);
    // Обновляем список протоколов
    await handleShowProtocols();
  };

  const handleCreateSuccess = async () => {
    setCreateModalVisible(false);
    // Обновляем список протоколов
    await handleShowProtocols();
  };

  const columns = [
    {
      title: '№ протокола',
      dataIndex: 'test_protocol_number',
      key: 'test_protocol_number',
      sorter: (a, b) => a.test_protocol_number.localeCompare(b.test_protocol_number),
      ...getColumnSearchProps('test_protocol_number', '№ протокола'),
    },
    {
      title: 'Рег. номер',
      dataIndex: 'registration_number',
      key: 'registration_number',
      sorter: (a, b) => a.registration_number.localeCompare(b.registration_number),
      ...getColumnSearchProps('registration_number', 'Рег. номеру'),
    },
    {
      title: 'Объект испытаний',
      dataIndex: 'test_object',
      key: 'test_object',
      sorter: (a, b) => a.test_object.localeCompare(b.test_object),
      ...getColumnSearchProps('test_object', 'Объекту испытаний'),
    },
    {
      title: 'Дата отбора',
      dataIndex: 'sampling_date',
      key: 'sampling_date',
      sorter: (a, b) => new Date(a.sampling_date) - new Date(b.sampling_date),
      ...getColumnSearchProps('sampling_date', 'Дате отбора'),
    },
    {
      title: 'Дата получения',
      dataIndex: 'receiving_date',
      key: 'receiving_date',
      sorter: (a, b) => new Date(a.receiving_date) - new Date(b.receiving_date),
      ...getColumnSearchProps('receiving_date', 'Дате получения'),
    },
    {
      title: 'Исполнитель',
      dataIndex: 'executor',
      key: 'executor',
      sorter: (a, b) => a.executor.localeCompare(b.executor),
      ...getColumnSearchProps('executor', 'Исполнителю'),
    },
  ];

  // Загрузка списка лабораторий
  useEffect(() => {
    const fetchLaboratories = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/laboratories/`);
        setLaboratories(response.data);
      } catch (error) {
        console.error('Ошибка при загрузке лабораторий:', error);
      }
    };

    fetchLaboratories();
  }, []);

  // Загрузка подразделений при выборе лаборатории
  useEffect(() => {
    const fetchDepartments = async () => {
      if (selectedLaboratory) {
        try {
          const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/departments/`, {
            params: { laboratory: selectedLaboratory },
          });
          // Фильтруем только неудаленные подразделения выбранной лаборатории
          const filteredDepartments = response.data.filter(
            dept => !dept.is_deleted && dept.laboratory === selectedLaboratory
          );
          setDepartments(filteredDepartments);
        } catch (error) {
          console.error('Ошибка при загрузке подразделений:', error);
        }
      } else {
        setDepartments([]);
      }
    };

    fetchDepartments();
  }, [selectedLaboratory]);

  const handleLaboratoryChange = value => {
    setSelectedLaboratory(value);
    setSelectedDepartment(null);
    form.setFieldsValue({ department: null });
  };

  const handleDepartmentChange = value => {
    setSelectedDepartment(value);
  };

  const handleShowProtocols = async () => {
    if (!selectedLaboratory) return;

    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/protocols/`, {
        params: {
          laboratory: selectedLaboratory,
          department: selectedDepartment,
          is_deleted: false,
        },
      });
      setProtocols(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке протоколов:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Протоколы">
      <ProtocolsPageWrapper>
        <div className="form">
          <Form form={form} layout="vertical">
            <Form.Item label="Лаборатория" required name="laboratory">
              <Select
                placeholder="Выберите лабораторию"
                value={selectedLaboratory}
                onChange={handleLaboratoryChange}
                style={{ width: '100%' }}
              >
                {laboratories.map(lab => (
                  <Option key={lab.id} value={lab.id}>
                    {lab.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {selectedLaboratory && departments.length > 0 && (
              <Form.Item label="Подразделение" name="department">
                <Select
                  placeholder="Выберите подразделение"
                  value={selectedDepartment}
                  onChange={handleDepartmentChange}
                  allowClear
                  style={{ width: '100%' }}
                >
                  {departments.map(dept => (
                    <Option key={dept.id} value={dept.id}>
                      {dept.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  onClick={handleShowProtocols}
                  disabled={!selectedLaboratory}
                  loading={loading}
                >
                  Показать
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalVisible(true)}
                  disabled={!selectedLaboratory}
                >
                  Создать
                </Button>
              </Space>
            </Form.Item>
          </Form>

          <div className="protocols-list">
            <Table
              columns={columns}
              dataSource={protocols}
              rowKey="id"
              loading={loading}
              onRow={record => ({
                onClick: () => handleRowClick(record),
                style: { cursor: 'pointer' },
              })}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: total => `Всего: ${total} протоколов`,
                pageSizeOptions: ['10', '20', '50', '100'],
                locale: { items_per_page: '' },
              }}
              locale={{
                emptyText: 'Протоколы не найдены',
                triggerDesc: 'Сортировать по убыванию',
                triggerAsc: 'Сортировать по возрастанию',
                cancelSort: 'Отменить сортировку',
              }}
              scroll={{ x: 'max-content' }}
            />
          </div>

          {editModalVisible && (
            <EditProtocolModal
              isOpen={editModalVisible}
              onClose={() => setEditModalVisible(false)}
              onSuccess={handleEditSuccess}
              protocol={selectedProtocol}
            />
          )}

          {createModalVisible && (
            <CreateProtocolModal
              isOpen={createModalVisible}
              onClose={() => setCreateModalVisible(false)}
              onSuccess={handleCreateSuccess}
              selectedLaboratory={selectedLaboratory}
              selectedDepartment={selectedDepartment}
            />
          )}
        </div>
      </ProtocolsPageWrapper>
    </Layout>
  );
};

export default ProtocolsPage;
