import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EmptyPageWrapper from './LaboratoryPageWrapper';
import Layout from '../../shared/ui/Layout/Layout';
import { Button } from '../../shared/ui/Button/Button';
import AddDepartmentModal from '../../features/Modals/AddDepartmentModal/AddDepartmentModal';
import EditDepartmentModal from '../../features/Modals/EditDepartmentModal/EditDepartmentModal';
import DeleteDepartmentModal from '../../features/Modals/DeleteDepartmentModal/DeleteDepartmentModal';
import LoadingCard from '../../features/Cards/ui/LoadingCard/LoadingCard';
import axios from 'axios';
import './LaboratoryPage.css';

function LaboratoryPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [laboratory, setLaboratory] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLaboratory = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/laboratories/${id}/`);
      setLaboratory(response.data);
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error('Ошибка при загрузке лаборатории:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLaboratory();
  }, [id]);

  const handleEdit = (department, event) => {
    event.stopPropagation();
    setSelectedDepartment(department);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (department, event) => {
    event.stopPropagation();
    setSelectedDepartment(department);
    setIsDeleteModalOpen(true);
  };

  const handleModalClose = () => {
    setIsDeleteModalOpen(false);
    setIsEditModalOpen(false);
    setIsAddModalOpen(false);
    setSelectedDepartment(null);
  };

  const handleSuccess = () => {
    fetchLaboratory();
  };

  if (isLoading) {
    return (
      <EmptyPageWrapper>
        <Layout title="Загрузка...">
          <div
            className="departments-container"
            style={{ position: 'relative', minHeight: 'calc(100vh - 64px)' }}
          >
            <LoadingCard />
          </div>
        </Layout>
      </EmptyPageWrapper>
    );
  }

  if (!laboratory) {
    return null;
  }

  return (
    <EmptyPageWrapper>
      <Layout title={laboratory.name}>
        <div className="departments-container">
          <div className="departments-header">
            <Button
              title="Назад"
              onClick={() => navigate('/')}
              type="default"
              className="back-btn"
            />
            <Button
              title="Добавить подразделение"
              onClick={() => setIsAddModalOpen(true)}
              buttonColor="#0066cc"
              type="primary"
            />
          </div>

          <div className="departments-grid">
            {departments.map(department => (
              <div key={department.id} className="department-card">
                <div className="department-card-content">
                  <h3>{department.name}</h3>
                </div>
                <div className="department-card-actions">
                  <Button
                    title="Редактировать"
                    onClick={e => handleEdit(department, e)}
                    type="default"
                    className="edit-btn"
                  />
                  <Button
                    title="Удалить"
                    onClick={e => handleDeleteClick(department, e)}
                    type="default"
                    danger
                    className="delete-btn"
                  />
                </div>
              </div>
            ))}
            {departments.length === 0 && (
              <div className="no-departments">
                <div className="no-departments-actions">
                  <Button
                    title="Добавить первое подразделение"
                    onClick={() => setIsAddModalOpen(true)}
                    type="primary"
                    buttonColor="#0066cc"
                  />
                  <Button
                    title="Добавить расчеты"
                    onClick={() => console.log('Добавление расчетов')} // Заглушка для будущей функциональности
                    type="primary"
                    buttonColor="#0066cc"
                  />
                </div>
              </div>
            )}
          </div>

          <AddDepartmentModal
            isOpen={isAddModalOpen}
            onClose={handleModalClose}
            onSuccess={handleSuccess}
            laboratoryId={id}
          />

          <EditDepartmentModal
            isOpen={isEditModalOpen}
            onClose={handleModalClose}
            onSuccess={handleSuccess}
            department={selectedDepartment}
          />

          <DeleteDepartmentModal
            isOpen={isDeleteModalOpen}
            onClose={handleModalClose}
            onSuccess={handleSuccess}
            department={selectedDepartment}
          />
        </div>
      </Layout>
    </EmptyPageWrapper>
  );
}

export default LaboratoryPage;
