import React, { useState } from 'react';
import { Table, Space, Input, message } from 'antd';
import { PlusOutlined, SearchOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../shared/ui/Layout/Layout';
import EquipmentPageWrapper from './EquipmentPageWrapper';
import CreateEquipmentModal from '../../features/Modals/CreateEquipmentModal/CreateEquipmentModal';
import EditEquipmentModal from '../../features/Modals/EditEquipmentModal/EditEquipmentModal';
import { Button } from '../../shared/ui/Button/Button';
import LoadingCard from '../../features/Cards/ui/LoadingCard/LoadingCard';
import { equipmentApi } from '../../shared/api/equipment';
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
  const queryClient = useQueryClient();
  const [selectedLaboratory, setSelectedLaboratory] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');

  // Запрос на получение списка лабораторий
  const { data: laboratories = [], isLoading: isLoadingLaboratories } = useQuery({
    queryKey: ['laboratories'],
    queryFn: equipmentApi.getLaboratories,
  });

  // Запрос на получение подразделений
  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery({
    queryKey: ['departments', selectedLaboratory?.id],
    queryFn: () => equipmentApi.getDepartments(selectedLaboratory?.id),
    enabled: !!selectedLaboratory?.id,
  });

  // Запрос на получение оборудования
  const { data: equipment = [], isLoading: isLoadingEquipment } = useQuery({
    queryKey: ['equipment', selectedLaboratory?.id, selectedDepartment?.id],
    queryFn: () =>
      equipmentApi.getEquipment({
        laboratoryId: selectedLaboratory?.id,
        departmentId: selectedDepartment?.id,
      }),
    enabled: !!selectedLaboratory?.id,
  });

  // Мутация для создания оборудования
  const createEquipmentMutation = useMutation({
    mutationFn: equipmentApi.createEquipment,
    onSuccess: () => {
      message.success('Прибор успешно создан');
      queryClient.invalidateQueries(['equipment']);
      setIsCreateModalOpen(false);
    },
    onError: error => {
      console.error('Ошибка при создании прибора:', error);
      message.error('Произошла ошибка при создании прибора');
    },
  });

  // Мутация для обновления оборудования
  const updateEquipmentMutation = useMutation({
    mutationFn: equipmentApi.updateEquipment,
    onSuccess: () => {
      message.success('Прибор успешно обновлен');
      queryClient.invalidateQueries(['equipment']);
      setIsEditModalOpen(false);
      setSelectedEquipment(null);
    },
    onError: error => {
      console.error('Ошибка при обновлении прибора:', error);
      message.error('Произошла ошибка при обновлении прибора');
    },
  });

  // Мутация для удаления оборудования
  const deleteEquipmentMutation = useMutation({
    mutationFn: equipmentApi.deleteEquipment,
    onSuccess: () => {
      message.success('Прибор успешно удален');
      queryClient.invalidateQueries(['equipment']);
      setIsEditModalOpen(false);
      setSelectedEquipment(null);
    },
    onError: error => {
      console.error('Ошибка при удалении прибора:', error);
      message.error('Произошла ошибка при удалении прибора');
    },
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
            title="Поиск"
            type="primary"
            onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
          </Button>
          <Button
            title="Сброс"
            onClick={() => handleReset(clearFilters)}
            size="small"
            style={{ width: 90, fontFamily: 'HeliosCondC' }}
          >
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
  });

  const columns = [
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      sorter: (a, b) => a.type.localeCompare(b.type),
      ...getColumnSearchProps('type', 'типу'),
      render: text => {
        const types = {
          measuring_instrument: 'Средство измерения',
          test_equipment: 'Испытательное оборудование',
        };
        return types[text] || text;
      },
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
      render: text => formatDate(text),
    },
    {
      title: 'Дата окончания поверки',
      dataIndex: 'verification_end_date',
      key: 'verification_end_date',
      sorter: (a, b) => new Date(a.verification_end_date) - new Date(b.verification_end_date),
      ...getColumnSearchProps('verification_end_date', 'дате окончания поверки'),
      render: text => formatDate(text),
    },
  ];

  const handleLaboratoryClick = laboratory => {
    setSelectedLaboratory(laboratory);
    setSelectedDepartment(null);
  };

  const handleDepartmentClick = department => {
    setSelectedDepartment(department);
  };

  const handleBack = () => {
    if (selectedDepartment && departments.length > 0) {
      setSelectedDepartment(null);
    } else {
      setSelectedLaboratory(null);
      setSelectedDepartment(null);
    }
  };

  const handleCreateModalSuccess = data => {
    createEquipmentMutation.mutate(data);
  };

  const handleEditModalSuccess = data => {
    if (data.delete) {
      // Если это удаление
      updateEquipmentMutation.mutate({
        id: selectedEquipment.id,
        data: { delete: true },
      });
    } else {
      // Если это обновление
      updateEquipmentMutation.mutate({
        id: selectedEquipment.id,
        data: {
          ...data,
          laboratory: selectedLaboratory.id,
          department: selectedDepartment?.id,
        },
      });
    }
  };

  const handleDeleteEquipment = id => {
    deleteEquipmentMutation.mutate(id);
  };

  const handleRowClick = record => {
    setSelectedEquipment(record);
    setIsEditModalOpen(true);
  };

  if (isLoadingLaboratories) {
    return (
      <EquipmentPageWrapper>
        <Layout title="Приборы">
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

  // Если идет загрузка подразделений, показываем загрузку
  if (isLoadingDepartments) {
    return (
      <EquipmentPageWrapper>
        <Layout title={selectedLaboratory.name}>
          <div style={{ position: 'relative' }}>
            <LoadingCard />
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
              loading={isLoadingEquipment}
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
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={handleCreateModalSuccess}
            laboratoryId={selectedLaboratory.id}
            departmentId={selectedDepartment?.id}
          />
        )}

        {isEditModalOpen && selectedEquipment && (
          <EditEquipmentModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
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
