import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyPageWrapper from './MainPageWrapper';
import Layout from '../../shared/ui/Layout/Layout';
import { Button } from '../../shared/ui/Button/Button';
import EditLaboratoryModal from '../../features/Modals/EditLaboratoryModal/EditLaboratoryModal';
import AddLaboratoryModal from '../../features/Modals/AddLaboratoryModal/AddLaboratoryModal';
import DeleteLaboratoryModal from '../../features/Modals/DeleteLaboratoryModal/DeleteLaboratoryModal';
import EditTemplateModal from '../../features/Modals/ShablonEditModal/EditTemplateModal.jsx';
import LoadingCard from '../../features/Cards/ui/LoadingCard/LoadingCard';
import axios from 'axios';
import './MainPage.css';

function MainPage() {
  const navigate = useNavigate();
  const [laboratories, setLaboratories] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedLaboratory, setSelectedLaboratory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

  const fetchLaboratories = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/laboratories/`);
      setLaboratories(response.data || []);
    } catch (error) {
      console.error('Ошибка при загрузке лабораторий:', error);
      setLaboratories([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLaboratories();
  }, []);

  const handleCardClick = async laboratory => {
    try {
      setIsNavigating(true);
      // Проверяем наличие страницы расчетов для лаборатории
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/research-pages/`, {
        params: {
          laboratory_id: laboratory.id,
          type: 'oil_products',
        },
      });

      // Если есть страница расчетов и department = null
      if (response.data.length > 0 && response.data[0].department === null) {
        navigate(`/laboratories/${laboratory.id}/oil-products`);
      } else {
        navigate(`/laboratory/${laboratory.id}`);
      }
    } catch (error) {
      console.error('Ошибка при проверке страницы расчетов:', error);
      navigate(`/laboratory/${laboratory.id}`);
    }
  };

  const handleEdit = (laboratory, event) => {
    event.stopPropagation();
    setSelectedLaboratory(laboratory);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (laboratory, event) => {
    event.stopPropagation();
    setSelectedLaboratory(laboratory);
    setIsDeleteModalOpen(true);
  };

  const handleModalClose = () => {
    setIsDeleteModalOpen(false);
    setIsEditModalOpen(false);
    setIsAddModalOpen(false);
    setIsTemplateModalOpen(false);
    setSelectedLaboratory(null);
  };

  const handleSuccess = () => {
    fetchLaboratories();
  };

  if (isLoading || isNavigating) {
    return (
      <EmptyPageWrapper>
        <Layout title="Главная">
          <div
            className="laboratories-container"
            style={{ position: 'relative', minHeight: 'calc(100vh - 64px)' }}
          >
            <LoadingCard />
          </div>
        </Layout>
      </EmptyPageWrapper>
    );
  }

  return (
    <EmptyPageWrapper>
      <Layout title="Главная">
        <div className="laboratories-container">
          <div className="laboratories-header">
            <Button
              title="Добавить лабораторию"
              onClick={() => setIsAddModalOpen(true)}
              buttonColor="#0066cc"
              type="primary"
            />
            <Button
              title="Редактировать шаблон"
              onClick={() => setIsTemplateModalOpen(true)}
              buttonColor="#0066cc"
              type="primary"
            />
          </div>

          <div className="laboratories-grid">
            {Array.isArray(laboratories) &&
              laboratories.map(laboratory => (
                <div
                  key={laboratory.id}
                  className="laboratory-card"
                  onClick={() => handleCardClick(laboratory)}
                >
                  <div className="laboratory-card-content">
                    <h3>{laboratory.name}</h3>
                    <p>{laboratory.description}</p>
                    <div className="laboratory-info">
                      <span>{laboratory.full_name}</span>
                    </div>
                  </div>
                  <div className="laboratory-card-actions">
                    <Button
                      title="Редактировать"
                      onClick={e => handleEdit(laboratory, e)}
                      type="default"
                      className="edit-btn"
                    />
                    <Button
                      title="Удалить"
                      onClick={e => handleDeleteClick(laboratory, e)}
                      type="default"
                      danger
                      className="delete-btn"
                    />
                  </div>
                </div>
              ))}
            {(!Array.isArray(laboratories) || laboratories.length === 0) && (
              <div className="no-laboratories">
                <p>Лаборатории не найдены</p>
                <Button
                  title="Добавить первую лабораторию"
                  onClick={() => setIsAddModalOpen(true)}
                  type="primary"
                  buttonColor="#0066cc"
                />
              </div>
            )}
          </div>

          <EditLaboratoryModal
            isOpen={isEditModalOpen}
            onClose={handleModalClose}
            onSuccess={handleSuccess}
            laboratory={selectedLaboratory}
          />

          <AddLaboratoryModal
            isOpen={isAddModalOpen}
            onClose={handleModalClose}
            onSuccess={handleSuccess}
          />

          <DeleteLaboratoryModal
            isOpen={isDeleteModalOpen}
            onClose={handleModalClose}
            onSuccess={handleSuccess}
            laboratory={selectedLaboratory}
          />

          <EditTemplateModal isOpen={isTemplateModalOpen} onClose={handleModalClose} />
        </div>
      </Layout>
    </EmptyPageWrapper>
  );
}

export default MainPage;
