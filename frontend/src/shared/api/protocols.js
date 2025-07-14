import axios from 'axios';

export const protocolsApi = {
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

  // Получение списка протоколов
  getProtocols: async ({ laboratoryId, departmentId }) => {
    const params = {
      laboratory: laboratoryId,
    };
    if (departmentId) {
      params.department = departmentId;
    }
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/protocols/`, { params });
    return response.data;
  },

  // Создание нового протокола
  createProtocol: async protocolData => {
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/api/protocols/`,
      protocolData
    );
    return response.data;
  },

  // Обновление протокола
  updateProtocol: async ({ id, data }) => {
    const response = await axios.put(`${import.meta.env.VITE_API_URL}/api/protocols/${id}/`, data);
    return response.data;
  },

  // Получение шаблонов для лаборатории/подразделения
  getTemplates: async ({ laboratoryId, departmentId }) => {
    const params = { laboratory: laboratoryId };
    if (departmentId) {
      params.department = departmentId;
    }
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/api/excel-templates/by-laboratory/`,
      { params }
    );
    return response.data;
  },

  // Поиск филиалов
  searchBranches: async searchText => {
    if (!searchText || searchText.length < 2) return [];
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/api/get-branches/?search=${searchText}`
    );
    return response.data;
  },

  // Получение результатов расчетов для протокола
  getCalculations: async protocolId => {
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/api/protocols/${protocolId}/calculations/`
    );

    // Форматируем данные перед возвратом
    return response.data.map(calc => {
      // Форматируем название метода
      let methodName = calc.research_method.name;
      if (calc.research_method.is_group_member && calc.research_method.groups?.length > 0) {
        const groupName = calc.research_method.groups[0].name;
        const methodNameLower = methodName.charAt(0).toLowerCase() + methodName.slice(1);
        methodName = `${groupName} ${methodNameLower}`;
      }

      // Форматируем результат
      let formattedResult = calc.result;
      if (
        formattedResult &&
        !isNaN(formattedResult.replace(',', '.')) &&
        formattedResult.match(/^-?\d*[.,]?\d*$/)
      ) {
        const numValue = parseFloat(formattedResult.replace(',', '.'));
        if (numValue < 0) {
          formattedResult = `минус ${Math.abs(numValue).toString().replace('.', ',')}`;
        } else {
          formattedResult = formattedResult.toString().replace('.', ',');
        }
      }

      // Форматируем входные данные
      const formattedInputData = Object.entries(calc.input_data || {})
        .map(([key, value]) => {
          let formattedValue = value;
          if (!isNaN(value)) {
            if (parseFloat(value) < 0) {
              formattedValue = value.toString().replace('-', 'минус ').replace('.', ',');
            } else {
              formattedValue = value.toString().replace('.', ',');
            }
          }
          return `${key} = ${formattedValue}`;
        })
        .join('\n');

      // Форматируем погрешность
      let measurementError = calc.measurement_error;
      if (measurementError && measurementError !== '-') {
        measurementError = `±${measurementError.toString().replace('.', ',')}`;
      }

      return {
        key: calc.id,
        methodName,
        unit: calc.unit || '-',
        inputData: formattedInputData || '-',
        result: formattedResult || '-',
        measurementError: measurementError || '-',
        equipment: calc.equipment || [],
        executor: calc.executor || '-',
        sampleNumber: calc.sample.registration_number,
      };
    });
  },

  // Получение протокола по ID
  getProtocolById: async protocolId => {
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/api/protocols/${protocolId}/`
    );
    return response.data;
  },

  // Генерация Excel-файла протокола
  generateProtocolExcel: async protocolId => {
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/api/generate-protocol-excel/?protocol_id=${protocolId}`,
      { responseType: 'blob' }
    );
    return response.data;
  },
};
