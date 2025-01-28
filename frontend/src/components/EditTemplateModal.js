import React, { useState, useEffect, useRef } from 'react';
import {
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Snackbar,
  Alert,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import SaveIcon from '@mui/icons-material/Save';
import BaseModal from './common/BaseModal';
import ExcelEditor from './ExcelEditor';
import ConfirmDialog from './common/ConfirmDialog';

const EditTemplateModal = ({ open, onClose }) => {
  const [selectedSection, setSelectedSection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentData, setCurrentData] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const excelEditorRef = useRef(null);

  const sections = [
    {
      id: 'header',
      name: 'Шапка',
      description: 'Редактирование шапки документа',
      icon: <DescriptionIcon sx={{ color: '#1976d2' }} />,
    },
  ];

  // Сброс состояния при закрытии модального окна
  useEffect(() => {
    if (!open) {
      setSelectedSection(null);
      setCurrentData(null);
    }
  }, [open]);

  const handleSectionSelect = section => {
    setSelectedSection(section);
  };

  const handleBack = () => {
    setSelectedSection(null);
    setCurrentData(null);
  };

  const handleDataChange = data => {
    setCurrentData(data);
  };

  const reloadData = () => {
    if (excelEditorRef.current?.loadExcelData) {
      excelEditorRef.current.loadExcelData();
    }
  };

  const handleSaveClick = () => {
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsConfirmOpen(false);
    await handleSave();
  };

  const handleSave = async () => {
    if (!currentData) {
      console.error('Нет данных для сохранения');
      return;
    }

    try {
      setSaving(true);
      await excelEditorRef.current.saveDataWithStyles();

      setSnackbar({
        open: true,
        message: 'Шаблон успешно сохранен',
        severity: 'success',
      });

      setTimeout(() => {
        reloadData();
        setSaving(false);
      }, 500);
    } catch (error) {
      console.error('Ошибка при сохранении шаблона:', error);
      setSnackbar({
        open: true,
        message: 'Ошибка при сохранении шаблона',
        severity: 'error',
      });
      setSaving(false);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <>
      <BaseModal
        open={open}
        onClose={onClose}
        title="Редактирование шаблона"
        maxWidth={false}
        fullWidth
        titleIcon={<DescriptionIcon />}
        contentProps={{
          sx: {
            width: '65vw',
            height: '75vh',
            maxWidth: '1050px',
            maxHeight: '700px',
            overflow: 'auto',
            p: 0,
          },
        }}
      >
        <DialogContent
          sx={{
            p: 2,
            pt: 3,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
            height: '100%',
          }}
        >
          {!selectedSection ? (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                maxWidth: '600px',
                margin: '0 auto',
                width: '100%',
                pt: 1,
                px: 2,
              }}
            >
              <List sx={{ width: '100%' }}>
                {sections.map(section => (
                  <Paper key={section.id} elevation={0} sx={{ mb: 1.5, overflow: 'hidden' }}>
                    <ListItem
                      component="div"
                      onClick={() => handleSectionSelect(section)}
                      sx={{
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0',
                        p: 1.5,
                        mt: 0.5,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        transform: 'translateY(0)',
                        '&:hover': {
                          backgroundColor: '#f5f5f5',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 4px 20px rgba(25, 118, 210, 0.15)',
                          borderColor: '#1976d2',
                        },
                      }}
                    >
                      <ListItemIcon>{section.icon}</ListItemIcon>
                      <ListItemText
                        primary={section.name}
                        secondary={section.description}
                        primaryTypographyProps={{
                          sx: {
                            color: '#1976d2',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            mb: 0.5,
                            cursor: 'pointer',
                          },
                        }}
                        secondaryTypographyProps={{
                          sx: {
                            color: '#666',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                          },
                        }}
                      />
                      <KeyboardArrowRightIcon
                        sx={{
                          color: '#1976d2',
                          cursor: 'pointer',
                          fontSize: '1.2rem',
                        }}
                      />
                    </ListItem>
                  </Paper>
                ))}
              </List>
            </Box>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                pt: 2,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  mb: 2,
                  px: 2,
                }}
              >
                <Button
                  onClick={handleBack}
                  startIcon={<KeyboardBackspaceIcon />}
                  variant="outlined"
                  size="small"
                  sx={{
                    minWidth: 160,
                    cursor: 'pointer',
                  }}
                >
                  Назад к разделам
                </Button>
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: '#2c3e50',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  {selectedSection.icon}
                  {selectedSection.name}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, overflow: 'auto', px: 2 }}>
                <ExcelEditor
                  ref={excelEditorRef}
                  onDataChange={handleDataChange}
                  section={selectedSection.id}
                />
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            p: 1.5,
            justifyContent: 'center',
            borderTop: '1px solid #e0e0e0',
            gap: 1.5,
          }}
        >
          <Button
            onClick={onClose}
            variant="outlined"
            size="small"
            sx={{
              minWidth: 90,
              cursor: 'pointer',
            }}
          >
            Отмена
          </Button>
          {selectedSection && (
            <Button
              onClick={handleSaveClick}
              variant="contained"
              size="small"
              disabled={saving}
              startIcon={<SaveIcon />}
              sx={{
                minWidth: 90,
                cursor: 'pointer',
                background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1976d2 50%, #2196f3 100%)',
                },
              }}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          )}
        </DialogActions>
      </BaseModal>

      <ConfirmDialog
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        title="Подтверждение сохранения"
        message="Вы действительно хотите сохранить изменения в шаблоне?"
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          elevation={6}
          sx={{
            minWidth: '300px',
            borderRadius: '8px',
            '& .MuiAlert-icon': {
              fontSize: '24px',
            },
            '& .MuiAlert-message': {
              fontSize: '16px',
              fontWeight: 500,
            },
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default EditTemplateModal;
