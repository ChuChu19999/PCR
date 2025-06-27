import React, { useState } from 'react';
import { Table, Space, Input, message } from 'antd';
import { PlusOutlined, SearchOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../shared/ui/Layout/Layout';
import ProtocolsPageWrapper from './ProtocolsPageWrapper';
import CreateProtocolModal from '../../features/Modals/CreateProtocolModal/CreateProtocolModal';
import EditProtocolModal from '../../features/Modals/EditProtocolModal/EditProtocolModal';
import EditTemplateModal from '../../features/Modals/ShablonEditModal/EditTemplateModal';
import { Button } from '../../shared/ui/Button/Button';
import LoadingCard from '../../features/Cards/ui/LoadingCard/LoadingCard';
import { protocolsApi } from '../../shared/api/protocols';
import dayjs from 'dayjs';
import './ProtocolsPage.css';

const formatDate = (dateString, isAccredited) => {
  if (!dateString || !isAccredited) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getObjectSuffix = samples => {
  if (!samples || !samples.length) return '';

  // Проверяем все объекты испытаний из проб
  for (const sample of samples) {
    const testObjectLower = sample.test_object.toLowerCase();
    if (testObjectLower.includes('конденсат')) return 'дк';
    if (testObjectLower.includes('нефть')) return 'н';
  }
  return '';
};

const formatProtocolNumber = (number, date, isAccredited, samples) => {
  if (!number && !date) return '-';
  if (!isAccredited) return number || '-';

  const suffix = getObjectSuffix(samples);
  const formattedDate = formatDate(date, isAccredited);

  if (!number) return `от ${formattedDate}`;
  if (!date) return number;

  const protocolNumber = suffix ? `${number}/07/${suffix}` : `${number}/07`;
  return `${protocolNumber} от ${formattedDate}`;
};

const ProtocolsPage = () => {
  const queryClient = useQueryClient();
  const [selectedLaboratory, setSelectedLaboratory] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');

  // Запрос на получение списка лабораторий
  const { data: laboratories = [], isLoading: isLoadingLaboratories } = useQuery({
    queryKey: ['laboratories'],
    queryFn: protocolsApi.getLaboratories,
  });

  // Запрос на получение подразделений
  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery({
    queryKey: ['departments', selectedLaboratory?.id],
    queryFn: () => protocolsApi.getDepartments(selectedLaboratory?.id),
    enabled: !!selectedLaboratory?.id,
  });

  // Запрос на получение протоколов
  const { data: protocols = [], isLoading: isLoadingProtocols } = useQuery({
    queryKey: ['protocols', selectedLaboratory?.id, selectedDepartment?.id],
    queryFn: () =>
      protocolsApi.getProtocols({
        laboratoryId: selectedLaboratory?.id,
        departmentId: selectedDepartment?.id,
      }),
    enabled: !!selectedLaboratory?.id,
  });

  // Мутация для создания протокола
  const createProtocolMutation = useMutation({
    mutationFn: protocolsApi.createProtocol,
    onSuccess: () => {
      message.success('Протокол успешно создан');
      queryClient.invalidateQueries(['protocols']);
      setIsCreateModalOpen(false);
    },
    onError: error => {
      console.error('Ошибка при создании протокола:', error);
      message.error('Произошла ошибка при создании протокола');
    },
  });

  // Мутация для обновления протокола
  const updateProtocolMutation = useMutation({
    mutationFn: protocolsApi.updateProtocol,
    onSuccess: () => {
      message.success('Протокол успешно обновлен');
      queryClient.invalidateQueries(['protocols']);
      setIsEditModalOpen(false);
      setSelectedProtocol(null);
    },
    onError: error => {
      console.error('Ошибка при обновлении протокола:', error);
      message.error('Произошла ошибка при обновлении протокола');
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
      if (dataIndex === 'date') {
        return formatDate(record[dataIndex], record.is_accredited)
          .toLowerCase()
          .includes(value.toLowerCase());
      }
      return record[dataIndex]
        ? record[dataIndex].toString().toLowerCase().includes(value.toLowerCase())
        : '';
    },
  });

  const columns = [
    {
      title: '№ протокола',
      dataIndex: 'test_protocol_number',
      key: 'test_protocol_number',
      ...getColumnSearchProps('test_protocol_number', 'Номеру протокола'),
      render: (text, record) =>
        formatProtocolNumber(text, record.test_protocol_date, record.is_accredited, record.samples),
    },
    {
      title: 'Номер акта отбора',
      dataIndex: 'sampling_act_number',
      key: 'sampling_act_number',
      ...getColumnSearchProps('sampling_act_number', 'Номеру акта отбора'),
      render: text => text || '-',
    },
    {
      title: 'Аккредитован',
      dataIndex: 'is_accredited',
      key: 'is_accredited',
      render: value => (value ? '✓' : '-'),
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      ...getColumnSearchProps('created_at', 'Дате создания'),
      render: text => formatDate(text, true),
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
    createProtocolMutation.mutate(data);
  };

  const handleEditModalSuccess = data => {
    updateProtocolMutation.mutate({
      id: selectedProtocol.id,
      data: {
        ...data,
        laboratory: selectedLaboratory.id,
        department: selectedDepartment?.id,
      },
    });
  };

  const handleRowClick = record => {
    setSelectedProtocol(record);
    setIsEditModalOpen(true);
  };

  if (isLoadingLaboratories) {
    return (
      <ProtocolsPageWrapper>
        <Layout title="Протоколы">
          <div style={{ position: 'relative' }}>
            <LoadingCard />
          </div>
        </Layout>
      </ProtocolsPageWrapper>
    );
  }

  // Если лаборатория не выбрана, показываем список лабораторий
  if (!selectedLaboratory) {
    return (
      <ProtocolsPageWrapper>
        <Layout title="Протоколы">
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
      </ProtocolsPageWrapper>
    );
  }

  // Если есть подразделения и подразделение еще не выбрано, показываем список подразделений
  if (departments.length > 0 && !selectedDepartment) {
    return (
      <ProtocolsPageWrapper>
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
      </ProtocolsPageWrapper>
    );
  }

  // Показываем таблицу с протоколами
  return (
    <ProtocolsPageWrapper>
      <Layout title={selectedDepartment ? selectedDepartment.name : selectedLaboratory.name}>
        <div style={{ height: 'calc(100vh - 87px)', display: 'flex', flexDirection: 'column' }}>
          <div
            className="header-actions"
            style={{ padding: '20px', display: 'flex', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button
                title="Назад"
                onClick={handleBack}
                type="default"
                className="back-btn"
                icon={<ArrowLeftOutlined />}
              />
              <Button
                title="Редактировать шаблон"
                onClick={() => setIsTemplateModalOpen(true)}
                type="primary"
              />
            </div>
            <Button
              title="Создать"
              onClick={() => setIsCreateModalOpen(true)}
              buttonColor="#0066cc"
              type="primary"
              icon={<PlusOutlined />}
            />
          </div>

          <div
            className="protocols-list"
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
              loading={isLoadingProtocols}
              dataSource={protocols}
              rowKey="id"
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
            />
          </div>
        </div>

        {isCreateModalOpen && (
          <CreateProtocolModal
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={handleCreateModalSuccess}
            laboratoryId={selectedLaboratory.id}
            departmentId={selectedDepartment?.id}
          />
        )}

        {isEditModalOpen && selectedProtocol && (
          <EditProtocolModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSuccess={handleEditModalSuccess}
            protocol={selectedProtocol}
            laboratoryId={selectedLaboratory.id}
            departmentId={selectedDepartment?.id}
          />
        )}

        {isTemplateModalOpen && (
          <EditTemplateModal
            isOpen={isTemplateModalOpen}
            onClose={() => setIsTemplateModalOpen(false)}
            laboratoryId={selectedLaboratory.id}
            departmentId={selectedDepartment?.id}
          />
        )}
      </Layout>
    </ProtocolsPageWrapper>
  );
};

export default ProtocolsPage;
