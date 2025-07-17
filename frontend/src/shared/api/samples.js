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

    // Форматируем данные перед возвратом
    const formattedData = response.data.map(calc => {
      // Форматируем название метода
      let methodName = calc.research_method?.name || '-';
      if (calc.research_method?.is_group_member && calc.research_method?.groups?.length > 0) {
        const groupName = calc.research_method.groups[0].name;
        const methodNameLower = methodName.charAt(0).toLowerCase() + methodName.slice(1);
        methodName = `${groupName} ${methodNameLower}`;
      }

      // Форматируем результат
      let formattedResult = calc.result;
      if (
        formattedResult &&
        !isNaN(formattedResult.toString().replace(',', '.')) &&
        formattedResult.toString().match(/^-?\d*[.,]?\d*$/)
      ) {
        const numValue = parseFloat(formattedResult.toString().replace(',', '.'));
        if (numValue < 0) {
          formattedResult = `минус ${Math.abs(numValue).toString().replace('.', ',')}`;
        } else {
          formattedResult = formattedResult.toString().replace('.', ',');
        }
      }

      // Форматируем входные данные
      let formattedInputData = '-';
      if (calc.input_data && typeof calc.input_data === 'object') {
        formattedInputData = Object.entries(calc.input_data)
          .map(([key, value]) => {
            let formattedValue = value;
            if (typeof value === 'number' || !isNaN(value)) {
              const numValue = parseFloat(value.toString().replace(',', '.'));
              if (numValue < 0) {
                formattedValue = value.toString().replace('-', 'минус ').replace('.', ',');
              } else {
                formattedValue = value.toString().replace('.', ',');
              }
            }
            return `${key}: ${formattedValue}`;
          })
          .join('\n');
      }

      // Форматируем погрешность
      let measurementError = calc.measurement_error;
      if (measurementError && measurementError !== '-') {
        measurementError = measurementError.toString().replace('.', ',');
      }

      return {
        ...calc,
        methodName,
        inputData: formattedInputData,
        result: formattedResult || '-',
        measurementError: measurementError || '-',
      };
    });

    return formattedData.sort((a, b) => a.methodName.localeCompare(b.methodName));
  },
};
