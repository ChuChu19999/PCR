import React from 'react';
import { DialogContent, DialogActions, TextField, Button, Box } from '@mui/material';
import api from '../api/config';
import BaseModal from './common/BaseModal';
import useForm from '../hooks/useForm';
import { API_ROUTES } from '../constants/apiRoutes';

function AddLaboratoryModal({ open, onClose, onSuccess }) {
  const validate = values => {
    const errors = {};
    if (!values.name) {
      errors.name = 'Аббревиатура обязательна';
    }
    if (!values.full_name) {
      errors.full_name = 'Полное название обязательно';
    }
    return errors;
  };

  const { values, errors, handleChange, validateForm, resetForm, setErrors } = useForm(
    { name: '', full_name: '' },
    validate
  );

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await api.post(API_ROUTES.LABORATORIES.BASE, values);
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        setErrors({ general: 'Произошла ошибка при создании лаборатории' });
      }
    }
  };

  return (
    <BaseModal open={open} onClose={onClose} title="Добавление лаборатории">
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              name="name"
              label="Аббревиатура"
              value={values.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
              fullWidth
              required
            />
            <TextField
              name="full_name"
              label="Полное название"
              value={values.full_name}
              onChange={handleChange}
              error={!!errors.full_name}
              helperText={errors.full_name}
              fullWidth
              required
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
            Создать
          </Button>
        </DialogActions>
      </form>
    </BaseModal>
  );
}

export default AddLaboratoryModal;
