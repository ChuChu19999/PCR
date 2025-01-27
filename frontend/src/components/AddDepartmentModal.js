import React from 'react';
import { DialogContent, DialogActions, TextField, Button, Box } from '@mui/material';
import api from '../api/config';
import BaseModal from './common/BaseModal';
import useForm from '../hooks/useForm';

function AddDepartmentModal({ open, onClose, onSuccess, laboratoryId }) {
  const validate = values => {
    const errors = {};
    if (!values.name) {
      errors.name = 'Название обязательно';
    }
    return errors;
  };

  const { values, errors, handleChange, validateForm, resetForm, setErrors } = useForm(
    { name: '', laboratory: laboratoryId },
    validate
  );

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await api.post('/api/departments/', values);
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        setErrors({ general: 'Произошла ошибка при создании подразделения' });
      }
    }
  };

  return (
    <BaseModal open={open} onClose={onClose} title="Добавление подразделения">
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              name="name"
              label="Название"
              value={values.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
              fullWidth
              required
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

export default AddDepartmentModal;
