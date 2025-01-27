import React, { useEffect } from 'react';
import { DialogContent, DialogActions, TextField, Button, Box } from '@mui/material';
import api from '../api/config';
import BaseModal from './common/BaseModal';
import useForm from '../hooks/useForm';
import { API_ROUTES } from '../constants/apiRoutes';

function EditLaboratoryModal({ open, onClose, onSuccess, laboratory }) {
  const validate = values => {
    const errors = {};
    if (!values.name?.trim() || !values.full_name?.trim()) {
      errors.general = 'Все поля обязательны для заполнения';
    }
    return errors;
  };

  const initialValues = laboratory
    ? {
        name: laboratory.name,
        full_name: laboratory.full_name,
      }
    : { name: '', full_name: '' };

  const { values, errors, handleChange, validateForm, resetForm, setErrors } = useForm(
    initialValues,
    validate
  );

  useEffect(() => {
    if (laboratory) {
      resetForm({
        name: laboratory.name,
        full_name: laboratory.full_name,
      });
    }
  }, [laboratory]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await api.patch(API_ROUTES.LABORATORIES.GET_BY_ID(laboratory.id), {
        name: values.name.trim(),
        full_name: values.full_name.trim(),
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Ошибка при обновлении лаборатории:', error);
      setErrors({ general: 'Ошибка при обновлении лаборатории' });
    }
  };

  return (
    <BaseModal open={open} onClose={onClose} title="Редактирование лаборатории">
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              name="name"
              label="Аббревиатура"
              value={values.name}
              onChange={handleChange}
              error={!!errors.general}
              helperText={errors.general}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              name="full_name"
              label="Полное название"
              value={values.full_name}
              onChange={handleChange}
              error={!!errors.general}
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
          <Button onClick={onClose} variant="outlined" sx={{ minWidth: 100 }}>
            Отмена
          </Button>
          <Button type="submit" variant="contained" sx={{ minWidth: 100 }}>
            Сохранить
          </Button>
        </DialogActions>
      </form>
    </BaseModal>
  );
}

export default EditLaboratoryModal;
