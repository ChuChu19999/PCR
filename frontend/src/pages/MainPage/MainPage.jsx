import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlusOutlined } from '@ant-design/icons';
import { Player } from '@lottiefiles/react-lottie-player';
import EmptyPageWrapper from './MainPageWrapper';
import Layout from '../../shared/ui/Layout/Layout';
import { Button } from '../../shared/ui/Button/Button';
import EditLaboratoryModal from '../../features/Modals/EditLaboratoryModal/EditLaboratoryModal';
import AddLaboratoryModal from '../../features/Modals/AddLaboratoryModal/AddLaboratoryModal';
import DeleteLaboratoryModal from '../../features/Modals/DeleteLaboratoryModal/DeleteLaboratoryModal';
import LoadingCard from '../../features/Cards/ui/LoadingCard/LoadingCard';
import Bubble from '../../shared/ui/Bubble/Bubble';
import chemistryAnimation from '../../shared/assets/animations/chemistry-lab.json';
import axios from 'axios';
import './MainPage.css';

function MainPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [laboratories, setLaboratories] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLaboratory, setSelectedLaboratory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

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
    const adminParam = searchParams.get('admin');
    if (adminParam === 'true') {
      setShowAdmin(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (showAdmin) {
      fetchLaboratories();
    }
  }, [showAdmin]);

  const handleCardClick = async laboratory => {
    try {
      setIsNavigating(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/research-pages/`, {
        params: {
          laboratory_id: laboratory.id,
          type: 'oil_products',
        },
      });

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
    setSelectedLaboratory(null);
  };

  const handleSuccess = () => {
    fetchLaboratories();
  };

  if (isLoading || isNavigating) {
    return (
      <EmptyPageWrapper>
        <Layout title={showAdmin ? 'Администрирование' : 'Главная'}>
          <div className="laboratories-container" style={{ position: 'relative' }}>
            <LoadingCard />
          </div>
        </Layout>
      </EmptyPageWrapper>
    );
  }

  if (!showAdmin) {
    return (
      <EmptyPageWrapper>
        <Layout title="Главная">
          <div className="main-page-container">
            <div className="welcome-content">
              <div className="welcome-text-content">
                <div className="welcome-bubbles">
                  <Bubble text="Права пользователя" color="#007DFE" />
                  <Bubble text="Версия 0.0.1" color="#619BEF" textColor="#fff" />
                </div>
                <h1 className="welcome-title">Лаборант ФХИ</h1>
                <p className="welcome-subtitle">
                  Система управления физико-химическими испытаниями и лабораторной документацией
                </p>
                <Button
                  title="Управление лабораториями"
                  onClick={() => setShowAdmin(true)}
                  buttonColor="#0066cc"
                  type="primary"
                  className="admin-button"
                />
              </div>
              <div className="welcome-animation">
                <Player
                  autoplay
                  loop
                  src={chemistryAnimation}
                  style={{ height: '400px', width: '400px' }}
                />
              </div>
            </div>
          </div>
        </Layout>
      </EmptyPageWrapper>
    );
  }

  return (
    <EmptyPageWrapper>
      <Layout title="Управление лабораториями">
        <div className="laboratories-container">
          <div className="laboratories-header">
            <Button
              title="Вернуться на главную"
              onClick={() => setShowAdmin(false)}
              buttonColor="#0066cc"
              type="primary"
            />
            {Array.isArray(laboratories) && laboratories.length > 0 && (
              <Button
                title="Добавить лабораторию"
                onClick={() => setIsAddModalOpen(true)}
                buttonColor="#0066cc"
                type="primary"
                icon={<PlusOutlined />}
              />
            )}
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
                  icon={<PlusOutlined />}
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
        </div>
      </Layout>
    </EmptyPageWrapper>
  );
}

export default MainPage;
