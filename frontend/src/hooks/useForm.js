import { useState } from 'react';

function useForm(initialValues, validate) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const handleChange = e => {
    const { name, value } = e.target;
    setValues(prev => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = validate(values);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = (newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
  };

  const setFormValues = newValues => {
    setValues(newValues);
  };

  return {
    values,
    errors,
    handleChange,
    validateForm,
    resetForm,
    setErrors,
    setFormValues,
  };
}

export default useForm;
