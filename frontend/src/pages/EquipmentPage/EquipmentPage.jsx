import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Select, Form, Button, Table, Space, Input } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import Layout from '../../shared/ui/Layout/Layout';
import EquipmentPageWrapper from './EquipmentPageWrapper';
import CreateEquipmentModal from '../../features/Modals/CreateEquipmentModal/CreateEquipmentModal';
import EditEquipmentModal from '../../features/Modals/EditEquipmentModal/EditEquipmentModal';

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

const EquipmentPage = () => {
  const [laboratories, setLaboratories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedLaboratory, setSelectedLaboratory] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const [form] = Form.useForm();

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
      if (dataIndex === 'verification_date' || dataIndex === 'verification_end_date') {
        return formatDate(record[dataIndex]).toLowerCase().includes(value.toLowerCase());
      }
      if (dataIndex === 'type') {
        const types = {
          measuring_instrument: 'Средство измерения',
          test_equipment: 'Испытательное оборудование',
        };
        const translatedType = types[record[dataIndex]] || record[dataIndex];
        return translatedType.toLowerCase().includes(value.toLowerCase());
      }
      return record[dataIndex]
        ? record[dataIndex].toString().toLowerCase().includes(value.toLowerCase())
        : '';
    },
    render: (text, record) => {
      if (dataIndex === 'verification_date' || dataIndex === 'verification_end_date') {
        return formatDate(text);
      }
      if (dataIndex === 'type') {
        const types = {
          measuring_instrument: 'Средство измерения',
          test_equipment: 'Испытательное оборудование',
        };
        return types[text] || text;
      }
      return text;
    },
  });

  const columns = [
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      sorter: (a, b) => a.type.localeCompare(b.type),
      ...getColumnSearchProps('type', 'типу'),
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      ...getColumnSearchProps('name', 'наименованию'),
    },
    {
      title: 'Заводской номер',
      dataIndex: 'serial_number',
      key: 'serial_number',
      sorter: (a, b) => a.serial_number.localeCompare(b.serial_number),
      ...getColumnSearchProps('serial_number', 'заводскому номеру'),
    },
    {
      title: 'Дата поверки',
      dataIndex: 'verification_date',
      key: 'verification_date',
      sorter: (a, b) => new Date(a.verification_date) - new Date(b.verification_date),
      ...getColumnSearchProps('verification_date', 'дате поверки'),
    },
    {
      title: 'Дата окончания поверки',
      dataIndex: 'verification_end_date',
      key: 'verification_end_date',
      sorter: (a, b) => new Date(a.verification_end_date) - new Date(b.verification_end_date),
      ...getColumnSearchProps('verification_end_date', 'дате окончания поверки'),
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

  // Временные обработчики для кнопок
  const handleCreate = () => {
    setIsCreateModalOpen(true);
  };

  const handleShow = async () => {
    if (!selectedLaboratory) return;

    setLoading(true);
    try {
      const params = {
        laboratory: selectedLaboratory,
        is_active: true,
        is_deleted: false,
      };
      if (selectedDepartment) {
        params.department = selectedDepartment;
      }
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/equipment/`, {
        params,
      });
      setEquipment(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке приборов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsCreateModalOpen(false);
  };

  const handleModalSuccess = () => {
    setIsCreateModalOpen(false);
    handleShow();
  };

  const handleRowClick = record => {
    setSelectedEquipment(record);
    setIsEditModalOpen(true);
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setSelectedEquipment(null);
  };

  const handleEditModalSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedEquipment(null);
    handleShow();
  };

  return (
    <Layout title="Приборы">
      <EquipmentPageWrapper>
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
            className="equipment-list"
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
              dataSource={equipment}
              rowKey="id"
              onRow={record => ({
                onClick: () => handleRowClick(record),
                style: { cursor: 'pointer' },
              })}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: total => `Всего: ${total} приборов`,
                pageSizeOptions: ['10', '20', '50', '100'],
                locale: { items_per_page: '' },
              }}
              locale={{
                emptyText: 'Приборы не найдены',
                triggerDesc: 'Сортировать по убыванию',
                triggerAsc: 'Сортировать по возрастанию',
                cancelSort: 'Отменить сортировку',
              }}
            />
          </div>
        </div>

        {isCreateModalOpen && (
          <CreateEquipmentModal
            isOpen={isCreateModalOpen}
            onClose={handleModalClose}
            onSuccess={handleModalSuccess}
          />
        )}

        {isEditModalOpen && selectedEquipment && (
          <EditEquipmentModal
            isOpen={isEditModalOpen}
            onClose={handleEditModalClose}
            onSuccess={handleEditModalSuccess}
            equipment={selectedEquipment}
          />
        )}
      </EquipmentPageWrapper>
    </Layout>
  );
};

export default EquipmentPage;
