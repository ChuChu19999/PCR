import axios from 'axios';

export const reportsApi = {
  // Получить список лабораторий (исключаем помеченные как удаленные)
  getLaboratories: async () => {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/laboratories/`);
    return response.data.filter(lab => !lab.is_deleted);
  },

  // Получить список подразделений выбранной лаборатории (исключаем удаленные)
  getDepartments: async laboratoryId => {
    if (!laboratoryId) return [];
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/api/departments/by_laboratory/?laboratory_id=${laboratoryId}`
    );
    return response.data.filter(dept => !dept.is_deleted);
  },

  // Получить отчеты.
  getReports: async ({ laboratoryId, departmentId }) => {
    const params = { laboratory: laboratoryId };
    if (departmentId) params.department = departmentId;

    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/get-reports/`, {
      params,
    });

    return response.data;
  },

  // Получить активный шаблон для лаборатории / подразделения
  getReportTemplate: async ({ laboratoryId, departmentId }) => {
    const params = { laboratory: laboratoryId };
    if (departmentId) params.department = departmentId;

    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/api/report-templates/active/`,
      { params }
    );

    return response.data; // null если нет
  },

  // Создать новый шаблон
  createReportTemplate: async formData => {
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/api/report-templates/`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },

  // Обновить название активного шаблона
  renameReportTemplate: async ({ id, name }) => {
    const response = await axios.patch(
      `${import.meta.env.VITE_API_URL}/api/report-templates/${id}/`,
      { name }
    );
    return response.data;
  },

  // Загрузить новый файл → создать новую версию, старую деактивировать
  uploadNewVersion: async ({ id, file, name }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);

    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/api/report-templates/${id}/new-version/`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  generateReport: async ({ laboratoryId, departmentId, startDate, endDate }) => {
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/api/generate-report/`,
      {
        laboratory_id: laboratoryId,
        department_id: departmentId,
        start_date: startDate,
        end_date: endDate,
      },
      {
        responseType: 'blob',
      }
    );

    // Создаем ссылку для скачивания файла
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'report.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
