import React, { useState, useEffect } from 'react';
import { Typography, Grid, Card, CardContent, IconButton, Box } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CalculateIcon from '@mui/icons-material/Calculate';
import BusinessIcon from '@mui/icons-material/Business';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import api from '../api/config';
import AddDepartmentModal from './AddDepartmentModal';
import EditDepartmentModal from './EditDepartmentModal';
import DeleteConfirmationModal from './common/DeleteConfirmationModal';
import './styles/LaboratoryPage.css';
import { API_ROUTES } from '../constants/apiRoutes';

function LaboratoryPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [laboratory, setLaboratory] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  const fetchLaboratory = async () => {
    try {
      const response = await api.get(API_ROUTES.LABORATORIES.GET_BY_ID(id));
      setLaboratory(response.data);
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error('Ошибка при загрузке лаборатории:', error);
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

  const handleDelete = async () => {
    try {
      await api.delete(API_ROUTES.DEPARTMENTS.DELETE(selectedDepartment.id));
      await fetchLaboratory();
      setIsDeleteModalOpen(false);
      setSelectedDepartment(null);
    } catch (error) {
      console.error('Ошибка при удалении подразделения:', error);
    }
  };

  const handleSpeedDialClose = () => {
    setSpeedDialOpen(false);
  };

  const handleSpeedDialOpen = () => {
    setSpeedDialOpen(true);
  };

  const handleAddDepartment = () => {
    setIsAddModalOpen(true);
    setSpeedDialOpen(false);
  };

  const handleAddCalculations = () => {
    // Пока что заглушка для будущей функциональности
    console.log('Добавление расчетов');
    setSpeedDialOpen(false);
  };

  if (!laboratory) {
    return null;
  }

  return (
    <div className="laboratory-page-container">
      <Grid container spacing={3}>
        <Grid
          item
          xs={12}
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 3,
            position: 'relative',
          }}
        >
          <IconButton
            onClick={() => navigate('/')}
            sx={{
              position: 'absolute',
              left: 20,
              zIndex: 1,
              color: '#1976d2',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
              },
            }}
          >
            <ArrowBackIcon />
          </IconButton>

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
            {laboratory.name}
          </Typography>
        </Grid>

        {/* Сетка подразделений */}
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
            {departments.map(department => (
              <div
                key={department.id}
                style={{
                  flex: '0 0 calc(33.333% - 16px)',
                  minWidth: '300px',
                }}
              >
                <Card className="department-card" sx={{ borderRadius: '12px' }}>
                  <CardContent
                    sx={{
                      flexGrow: 1,
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '150px',
                      position: 'relative',
                    }}
                  >
                    <Box className="card-actions">
                      <IconButton
                        size="small"
                        onClick={e => handleEdit(department, e)}
                        className="edit-button"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={e => handleDeleteClick(department, e)}
                        className="delete-button"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    <Typography
                      variant="h4"
                      sx={{
                        color: '#1976d2',
                        fontWeight: 800,
                        fontSize: '1.5rem',
                        letterSpacing: '0.3px',
                      }}
                    >
                      {department.name}
                    </Typography>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </Grid>
      </Grid>

      {/* Заменяем FAB на SpeedDial */}
      <SpeedDial
        ariaLabel="Добавить"
        sx={{
          position: 'fixed',
          bottom: 18,
          right: 18,
          '& .MuiSpeedDial-fab': {
            background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1976d2 50%, #2196f3 100%)',
            },
          },
          '& .MuiSpeedDial-actions': {
            gap: '8px',
            paddingBottom: '40px',
            paddingRight: '2.5px',
          },
          '& .MuiSpeedDialAction-fab': {
            margin: 0,
          },
        }}
        direction="up"
        FabProps={{
          size: 'large',
        }}
        icon={<SpeedDialIcon />}
        onClose={handleSpeedDialClose}
        onOpen={handleSpeedDialOpen}
        open={speedDialOpen}
      >
        {departments.length === 0 ? (
          [
            <SpeedDialAction
              key="department"
              icon={<BusinessIcon />}
              tooltipTitle="Добавить подразделение"
              onClick={handleAddDepartment}
            />,
            <SpeedDialAction
              key="calculations"
              icon={<CalculateIcon />}
              tooltipTitle="Добавить расчеты"
              onClick={handleAddCalculations}
            />,
          ]
        ) : (
          <SpeedDialAction
            key="department"
            icon={<BusinessIcon />}
            tooltipTitle="Добавить подразделение"
            onClick={handleAddDepartment}
          />
        )}
      </SpeedDial>

      {/* Модальное окно добавления подразделения */}
      <AddDepartmentModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchLaboratory}
        laboratoryId={id}
      />

      {/* Модальное окно редактирования подразделения */}
      {selectedDepartment && (
        <EditDepartmentModal
          open={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedDepartment(null);
          }}
          onSuccess={fetchLaboratory}
          department={selectedDepartment}
        />
      )}

      {/* Модальное окно подтверждения удаления */}
      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedDepartment(null);
        }}
        onConfirm={handleDelete}
        title="Удаление подразделения"
        message={`Вы действительно хотите удалить подразделение "${selectedDepartment?.name}"?`}
      />
    </div>
  );
}

export default LaboratoryPage;
