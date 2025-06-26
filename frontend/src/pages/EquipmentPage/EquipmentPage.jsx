import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Space, Input, message } from 'antd';
import { PlusOutlined, SearchOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Layout from '../../shared/ui/Layout/Layout';
import EquipmentPageWrapper from './EquipmentPageWrapper';
import CreateEquipmentModal from '../../features/Modals/CreateEquipmentModal/CreateEquipmentModal';
import EditEquipmentModal from '../../features/Modals/EditEquipmentModal/EditEquipmentModal';
import { Button } from '../../shared/ui/Button/Button';
import LoadingCard from '../../features/Cards/ui/LoadingCard/LoadingCard';
import './EquipmentPage.css';

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
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');

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

  useEffect(() => {
    const fetchLaboratories = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/laboratories/`);
        setLaboratories(response.data.filter(lab => !lab.is_deleted));
      } catch (error) {
        console.error('Ошибка при загрузке лабораторий:', error);
        message.error('Не удалось загрузить список лабораторий');
      } finally {
        setLoading(false);
      }
    };

    fetchLaboratories();
  }, []);

  const handleLaboratoryClick = async laboratory => {
    setLoading(true);
    setSelectedLaboratory(laboratory);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/departments/by_laboratory/?laboratory_id=${laboratory.id}`
      );
      const departmentsData = response.data.filter(dept => !dept.is_deleted) || [];
      setDepartments(departmentsData);

      if (departmentsData.length === 0) {
        await loadEquipment(laboratory.id);
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      message.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentClick = async department => {
    setLoading(true);
    setSelectedDepartment(department);
    try {
      await loadEquipment(selectedLaboratory.id, department.id);
    } catch (error) {
      console.error('Ошибка при загрузке приборов:', error);
      message.error('Не удалось загрузить приборы');
    } finally {
      setLoading(false);
    }
  };

  const loadEquipment = async (laboratoryId, departmentId = null) => {
    try {
      const params = {
        laboratory: laboratoryId,
        is_active: true,
        is_deleted: false,
      };
      if (departmentId) {
        params.department = departmentId;
      }
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/equipment/`, {
        params,
      });
      setEquipment(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке приборов:', error);
      message.error('Не удалось загрузить список приборов');
    }
  };

  const handleBack = () => {
    if (selectedDepartment && departments.length > 0) {
      setSelectedDepartment(null);
      setEquipment([]);
    } else {
      setSelectedLaboratory(null);
      setSelectedDepartment(null);
      setDepartments([]);
      setEquipment([]);
    }
  };

  const handleCreateModalClose = () => {
    setIsCreateModalOpen(false);
  };

  const handleCreateModalSuccess = () => {
    setIsCreateModalOpen(false);
    loadEquipment(selectedLaboratory.id, selectedDepartment?.id);
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
    loadEquipment(selectedLaboratory.id, selectedDepartment?.id);
  };

  if (loading) {
    return (
      <EquipmentPageWrapper>
        <Layout title={selectedLaboratory ? selectedLaboratory.name : 'Приборы'}>
          <div style={{ position: 'relative' }}>
            <LoadingCard />
          </div>
        </Layout>
      </EquipmentPageWrapper>
    );
  }

  // Если лаборатория не выбрана, показываем список лабораторий
  if (!selectedLaboratory) {
    return (
      <EquipmentPageWrapper>
        <Layout title="Приборы">
          <div className="laboratories-container">
            <div className="laboratories-grid">
              {laboratories.map(laboratory => (
                <div
                  key={laboratory.id}
                  className="laboratory-card"
                  onClick={() => handleLaboratoryClick(laboratory)}
                >
                  <div className="laboratory-card-content">
                    <h3>{laboratory.name}</h3>
                    {laboratory.description && <p>{laboratory.description}</p>}
                    {laboratory.full_name && (
                      <div className="laboratory-info">
                        <span>{laboratory.full_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Layout>
      </EquipmentPageWrapper>
    );
  }

  // Если есть подразделения и подразделение еще не выбрано, показываем список подразделений
  if (departments.length > 0 && !selectedDepartment) {
    return (
      <EquipmentPageWrapper>
        <Layout title={selectedLaboratory.name}>
          <div className="departments-container">
            <div className="departments-header">
              <Button
                title="Назад"
                onClick={handleBack}
                type="default"
                className="back-btn"
                icon={<ArrowLeftOutlined />}
              />
            </div>
            <div className="departments-grid">
              {departments.map(department => (
                <div
                  key={department.id}
                  className="department-card"
                  onClick={() => handleDepartmentClick(department)}
                >
                  <div className="department-card-content">
                    <h3>{department.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Layout>
      </EquipmentPageWrapper>
    );
  }

  // Показываем таблицу с приборами
  return (
    <EquipmentPageWrapper>
      <Layout title={selectedDepartment ? selectedDepartment.name : selectedLaboratory.name}>
        <div style={{ height: 'calc(100vh - 87px)', display: 'flex', flexDirection: 'column' }}>
          <div
            className="header-actions"
            style={{ padding: '20px', display: 'flex', justifyContent: 'space-between' }}
          >
            <Button
              title="Назад"
              onClick={handleBack}
              type="default"
              className="back-btn"
              icon={<ArrowLeftOutlined />}
            />
            <Button
              title="Создать"
              onClick={() => setIsCreateModalOpen(true)}
              buttonColor="#0066cc"
              type="primary"
              icon={<PlusOutlined />}
            />
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
            onClose={handleCreateModalClose}
            onSuccess={handleCreateModalSuccess}
            laboratoryId={selectedLaboratory.id}
            departmentId={selectedDepartment?.id}
          />
        )}

        {isEditModalOpen && selectedEquipment && (
          <EditEquipmentModal
            isOpen={isEditModalOpen}
            onClose={handleEditModalClose}
            onSuccess={handleEditModalSuccess}
            equipment={selectedEquipment}
            laboratoryId={selectedLaboratory.id}
            departmentId={selectedDepartment?.id}
          />
        )}
      </Layout>
    </EquipmentPageWrapper>
  );
};

export default EquipmentPage;
