const replaceId = (path, id) => {
  if (!path) {
    console.error('API path is undefined');
    return '';
  }
  return path.replace(':id', id);
};

const ENV = {
  LABORATORIES: {
    BASE: process.env.REACT_APP_API_LABORATORIES_BASE,
    GET_BY_ID: process.env.REACT_APP_API_LABORATORIES_GET_BY_ID,
    REORDER_DEPARTMENTS: process.env.REACT_APP_API_LABORATORIES_REORDER_DEPARTMENTS,
  },
  DEPARTMENTS: {
    BASE: process.env.REACT_APP_API_DEPARTMENTS_BASE,
    GET_BY_ID: process.env.REACT_APP_API_DEPARTMENTS_GET_BY_ID,
  },
};

// Проверка обязательных переменных окружения
Object.entries(ENV).forEach(([section, routes]) => {
  Object.entries(routes).forEach(([key, value]) => {
    if (!value) {
      console.error(`Отсутствует переменная окружения: REACT_APP_API_${section}_${key}`);
    }
  });
});

export const API_ROUTES = {
  LABORATORIES: {
    BASE: ENV.LABORATORIES.BASE || '',
    GET_BY_ID: id => replaceId(ENV.LABORATORIES.GET_BY_ID, id),
    REORDER_DEPARTMENTS: id => replaceId(ENV.LABORATORIES.REORDER_DEPARTMENTS, id),
  },
  DEPARTMENTS: {
    BASE: ENV.DEPARTMENTS.BASE || '',
    GET_BY_ID: id => replaceId(ENV.DEPARTMENTS.GET_BY_ID, id),
  },
};