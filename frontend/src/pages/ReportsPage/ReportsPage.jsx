import React, { useState } from 'react';
import { Table } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftOutlined } from '@ant-design/icons';
import Layout from '../../shared/ui/Layout/Layout';
import ReportsPageWrapper from './ReportsPageWrapper';
import { reportsApi } from '../../shared/api/reports';
import { employeesApi } from '../../shared/api/employees';
import LoadingCard from '../../features/Cards/ui/LoadingCard/LoadingCard';
import { Button } from '../../shared/ui/Button/Button';
import ReportTemplateModal from '../../features/Modals/ReportTemplateModal/ReportTemplateModal';
import SaveReportModal from '../../features/Modals/SaveReportModal/SaveReportModal';
import './ReportsPage.css';

const ReportsPage = () => {
  const [selectedLaboratory, setSelectedLaboratory] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSaveReportModalOpen, setIsSaveReportModalOpen] = useState(false);

  // Запрос списка лабораторий
  const { data: laboratories = [], isLoading: isLoadingLaboratories } = useQuery({
    queryKey: ['laboratories-reports'],
    queryFn: reportsApi.getLaboratories,
  });
  // Запрос подразделений выбранной лаборатории
  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery({
    queryKey: ['departments-reports', selectedLaboratory?.id],
    queryFn: () => reportsApi.getDepartments(selectedLaboratory?.id),
    enabled: !!selectedLaboratory?.id,
  });
  // Запрос отчетов при выборе лаборатории/подразделения
  const { data: reports = [], isLoading: isLoadingReports } = useQuery({
    queryKey: ['reports', selectedLaboratory?.id, selectedDepartment?.id],
    queryFn: async () => {
      const raw = await reportsApi.getReports({
        laboratoryId: selectedLaboratory?.id,
        departmentId: selectedDepartment?.id,
      });

      // Преобразуем executors (hash массив) → строка с ФИО
      return await Promise.all(
        raw.map(async item => {
          let fullNames = '-';
          let hashes = [];
          if (Array.isArray(item.executors)) {
            hashes = item.executors;
          } else if (typeof item.executors === 'string' && item.executors.trim()) {
            hashes = item.executors
              .split(/[,;\s]+/)
              .map(h => h.trim())
              .filter(Boolean);
          }

          if (hashes.length) {
            const names = await Promise.all(
              hashes.map(async h => {
                const e = await employeesApi.getByHash(h);
                return e?.fullName || h;
              })
            );
            fullNames = names.join(', ');
          }
          return { ...item, executors: fullNames };
        })
      );
    },
    enabled: !!selectedLaboratory?.id,
  });
  // Определение колонок таблицы
  const columns = [
    {
      title: '№ п/п',
      dataIndex: 'serial',
      key: 'serial',
      width: 90,
      render: (text, record, index) => index + 1,
    },
    {
      title: 'Рег. №',
      dataIndex: 'registration_number',
      key: 'registration_number',
    },
    {
      title: 'Место отбора',
      dataIndex: 'sampling_location_detail',
      key: 'sampling_location_detail',
      render: text => text || '-',
    },
    {
      title: 'Дата отбора',
      dataIndex: 'sampling_date',
      key: 'sampling_date',
      render: text => (text ? new Date(text).toLocaleDateString('ru-RU') : '-'),
    },
    {
      title: 'Дата доставки',
      dataIndex: 'receiving_date',
      key: 'receiving_date',
      render: text => (text ? new Date(text).toLocaleDateString('ru-RU') : '-'),
    },
    {
      title: 'Условия отбора',
      dataIndex: 'selection_conditions',
      key: 'selection_conditions',
      render: value => <span style={{ whiteSpace: 'pre-line' }}>{value || '-'}</span>,
    },
    {
      title: 'Кол-во показателей',
      dataIndex: 'calculations_count',
      key: 'calculations_count',
    },
    {
      title: 'Исполнитель',
      dataIndex: 'executors',
      key: 'executors',
      render: value => <span style={{ whiteSpace: 'pre-line' }}>{value || '-'}</span>,
    },
    {
      title: 'Вып.',
      dataIndex: 'performed',
      key: 'performed',
      render: () => '-',
    },
    {
      title: 'Отпр.',
      dataIndex: 'sent',
      key: 'sent',
      render: () => '-',
    },
    {
      title: 'Провел регистрацию',
      dataIndex: 'registrar',
      key: 'registrar',
      render: () => '-',
    },
    {
      title: 'Примечание',
      dataIndex: 'protocol_number',
      key: 'protocol_number',
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

  // Обработка состояний загрузки и условный рендер
  if (isLoadingLaboratories) {
    return (
      <ReportsPageWrapper>
        <Layout title="Отчеты">
          <div style={{ position: 'relative' }}>
            <LoadingCard />
          </div>
        </Layout>
      </ReportsPageWrapper>
    );
  }

  // Выбор лаборатории
  if (!selectedLaboratory) {
    return (
      <ReportsPageWrapper>
        <Layout title="Отчеты">
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
      </ReportsPageWrapper>
    );
  }

  // Загрузка подразделений
  if (isLoadingDepartments) {
    return (
      <ReportsPageWrapper>
        <Layout title={selectedLaboratory.name}>
          <div style={{ position: 'relative' }}>
            <LoadingCard />
          </div>
        </Layout>
      </ReportsPageWrapper>
    );
  }

  // Выбор подразделения
  if (departments.length > 0 && !selectedDepartment) {
    return (
      <ReportsPageWrapper>
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
              <Button
                title="Редактировать шаблон"
                type="primary"
                onClick={() => setIsTemplateModalOpen(true)}
                style={{ marginLeft: 10 }}
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
      </ReportsPageWrapper>
    );
  }

  // Основная таблица
  return (
    <ReportsPageWrapper>
      <Layout title={selectedDepartment ? selectedDepartment.name : selectedLaboratory.name}>
        <div style={{ height: 'calc(100vh - 87px)', display: 'flex', flexDirection: 'column' }}>
          <div
            className="header-actions"
            style={{ padding: '20px', display: 'flex', justifyContent: 'flex-start' }}
          >
            <Button
              title="Назад"
              onClick={handleBack}
              type="default"
              className="back-btn"
              icon={<ArrowLeftOutlined />}
            />
            <Button
              title="Редактировать шаблон"
              type="primary"
              onClick={() => setIsTemplateModalOpen(true)}
              style={{ marginLeft: 10 }}
            />
            <Button
              title="Сохранить отчет"
              type="primary"
              onClick={() => setIsSaveReportModalOpen(true)}
              style={{ marginLeft: 10 }}
            />
            {isTemplateModalOpen && (
              <ReportTemplateModal
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                laboratoryId={selectedLaboratory.id}
                departmentId={selectedDepartment?.id}
              />
            )}
            {isSaveReportModalOpen && (
              <SaveReportModal
                isOpen={isSaveReportModalOpen}
                onClose={() => setIsSaveReportModalOpen(false)}
                laboratoryId={selectedLaboratory.id}
                departmentId={selectedDepartment?.id}
              />
            )}
          </div>

          <div
            className="reports-list"
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
              loading={isLoadingReports}
              dataSource={reports}
              rowKey="sample_id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: total => `Всего: ${total} данных`,
                pageSizeOptions: ['10', '20', '50', '100'],
                locale: { items_per_page: '' },
              }}
              locale={{
                emptyText: 'Отчеты не найдены',
                triggerDesc: 'Сортировать по убыванию',
                triggerAsc: 'Сортировать по возрастанию',
                cancelSort: 'Отменить сортировку',
              }}
            />
          </div>
        </div>
      </Layout>
    </ReportsPageWrapper>
  );
};

export default ReportsPage;
