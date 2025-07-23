import axios from 'axios';

export const employeesApi = {
  // Поиск сотрудников по части ФИО (не менее 3 символов)
  searchByFio: async searchFio => {
    if (!searchFio || searchFio.length < 3) {
      return [];
    }

    const response = await axios.get(
      `${import.meta.env.VITE_HR_API_URL}/api/Employee/by-fio/${encodeURIComponent(searchFio)}`,
      {
        headers: {
          'X-API-KEY': import.meta.env.VITE_HR_API_KEY,
        },
      }
    );

    return response.data;
  },

  // Получение ФИО по hashMd5
  _cache: new Map(),
  getByHash: async hash => {
    if (!hash) return null;
    if (employeesApi._cache.has(hash)) {
      return employeesApi._cache.get(hash);
    }

    const response = await axios.get(
      `${import.meta.env.VITE_HR_API_URL}/api/Employee/by-hash/${hash}`,
      {
        headers: {
          'X-API-KEY': import.meta.env.VITE_HR_API_KEY,
        },
      }
    );

    employeesApi._cache.set(hash, response.data);
    return response.data;
  },
};
