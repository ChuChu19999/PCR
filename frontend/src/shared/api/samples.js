import axios from 'axios';

export const samplesApi = {
  // Получение списка лабораторий
  getLaboratories: async () => {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/laboratories/`);
    return response.data.filter(lab => !lab.is_deleted);
  },

  // Получение подразделений по ID лаборатории
  getDepartments: async laboratoryId => {
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/api/departments/by_laboratory/?laboratory_id=${laboratoryId}`
    );
    return response.data.filter(dept => !dept.is_deleted);
  },

  // Получение списка проб
  getSamples: async ({ laboratoryId, departmentId }) => {
    const params = {
      laboratory: laboratoryId,
    };
    if (departmentId) {
      params.department = departmentId;
    }
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/samples/`, { params });
    return response.data;
  },

  // Создание новой пробы
  createSample: async sampleData => {
    const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/samples/`, sampleData);
    return response.data;
  },

  // Обновление пробы
  updateSample: async ({ id, data }) => {
    const response = await axios.put(`${import.meta.env.VITE_API_URL}/api/samples/${id}/`, data);
    return response.data;
  },

  // Получение мест отбора проб
  getSamplingLocations: async ({ searchText, laboratoryId, departmentId }) => {
    const params = {
      search: searchText,
      laboratory: laboratoryId,
    };
    if (departmentId) {
      params.department = departmentId;
    }
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/api/get-sampling-locations/`,
      { params }
    );
    return response.data;
  },

  // Получение расчетов для пробы
  getCalculations: async sampleId => {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/calculations/`, {
      params: {
        sample: sampleId,
        is_deleted: false,
      },
    });
    return response.data;
  },
};
