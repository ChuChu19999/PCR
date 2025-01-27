import React, { useState, useEffect } from 'react';
import { Typography, Grid, Card, CardContent, Box, Fab, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../api/config';
import AddLaboratoryModal from './AddLaboratoryModal';
import EditLaboratoryModal from './EditLaboratoryModal';
import DeleteConfirmationModal from './common/DeleteConfirmationModal';
import './styles/MainPage.css';

function MainPage() {
  const navigate = useNavigate();
  const [laboratories, setLaboratories] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLaboratory, setSelectedLaboratory] = useState(null);

  const fetchLaboratories = async () => {
    try {
      const response = await api.get('/api/laboratories/');
      setLaboratories(response.data || []);
    } catch (error) {
      console.error('Ошибка при загрузке лабораторий:', error);
      setLaboratories([]);
    }
  };

  useEffect(() => {
    fetchLaboratories();
  }, []);

  const handleCardClick = laboratory => {
    navigate(`/laboratory/${laboratory.id}`);
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

  const handleDelete = async () => {
    try {
      await api.delete(`/api/laboratories/${selectedLaboratory.id}/`);
      await fetchLaboratories();
      setIsDeleteModalOpen(false);
      setSelectedLaboratory(null);
    } catch (error) {
      console.error('Ошибка при удалении лаборатории:', error);
    }
  };

  return (
    <div className="main-page-container">
      <Grid container spacing={3}>
        <Grid
          item
          xs={12}
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Typography
            variant="h5"
            component="h1"
            sx={{
              color: '#2c3e50',
              fontWeight: 700,
              letterSpacing: '0.3px',
              display: 'inline-block',
              margin: '0 auto',
              padding: '0 20px',
              background: 'linear-gradient(45deg, #1976d2 30%, #2c3e50 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'scale(1.03)',
                background: 'linear-gradient(45deg, #2196f3 30%, #3f51b5 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 20px rgba(33, 150, 243, 0.1)',
              },
            }}
          >
            Испытательные лаборатории
          </Typography>
        </Grid>

        {/* Сетка лабораторий */}
        <Grid item xs={12}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '24px',
              padding: '0 16px',
              minHeight: '100px',
            }}
          >
            {laboratories.map(laboratory => (
              <div
                key={laboratory.id}
                style={{
                  flex: '0 0 calc(33.333% - 16px)',
                  minWidth: '300px',
                }}
              >
                <Card
                  className="institute-card"
                  onClick={() => handleCardClick(laboratory)}
                  sx={{ borderRadius: '12px' }}
                >
                  <CardContent sx={{ flexGrow: 1, textAlign: 'center', position: 'relative' }}>
                    <Box className="card-actions">
                      <IconButton
                        size="small"
                        onClick={e => handleEdit(laboratory, e)}
                        className="edit-button"
                        sx={{
                          color: '#1976d2 !important',
                          backgroundColor: 'transparent !important',
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={e => handleDeleteClick(laboratory, e)}
                        className="delete-button"
                        sx={{
                          color: '#1976d2 !important',
                          backgroundColor: 'transparent !important',
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    <Typography
                      variant="h6"
                      component="div"
                      sx={{
                        color: '#1976d2',
                        marginBottom: '16px',
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        letterSpacing: '0.3px',
                      }}
                    >
                      {laboratory.name}
                    </Typography>
                    <Box className="description-box">
                      <Typography variant="body1" className="description-text">
                        {laboratory.full_name}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </Grid>
      </Grid>

      {/* Кнопка добавления */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={() => setIsAddModalOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 18,
          right: 18,
          background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
          '&:hover': {
            background: 'linear-gradient(45deg, #1976d2 50%, #2196f3 100%)',
          },
        }}
      >
        <AddIcon />
      </Fab>

      {/* Модальное окно добавления лаборатории */}
      <AddLaboratoryModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchLaboratories}
      />

      {/* Модальное окно редактирования лаборатории */}
      {selectedLaboratory && (
        <EditLaboratoryModal
          open={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedLaboratory(null);
          }}
          onSuccess={fetchLaboratories}
          laboratory={selectedLaboratory}
        />
      )}

      {/* Модальное окно подтверждения удаления */}
      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedLaboratory(null);
        }}
        onConfirm={handleDelete}
        title="Удаление лаборатории"
        message={`Вы действительно хотите удалить лабораторию "${selectedLaboratory?.name}"?`}
      />
    </div>
  );
}

export default MainPage;
