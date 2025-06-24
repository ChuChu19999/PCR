import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Select, Form, Button, Table, Space, Input } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import Layout from '../../shared/ui/Layout/Layout';
import SamplesPageWrapper from './SamplesPageWrapper';
import CreateSampleModal from '../../features/Modals/CreateSampleModal/CreateSampleModal';
import EditSampleModal from '../../features/Modals/EditSampleModal/EditSampleModal';
import dayjs from 'dayjs';

const { Option } = Select;

const formatDate = dateString => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const SamplesPage = () => {
  const [laboratories, setLaboratories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedLaboratory, setSelectedLaboratory] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [form] = Form.useForm();
  const [columnsState, setColumnsState] = useState({
    registration_number: { width: 200 },
    test_object: { width: 200 },
    sampling_location_detail: { width: 200 },
    sampling_date: { width: 150 },
    receiving_date: { width: 150 },
    created_at: { width: 150 },
  });

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
      if (dataIndex === 'created_at') {
        return formatDate(record[dataIndex]).toLowerCase().includes(value.toLowerCase());
      }
      return record[dataIndex]
        ? record[dataIndex].toString().toLowerCase().includes(value.toLowerCase())
        : '';
    },
    render: (text, record) => {
      if (dataIndex === 'created_at') {
        return formatDate(text);
      }
      return text;
    },
  });

  const columns = [
    {
      title: 'Регистрационный номер',
      dataIndex: 'registration_number',
      key: 'registration_number',
      sorter: (a, b) => a.registration_number.localeCompare(b.registration_number),
      ...getColumnSearchProps('registration_number', 'регистрационному номеру'),
    },
    {
      title: 'Объект испытаний',
      dataIndex: 'test_object',
      key: 'test_object',
      width: columnsState.test_object.width,
      ...getColumnSearchProps('test_object', 'Объекту испытаний'),
    },
    {
      title: 'Место отбора пробы',
      dataIndex: 'sampling_location_detail',
      key: 'sampling_location_detail',
      width: columnsState.sampling_location_detail.width,
      ...getColumnSearchProps('sampling_location_detail', 'Месту отбора'),
    },
    {
      title: 'Дата отбора пробы',
      dataIndex: 'sampling_date',
      key: 'sampling_date',
      width: columnsState.sampling_date.width,
      sorter: (a, b) => new Date(a.sampling_date) - new Date(b.sampling_date),
      ...getColumnSearchProps('sampling_date', 'Дате отбора'),
      render: text => (text ? dayjs(text).format('DD.MM.YYYY') : '-'),
    },
    {
      title: 'Дата получения пробы',
      dataIndex: 'receiving_date',
      key: 'receiving_date',
      width: columnsState.receiving_date.width,
      sorter: (a, b) => new Date(a.receiving_date) - new Date(b.receiving_date),
      ...getColumnSearchProps('receiving_date', 'Дате получения'),
      render: text => (text ? dayjs(text).format('DD.MM.YYYY') : '-'),
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      ...getColumnSearchProps('created_at', 'дате создания'),
    },
  ];

  // Загрузка списка лабораторий
  useEffect(() => {
    const fetchLaboratories = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/laboratories/`);
        setLaboratories(response.data.filter(lab => !lab.is_deleted));
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
      setSelectedDepartment(null);
    };

    fetchDepartments();
  }, [selectedLaboratory]);

  // Обработчики изменения выбора
  const handleLaboratoryChange = value => {
    setSelectedLaboratory(value);
    form.setFieldsValue({ department: undefined });
  };

  const handleDepartmentChange = value => {
    setSelectedDepartment(value);
  };

  const handleCreate = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateModalClose = () => {
    setIsCreateModalOpen(false);
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    handleShow(); // Обновляем список проб после успешного создания
  };

  const handleShow = async () => {
    if (!selectedLaboratory) return;

    setLoading(true);
    try {
      const params = {
        laboratory: selectedLaboratory,
      };
      if (selectedDepartment) {
        params.department = selectedDepartment;
      }
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/samples/`, {
        params,
      });
      setSamples(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке проб:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = record => {
    setSelectedSample(record);
    setIsEditModalOpen(true);
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setSelectedSample(null);
  };

  const handleEditModalSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedSample(null);
    handleShow(); // Обновляем список проб после успешного редактирования
  };

  return (
    <Layout title="Пробы">
      <SamplesPageWrapper>
        <div style={{ height: 'calc(100vh - 87px)', display: 'flex', flexDirection: 'column' }}>
          <div className="form" style={{ padding: '20px', flex: 'none' }}>
            <Form form={form} layout="vertical">
              <Form.Item label="Лаборатория" name="laboratory">
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
                    onClick={handleShow}
                    disabled={!selectedLaboratory}
                    loading={loading}
                  >
                    Показать
                  </Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                    Создать
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </div>

          <div
            className="samples-list"
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '0 20px 20px 20px',
              marginTop: 0,
            }}
          >
            <Table
              columns={columns}
              loading={loading}
              dataSource={samples}
              rowKey="id"
              onRow={record => ({
                onClick: () => handleRowClick(record),
                style: { cursor: 'pointer' },
              })}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: total => `Всего: ${total} проб`,
                pageSizeOptions: ['10', '20', '50', '100'],
                locale: { items_per_page: '' },
              }}
              locale={{
                emptyText: 'Пробы не найдены',
                triggerDesc: 'Сортировать по убыванию',
                triggerAsc: 'Сортировать по возрастанию',
                cancelSort: 'Отменить сортировку',
              }}
            />
          </div>
        </div>
      </SamplesPageWrapper>

      {isCreateModalOpen && (
        <CreateSampleModal onClose={handleCreateModalClose} onSuccess={handleCreateSuccess} />
      )}

      {isEditModalOpen && selectedSample && (
        <EditSampleModal
          onClose={handleEditModalClose}
          onSuccess={handleEditModalSuccess}
          sample={selectedSample}
        />
      )}
    </Layout>
  );
};

export default SamplesPage;
