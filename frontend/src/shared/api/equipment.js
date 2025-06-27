import axios from 'axios';

export const equipmentApi = {
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

  // Получение списка оборудования
  getEquipment: async ({ laboratoryId, departmentId }) => {
    const params = {
      laboratory: laboratoryId,
      is_active: true,
      is_deleted: false,
    };
    if (departmentId) {
      params.department = departmentId;
    }
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/equipment/`, { params });
    return response.data;
  },

  // Создание нового оборудования
  createEquipment: async equipmentData => {
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/api/equipment/`,
      equipmentData
    );
    return response.data;
  },

  // Обновление оборудования
  updateEquipment: async ({ id, data }) => {
    if (data.delete) {
      // Если это удаление, то просто помечаем запись как удаленную
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/equipment/${id}/`, {
        is_deleted: true,
        is_active: false,
      });
      return { success: true };
    } else {
      // Если это обновление, то деактивируем текущую версию и создаем новую
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/equipment/${id}/`, {
        is_active: false,
      });
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/equipment/`, data);
      return response.data;
    }
  },

  // Удаление оборудования (не используется, так как используем safe delete через updateEquipment)
  deleteEquipment: async id => {
    await axios.patch(`${import.meta.env.VITE_API_URL}/api/equipment/${id}/`, {
      is_deleted: true,
      is_active: false,
    });
  },
};
