import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Space, Input, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import Layout from '../../shared/ui/Layout/Layout';
import SamplesPageWrapper from './SamplesPageWrapper';
import CreateSampleModal from '../../features/Modals/CreateSampleModal/CreateSampleModal';
import EditSampleModal from '../../features/Modals/EditSampleModal/EditSampleModal';
import { Button } from '../../shared/ui/Button/Button';
import LoadingCard from '../../features/Cards/ui/LoadingCard/LoadingCard';
import dayjs from 'dayjs';
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
  const [laboratories, setLaboratories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedLaboratory, setSelectedLaboratory] = useState(null);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  // Загрузка списка лабораторий
  useEffect(() => {
    const fetchLaboratories = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/laboratories/`);
        setLaboratories(response.data || []);
      } catch (error) {
        console.error('Ошибка при загрузке лабораторий:', error);
        message.error('Не удалось загрузить список лабораторий');
      } finally {
        setLoading(false);
      }
    };

    fetchLaboratories();
  }, []);

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

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    loadSamples(selectedLaboratory.id, selectedDepartment?.id); // Обновляем список проб после успешного создания с учетом подразделения
  };

  const loadSamples = async (laboratoryId, departmentId = null) => {
    setLoading(true);
    try {
      const params = {
        laboratory: laboratoryId,
      };
      if (departmentId) {
        params.department = departmentId;
      }
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/samples/`, {
        params,
      });
      setSamples(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке проб:', error);
      message.error('Не удалось загрузить список проб');
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
    loadSamples(selectedLaboratory.id, selectedDepartment?.id); // Обновляем список проб после успешного редактирования с учетом подразделения
  };

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
        // Если нет подразделений, сразу загружаем пробы для лаборатории
        await loadSamples(laboratory.id);
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
      await loadSamples(selectedLaboratory.id, department.id);
    } catch (error) {
      console.error('Ошибка при загрузке проб:', error);
      message.error('Не удалось загрузить пробы');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    // Если мы на странице с таблицей проб и есть подразделения
    if (selectedDepartment && departments.length > 0) {
      // Возвращаемся к выбору подразделения
      setSelectedDepartment(null);
      setSamples([]);
    } else {
      // Возвращаемся к выбору лаборатории
      setSelectedLaboratory(null);
      setSelectedDepartment(null);
      setDepartments([]);
      setSamples([]);
    }
  };

  if (loading) {
    return (
      <SamplesPageWrapper>
        <Layout title={selectedLaboratory ? selectedLaboratory.name : 'Пробы'}>
          <div style={{ position: 'relative', minHeight: 'calc(100vh - 64px)' }}>
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

  // Если есть подразделения и подразделение еще не выбрано, показываем список подразделений
  if (departments.length > 0 && !selectedDepartment) {
    return (
      <SamplesPageWrapper>
        <Layout title={selectedLaboratory.name}>
          <div className="departments-container">
            <div className="departments-header">
              <Button title="Назад" onClick={handleBack} type="default" className="back-btn" />
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
      <Layout title={selectedLaboratory.name}>
        <div style={{ height: 'calc(100vh - 87px)', display: 'flex', flexDirection: 'column' }}>
          <div
            className="header-actions"
            style={{ padding: '20px', display: 'flex', justifyContent: 'space-between' }}
          >
            <Button title="Назад" onClick={handleBack} type="default" className="back-btn" />
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
