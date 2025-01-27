import React, { useEffect } from 'react';
import { DialogContent, DialogActions, TextField, Button, Box } from '@mui/material';
import api from '../api/config';
import BaseModal from './common/BaseModal';
import useForm from '../hooks/useForm';
import { API_ROUTES } from '../constants/apiRoutes';

function EditDepartmentModal({ open, onClose, onSuccess, department }) {
  const validate = values => {
    const errors = {};
    if (!values.name?.trim()) {
      errors.name = 'Название подразделения обязательно';
    }
    return errors;
  };

  const initialValues = department
    ? {
        name: department.name,
      }
    : { name: '' };

  const { values, errors, handleChange, validateForm, resetForm, setErrors } = useForm(
    initialValues,
    validate
  );

  useEffect(() => {
    if (department) {
      resetForm({
        name: department.name,
      });
    }
  }, [department]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await api.patch(API_ROUTES.DEPARTMENTS.GET_BY_ID(department.id), {
        name: values.name.trim(),
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Ошибка при обновлении подразделения:', error);
      setErrors({ name: 'Ошибка при обновлении подразделения' });
    }
  };

  return (
    <BaseModal open={open} onClose={onClose} title="Редактирование подразделения">
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              name="name"
              label="Название подразделения"
              value={values.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
              sx={{ mb: 2 }}
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

export default EditDepartmentModal;
