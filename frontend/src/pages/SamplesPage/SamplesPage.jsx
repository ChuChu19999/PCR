import React, { useState } from 'react';
import { Table, Space, Input, message } from 'antd';
import { PlusOutlined, SearchOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../shared/ui/Layout/Layout';
import SamplesPageWrapper from './SamplesPageWrapper';
import CreateSampleModal from '../../features/Modals/CreateSampleModal/CreateSampleModal';
import EditSampleModal from '../../features/Modals/EditSampleModal/EditSampleModal';
import { Button } from '../../shared/ui/Button/Button';
import LoadingCard from '../../features/Cards/ui/LoadingCard/LoadingCard';
import { samplesApi } from '../../shared/api/samples';
import './SamplesPage.css';

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
  const queryClient = useQueryClient();
  const [selectedLaboratory, setSelectedLaboratory] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);

  // Запрос на получение списка лабораторий
  const { data: laboratories = [], isLoading: laboratoriesLoading } = useQuery({
    queryKey: ['laboratories'],
    queryFn: samplesApi.getLaboratories,
  });

  // Запрос на получение подразделений
  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments', selectedLaboratory?.id],
    queryFn: () => samplesApi.getDepartments(selectedLaboratory.id),
    enabled: !!selectedLaboratory?.id,
  });

  // Запрос на получение проб
  const { data: samples = [], isLoading: samplesLoading } = useQuery({
    queryKey: ['samples', selectedLaboratory?.id, selectedDepartment?.id],
    queryFn: () =>
      samplesApi.getSamples({
        laboratoryId: selectedLaboratory.id,
        departmentId: selectedDepartment?.id,
      }),
    enabled: !!selectedLaboratory?.id,
  });

  // Мутация для создания пробы
  const createSampleMutation = useMutation({
    mutationFn: samplesApi.createSample,
    onSuccess: () => {
      message.success('Проба успешно создана');
      queryClient.invalidateQueries(['samples', selectedLaboratory?.id, selectedDepartment?.id]);
      setIsCreateModalOpen(false);
    },
    onError: error => {
      console.error('Ошибка при создании пробы:', error);
      message.error('Не удалось создать пробу');
    },
  });

  // Мутация для обновления пробы
  const updateSampleMutation = useMutation({
    mutationFn: samplesApi.updateSample,
    onSuccess: () => {
      message.success('Проба успешно обновлена');
      queryClient.invalidateQueries(['samples', selectedLaboratory?.id, selectedDepartment?.id]);
      setIsEditModalOpen(false);
      setSelectedSample(null);
    },
    onError: error => {
      console.error('Ошибка при обновлении пробы:', error);
      message.error('Не удалось обновить пробу');
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

  const columns = [
    {
      title: '№ пробы',
      dataIndex: 'registration_number',
      key: 'registration_number',
      ...getColumnSearchProps('registration_number', 'Номеру пробы'),
    },
    {
      title: 'Объект испытания',
      dataIndex: 'test_object',
      key: 'test_object',
      ...getColumnSearchProps('test_object', 'Объекту испытания'),
    },
    {
      title: 'Место отбора',
      dataIndex: 'sampling_location_detail',
      key: 'sampling_location_detail',
      ...getColumnSearchProps('sampling_location_detail', 'Месту отбора'),
    },
    {
      title: 'Дата отбора',
      dataIndex: 'sampling_date',
      key: 'sampling_date',
      ...getColumnSearchProps('sampling_date', 'Дате отбора'),
      render: text => formatDate(text),
    },
    {
      title: 'Дата поступления',
      dataIndex: 'receiving_date',
      key: 'receiving_date',
      ...getColumnSearchProps('receiving_date', 'Дате поступления'),
      render: text => formatDate(text),
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      render: text => formatDate(text),
    },
  ];

  const handleCreateModalClose = () => {
    setIsCreateModalOpen(false);
  };

  const handleCreateSuccess = sampleData => {
    createSampleMutation.mutate(sampleData);
  };

  const handleRowClick = record => {
    setSelectedSample(record);
    setIsEditModalOpen(true);
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setSelectedSample(null);
  };

  const handleEditModalSuccess = data => {
    updateSampleMutation.mutate({
      id: selectedSample.id,
      data: {
        ...data,
        laboratory: selectedLaboratory.id,
        department: selectedDepartment?.id,
      },
    });
  };

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

  if (laboratoriesLoading) {
    return (
      <SamplesPageWrapper>
        <Layout title={selectedLaboratory ? selectedLaboratory.name : 'Пробы'}>
          <div style={{ position: 'relative' }}>
            <LoadingCard />
          </div>
        </Layout>
      </SamplesPageWrapper>
    );
  }

  // Если лаборатория не выбрана, показываем список лабораторий
  if (!selectedLaboratory) {
    return (
      <SamplesPageWrapper>
        <Layout title="Пробы">
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
      </SamplesPageWrapper>
    );
  }

  // Если идет загрузка подразделений, показываем загрузку
  if (departmentsLoading) {
    return (
      <SamplesPageWrapper>
        <Layout title={selectedLaboratory.name}>
          <div style={{ position: 'relative' }}>
            <LoadingCard />
          </div>
        </Layout>
      </SamplesPageWrapper>
    );
  }

  // Если есть подразделения и подразделение еще не выбрано, показываем список подразделений
  if (departments.length > 0 && !selectedDepartment) {
    return (
      <SamplesPageWrapper>
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
      </SamplesPageWrapper>
    );
  }

  // Показываем таблицу с пробами
  return (
    <SamplesPageWrapper>
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
              loading={samplesLoading}
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

        {isCreateModalOpen && (
          <CreateSampleModal
            onClose={handleCreateModalClose}
            onSuccess={handleCreateSuccess}
            laboratoryId={selectedLaboratory.id}
            departmentId={selectedDepartment?.id}
          />
        )}

        {isEditModalOpen && selectedSample && (
          <EditSampleModal
            isOpen={isEditModalOpen}
            onClose={handleEditModalClose}
            onSuccess={handleEditModalSuccess}
            sample={selectedSample}
            laboratoryId={selectedLaboratory.id}
            departmentId={selectedDepartment?.id}
          />
        )}
      </Layout>
    </SamplesPageWrapper>
  );
};

export default SamplesPage;
