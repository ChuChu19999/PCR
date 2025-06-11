import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Select, Form, Button, Table, Input, Space } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons';
import { Resizable } from 'react-resizable';
import Layout from '../../shared/ui/Layout/Layout';
import ProtocolsPageWrapper from './ProtocolsPageWrapper';
import EditProtocolModal from '../../features/Modals/EditProtocolModal/EditProtocolModal';
import CreateProtocolModal from '../../features/Modals/CreateProtocolModal/CreateProtocolModal';
import EditTemplateModal from '../../features/Modals/ShablonEditModal/EditTemplateModal.jsx';

const { Option } = Select;

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

const ResizableTitle = props => {
  const { onResize, width, ...restProps } = props;

  if (!width) {
    return <th {...restProps} />;
  }

  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className="react-resizable-handle"
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            right: -5,
            bottom: 0,
            zIndex: 1,
            width: 10,
            height: '100%',
            cursor: 'col-resize',
          }}
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};

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
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [columnsState, setColumnsState] = useState({
    test_protocol_number: { width: 150 },
    registration_number: { width: 150 },
    test_object: { width: 200 },
    sampling_date: { width: 150 },
    receiving_date: { width: 150 },
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
      if (dataIndex === 'sampling_date' || dataIndex === 'receiving_date') {
        return formatDate(record[dataIndex], record.is_accredited)
          .toLowerCase()
          .includes(value.toLowerCase());
      }
      return record[dataIndex]
        ? record[dataIndex].toString().toLowerCase().includes(value.toLowerCase())
        : '';
    },
    render: (text, record) => {
      if (dataIndex === 'sampling_date' || dataIndex === 'receiving_date') {
        return formatDate(text, record.is_accredited);
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

  const handleResize =
    index =>
    (e, { size }) => {
      const newColumns = [...columns];
      newColumns[index] = {
        ...newColumns[index],
        width: size.width,
      };
      const newColumnsState = { ...columnsState };
      newColumnsState[newColumns[index].dataIndex] = { width: size.width };
      setColumnsState(newColumnsState);
    };

  const columns = [
    {
      title: '№ протокола',
      dataIndex: 'test_protocol_number',
      key: 'test_protocol_number',
      width: columnsState.test_protocol_number.width,
      sorter: (a, b) => {
        const numA = a.test_protocol_number || '';
        const numB = b.test_protocol_number || '';
        return numA.localeCompare(numB);
      },
      ...getColumnSearchProps('test_protocol_number', '№ протокола'),
      render: (text, record) =>
        formatProtocolNumber(text, record.test_protocol_date, record.is_accredited, record.samples),
    },
    {
      title: 'Рег. номер',
      dataIndex: 'registration_number',
      key: 'registration_number',
      width: columnsState.registration_number.width,
      sorter: (a, b) => a.registration_number.localeCompare(b.registration_number),
      ...getColumnSearchProps('registration_number', 'Рег. номеру'),
    },
    {
      title: 'Объект испытаний',
      dataIndex: 'test_object',
      key: 'test_object',
      width: columnsState.test_object.width,
      sorter: (a, b) => a.test_object.localeCompare(b.test_object),
      ...getColumnSearchProps('test_object', 'Объекту испытаний'),
    },
    {
      title: 'Дата отбора пробы',
      dataIndex: 'sampling_date',
      key: 'sampling_date',
      width: columnsState.sampling_date.width,
      sorter: (a, b) => new Date(a.sampling_date) - new Date(b.sampling_date),
      ...getColumnSearchProps('sampling_date', 'Дате отбора'),
      render: (text, record) => formatDate(text, record.is_accredited),
    },
    {
      title: 'Дата получения пробы',
      dataIndex: 'receiving_date',
      key: 'receiving_date',
      width: columnsState.receiving_date.width,
      sorter: (a, b) => new Date(a.receiving_date) - new Date(b.receiving_date),
      ...getColumnSearchProps('receiving_date', 'Дате получения'),
      render: (text, record) => formatDate(text, record.is_accredited),
    },
  ].map((col, index) => ({
    ...col,
    onHeaderCell: column => ({
      width: column.width,
      onResize: handleResize(index),
    }),
  }));

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
                  >
                    Создать
                  </Button>
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => setIsTemplateModalOpen(true)}
                  >
                    Редактировать шаблон
                  </Button>
                </Space>
              </Form.Item>
            </Form>
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
              components={{
                header: {
                  cell: ResizableTitle,
                },
              }}
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

          <EditTemplateModal
            isOpen={isTemplateModalOpen}
            onClose={() => setIsTemplateModalOpen(false)}
          />
        </div>
      </ProtocolsPageWrapper>
    </Layout>
  );
};

export default ProtocolsPage;
