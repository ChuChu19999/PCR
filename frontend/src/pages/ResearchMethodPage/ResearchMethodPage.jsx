import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../../shared/ui/Layout/Layout';
import { Typography, Alert, IconButton, Tooltip, Snackbar } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Form, Input, Button, Select, message, DatePicker } from 'antd';
import { FormItem } from '../../features/FormItems';
import LoadingCard from '../../features/Cards/ui/LoadingCard/LoadingCard';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import locale from 'antd/es/date-picker/locale/ru_RU';
import ResearchMethodPageWrapper from './ResearchMethodPageWrapper';
import './ResearchMethodPage.css';
import SaveProtocolCalculationModal from '../../features/Modals/SaveProtocolCalculationModal/SaveProtocolCalculationModal';
import ConfirmProtocolModal from '../../features/Modals/ConfirmProtocolModal/ConfirmProtocolModal';

const { Option } = Select;

const CONVERGENCE_LABELS = {
  custom: value => value, // Для произвольной сходимости возвращаем само значение
  satisfactory: 'Удовлетворительно',
  unsatisfactory: 'Неудовлетворительно',
  absence: 'Отсутствие',
  traces: 'Следы',
};

// Функция для обработки модуля с учетом вложенных скобок
const processAbs = formula => {
  let result = formula;
  let startIndex;
  while ((startIndex = result.indexOf('abs(')) !== -1) {
    let openBrackets = 1;
    let currentIndex = startIndex + 4;

    // Ищем закрывающую скобку с учетом вложенности
    while (openBrackets > 0 && currentIndex < result.length) {
      if (result[currentIndex] === '(') openBrackets++;
      if (result[currentIndex] === ')') openBrackets--;
      currentIndex++;
    }

    if (openBrackets === 0) {
      const content = result.substring(startIndex + 4, currentIndex - 1);
      result =
        result.substring(0, startIndex) + '|' + content + '|' + result.substring(currentIndex);
    } else {
      break;
    }
  }
  return result;
};

// Функция для определения количества знаков после запятой
const getDecimalPlaces = numStr => {
  if (!numStr) return 0;
  const parts = numStr.toString().split(',');
  return parts.length > 1 ? parts[1].length : 0;
};

// Функция округления
const roundValue = (value, mainResult) => {
  const decimalPlaces = getDecimalPlaces(mainResult) + 1;
  const numValue = parseFloat(value.replace(',', '.'));
  return numValue.toFixed(decimalPlaces).replace('.', ',');
};

const TabPanel = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
    >
      {value === index && children}
    </div>
  );
};

const ResearchMethodPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableMethods, setAvailableMethods] = useState(null);
  const [laboratoryId] = useState(searchParams.get('laboratory'));
  const [departmentId] = useState(searchParams.get('department'));
  const [protocolId] = useState(searchParams.get('protocol_id'));
  const [selectedTab, setSelectedTab] = useState(0);
  const [currentMethod, setCurrentMethod] = useState(null);
  const [form] = Form.useForm();
  const [formValues, setFormValues] = useState({});
  const [calculationResults, setCalculationResults] = useState({});
  const [lastCalculationResult, setLastCalculationResult] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [lockedMethods, setLockedMethods] = useState({});
  const [laboratoryActivityDate, setLaboratoryActivityDate] = useState(null);
  const [dateError, setDateError] = useState('');
  const [protocolData, setProtocolData] = useState(null);
  const inputRefs = React.useRef({});
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isConfirmProtocolModalOpen, setIsConfirmProtocolModalOpen] = useState(false);

  useEffect(() => {
    try {
      // Получаем данные протокола
      const fetchProtocolData = async () => {
        try {
          const response = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/protocols/${protocolId}/`
          );
          setProtocolData(response.data);
        } catch (error) {
          console.error('Ошибка при загрузке данных протокола:', error);
        }
      };

      if (protocolId) {
        fetchProtocolData();
      }

      // Получаем данные из sessionStorage
      const methodsData = sessionStorage.getItem('available_methods');
      if (methodsData) {
        const parsedMethods = JSON.parse(methodsData);
        setAvailableMethods(parsedMethods);

        // Выбираем первый доступный метод и проверяем его структуру
        if (parsedMethods.individual_methods?.length > 0) {
          const firstMethod = parsedMethods.individual_methods[0];
          if (!firstMethod.input_data) {
            firstMethod.input_data = { fields: [] };
          }
          setCurrentMethod(firstMethod);
        } else if (
          parsedMethods.groups?.length > 0 &&
          parsedMethods.groups[0].methods?.length > 0
        ) {
          const firstGroupMethod = parsedMethods.groups[0].methods[0];
          if (!firstGroupMethod.input_data) {
            firstGroupMethod.input_data = { fields: [] };
          }
          setCurrentMethod(firstGroupMethod);
        }

        // Очищаем данные из sessionStorage после использования
        sessionStorage.removeItem('available_methods');
      } else {
        // Если данных нет в sessionStorage, делаем запрос к API
        const fetchMethods = async () => {
          try {
            // Сначала получаем страницу исследований
            const researchPageResponse = await axios.get(
              `${import.meta.env.VITE_API_URL}/api/research-pages/`,
              {
                params: {
                  laboratory_id: laboratoryId,
                  department_id: departmentId || null,
                  type: 'oil_products',
                },
              }
            );

            const researchPage = researchPageResponse.data.find(
              page => page.type === 'oil_products'
            );
            if (!researchPage) {
              throw new Error('Страница исследований не найдена');
            }

            const response = await axios.get(
              `${import.meta.env.VITE_API_URL}/api/research-methods/available-methods/`,
              {
                params: {
                  protocol_id: protocolId,
                  research_page_id: researchPage.id,
                },
              }
            );

            setAvailableMethods(response.data);
            if (response.data.individual_methods?.length > 0) {
              const firstMethod = response.data.individual_methods[0];
              if (!firstMethod.input_data) {
                firstMethod.input_data = { fields: [] };
              }
              setCurrentMethod(firstMethod);
            } else if (
              response.data.groups?.length > 0 &&
              response.data.groups[0].methods?.length > 0
            ) {
              const firstGroupMethod = response.data.groups[0].methods[0];
              if (!firstGroupMethod.input_data) {
                firstGroupMethod.input_data = { fields: [] };
              }
              setCurrentMethod(firstGroupMethod);
            }
          } catch (error) {
            console.error('Ошибка при загрузке методов:', error);
            setError('Не удалось загрузить методы исследования');
          }
        };

        fetchMethods();
      }
    } catch (error) {
      console.error('Ошибка при обработке данных о методах:', error);
      setError('Ошибка при обработке данных о методах');
    } finally {
      setIsLoading(false);
    }
  }, [protocolId]);

  useEffect(() => {
    const values = form.getFieldsValue();
    setFormValues(values);
  }, [form]);

  const handleCalculate = async methodId => {
    try {
      setIsCalculating(true);
      const methodDetails = currentMethod;

      const inputData = {};
      methodDetails.input_data.fields.forEach(field => {
        const value = form.getFieldValue(`${methodId}_${field.name}`);
        const cleanedValue = value ? value.toString().trim().replace(',', '.') : '';
        inputData[field.name] = cleanedValue;
      });

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/calculate/`, {
        input_data: inputData,
        research_method: methodDetails,
      });

      const result = {
        ...response.data,
        result: response.data.result ? response.data.result.replace('.', ',') : null,
        measurement_error: response.data.measurement_error
          ? response.data.measurement_error.replace('.', ',')
          : null,
        intermediate_results: Object.fromEntries(
          Object.entries(response.data.intermediate_results || {}).map(([key, value]) => [
            key,
            value.replace('.', ','),
          ])
        ),
      };

      setCalculationResults(prev => ({
        ...prev,
        [methodId]: [result],
      }));

      setLastCalculationResult(prev => ({
        ...prev,
        [methodId]: {
          input_data: inputData,
          result: result.result,
          measurement_error: result.measurement_error,
          unit: methodDetails.unit,
          convergence:
            result.convergence === 'unsatisfactory'
              ? 'Неудовлетворительно'
              : result.convergence === 'traces'
                ? 'Следы'
                : result.convergence === 'absence'
                  ? 'Отсутствие'
                  : result.convergence,
        },
      }));
    } catch (error) {
      console.error('Ошибка при расчете:', error);
      message.error(error.message || 'Ошибка при расчете');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleInputChange = (e, fieldName) => {
    let value = e.target.value;
    value = value.replace(/\./g, ',');
    const pattern = /^-?\d*,?\d*$/;

    if (value === '' || value === '-' || pattern.test(value)) {
      const commaCount = (value.match(/,/g) || []).length;
      if (commaCount <= 1) {
        const minusCount = (value.match(/-/g) || []).length;
        if (minusCount <= 1 && value.indexOf('-') <= 0) {
          form.setFieldValue(fieldName, value);
          const input = e.target;
          const position = input.selectionStart;
          setTimeout(() => {
            input.setSelectionRange(position, position);
          }, 0);
        }
      }
    }
  };

  const renderInputFields = methodId => {
    if (!currentMethod || !currentMethod.input_data || !currentMethod.input_data.fields) {
      return null;
    }

    const fields = currentMethod.input_data.fields;
    const cardIndices = [...new Set(fields.map(field => field.card_index))].sort();

    const handleKeyDown = (e, currentFieldIndex, cardFields) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const nextFieldIndex = (currentFieldIndex + 1) % cardFields.length;
        const nextField = cardFields[nextFieldIndex];
        const nextFieldName = `${methodId}_${nextField.name}`;
        if (inputRefs.current[nextFieldName]) {
          inputRefs.current[nextFieldName].focus();
        }
      } else if (e.key === 'Tab') {
        e.preventDefault(); // Просто блокируем стандартное поведение Tab
      }
    };

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: 'calc(100% + 20px)',
          gap: '16px',
          justifyContent: 'left',
          flexWrap: 'wrap',
        }}
      >
        {cardIndices.map(cardIndex => {
          const cardFields = fields.filter(field => field.card_index === cardIndex);
          if (cardFields.length === 0) return null;

          return (
            <div
              key={cardIndex}
              style={{
                padding: '24px',
                background: '#f5f8ff',
                borderRadius: '16px',
                boxShadow: 'rgba(17, 12, 46, 0.05) 0px 48px 100px 0px',
                flex: '1',
                minWidth: '250px',
                maxWidth: '300px',
                border: '1px solid rgba(22, 119, 255, 0.3)',
                transition: 'all 0.3s ease',
                transform: 'translateY(0)',
                backdropFilter: 'blur(8px)',
                backgroundColor: 'rgba(245, 248, 255, 0.95)',
              }}
            >
              {cardFields.map((field, fieldIndex) => {
                const formFieldName = `${methodId}_${field.name}`;
                const fieldValue = formValues[formFieldName];

                return (
                  <div key={fieldIndex} className="input-field-container">
                    <FormItem
                      title={
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px' }}>{field.name}</span>
                          <Tooltip title={field.description} placement="right">
                            <IconButton size="small">
                              <HelpOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </div>
                      }
                      name={formFieldName}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                        }}
                      >
                        <Input
                          ref={el => (inputRefs.current[formFieldName] = el)}
                          placeholder={`Введите ${field.name}`}
                          style={{ fontSize: '14px', flex: '1' }}
                          value={fieldValue}
                          disabled={lockedMethods[methodId]}
                          onChange={e => {
                            const value = e.target.value;
                            form.setFieldValue(formFieldName, value);
                            setFormValues(prev => ({
                              ...prev,
                              [formFieldName]: value,
                            }));
                          }}
                          onKeyDown={e => handleKeyDown(e, fieldIndex, cardFields)}
                          onPaste={e => {
                            e.preventDefault();
                            const pastedText = e.clipboardData.getData('text');
                            const cleanedValue = pastedText.trim().replace(/\s+/g, '');
                            form.setFieldValue(formFieldName, cleanedValue);
                            setFormValues(prev => ({
                              ...prev,
                              [formFieldName]: cleanedValue,
                            }));
                          }}
                        />
                        {field.unit && (
                          <span
                            style={{
                              color: '#666',
                              fontSize: '14px',
                              fontFamily: 'HeliosCondC',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {field.unit}
                          </span>
                        )}
                      </div>
                    </FormItem>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const fetchMethodDetails = async methodId => {
    try {
      const method = availableMethods.groups
        .flatMap(group => group.methods)
        .find(m => m.id === methodId);

      if (method) {
        if (!method.input_data) {
          method.input_data = { fields: [] };
        }
        setCurrentMethod(method);
        const groupIndex =
          availableMethods.individual_methods.length +
          availableMethods.groups.findIndex(group => group.methods.some(m => m.id === methodId));
        if (groupIndex >= 0) {
          setSelectedTab(groupIndex);
        }
      }
    } catch (error) {
      console.error('Ошибка при получении деталей метода:', error);
      message.error('Не удалось загрузить детали метода');
    }
  };

  const onFinish = async values => {
    if (!laboratoryActivityDate) {
      setDateError('Необходимо указать дату лабораторной деятельности');
      return;
    }

    try {
      if (!currentMethod) {
        message.error('Метод не выбран');
        return;
      }

      await handleCalculate(currentMethod.id);
    } catch (error) {
      console.error('Ошибка при отправке формы:', error);
      message.error('Произошла ошибка при отправке формы');
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleOpenSaveModal = () => {
    if (!laboratoryActivityDate) {
      setDateError('Укажите дату лабораторной деятельности');
      return;
    }
    setDateError('');
    if (currentMethod?.id && lastCalculationResult[currentMethod.id]) {
      setIsSaveModalOpen(true);
    } else {
      message.warning('Нет результатов для сохранения');
    }
  };

  const handleCloseSaveModal = () => {
    setIsSaveModalOpen(false);
  };

  const handleSaveSuccess = async () => {
    setIsSaveModalOpen(false);

    // Очищаем результаты расчетов
    setLastCalculationResult(prev => ({
      ...prev,
      [currentMethod.id]: null,
    }));
    setCalculationResults(prev => ({
      ...prev,
      [currentMethod.id]: [],
    }));

    // Очищаем поля ввода для текущего метода
    const emptyValues = {};
    currentMethod.input_data.fields.forEach(field => {
      emptyValues[`${currentMethod.id}_${field.name}`] = '';
    });
    form.setFieldsValue(emptyValues);

    // Очищаем значения формы в общем состоянии
    setFormValues(prev => ({
      ...prev,
      ...emptyValues,
    }));

    try {
      message.success('Результат расчета успешно сохранен');
      // Добавляем небольшую задержку перед обновлением страницы,
      // чтобы пользователь успел увидеть сообщение об успехе
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Ошибка при обновлении списка методов:', error);
      message.error('Не удалось обновить список методов');
    }
  };

  const handleGenerateProtocol = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/generate-protocol-excel/?registration_number=${protocolData.registration_number}`,
        {
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let filename = 'protocol.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setIsConfirmProtocolModalOpen(false);
      setSnackbar({
        open: true,
        message: 'Протокол успешно сформирован',
        severity: 'success',
      });
    } catch (error) {
      console.error('Ошибка при формировании протокола:', error);
      setSnackbar({
        open: true,
        message: 'Не удалось сформировать протокол',
        severity: 'error',
      });
    }
  };

  if (isLoading) {
    return (
      <ResearchMethodPageWrapper>
        <Layout
          title={
            protocolData
              ? `Протокол № ${protocolData.test_protocol_number || protocolData.registration_number}`
              : 'Загрузка...'
          }
        >
          <div style={{ position: 'relative', minHeight: 'calc(100vh - 64px)' }}>
            <LoadingCard />
          </div>
        </Layout>
      </ResearchMethodPageWrapper>
    );
  }

  if (error) {
    return (
      <ResearchMethodPageWrapper>
        <Layout title="Ошибка">
          <Alert severity="error">{error}</Alert>
        </Layout>
      </ResearchMethodPageWrapper>
    );
  }

  const hasNoMethods =
    !availableMethods?.individual_methods?.length && !availableMethods?.groups?.length;

  return (
    <ResearchMethodPageWrapper>
      <Layout
        title={protocolData ? `Протокол № ${protocolData.test_protocol_number}` : 'Загрузка...'}
      >
        <Form
          form={form}
          onFinish={onFinish}
          layout="vertical"
          preserve={false}
          onValuesChange={(changedValues, allValues) => {
            setFormValues(allValues);
          }}
        >
          <div
            style={{ display: 'flex', height: 'calc(100vh - 120px)', fontFamily: 'HeliosCondC' }}
          >
            {/* Левая панель с методами */}
            <div
              style={{
                width: '250px',
                borderRight: '1px solid #e2e8f0',
                overflowY: 'auto',
                padding: '12px',
                paddingBottom: '0px',
                backgroundColor: '#f8fafc',
                height: 'calc(100% + 21px)',
                position: 'sticky',
                top: 0,
                borderBottomLeftRadius: '20px',
                fontFamily: 'HeliosCondC',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#f8fafc',
                  zIndex: 1,
                  paddingTop: '5px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <Typography
                  variant="h5"
                  style={{
                    fontSize: '16px',
                    color: '#2c5282',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    lineHeight: 1,
                    fontWeight: 600,
                    fontFamily: 'HeliosCondC',
                  }}
                >
                  Методы исследования
                </Typography>
              </div>

              {hasNoMethods ? (
                <div
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#718096',
                    fontSize: '14px',
                    fontFamily: 'HeliosCondC',
                  }}
                >
                  Нет доступных методов исследования
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    height: 'calc(100% - 60px)',
                    overflowY: 'auto',
                    paddingRight: '4px',
                  }}
                >
                  {[
                    ...(availableMethods?.individual_methods || []).map(method => ({
                      ...method,
                      is_group: false,
                    })),
                    ...(availableMethods?.groups || []).map(group => ({
                      ...group,
                      is_group: true,
                    })),
                  ].map((method, index) => (
                    <div
                      key={method.id}
                      onClick={() => {
                        if (method.is_group) {
                          // Если это группа, выбираем первый метод из группы
                          if (method.methods?.length > 0) {
                            const firstMethod = method.methods[0];
                            if (!firstMethod.input_data) {
                              firstMethod.input_data = { fields: [] };
                            }
                            setCurrentMethod(firstMethod);
                            // Устанавливаем индекс с учетом количества обычных методов
                            setSelectedTab(
                              availableMethods.individual_methods.length +
                                availableMethods.groups.findIndex(g => g.id === method.id)
                            );
                          }
                        } else {
                          // Если это обычный метод
                          if (!method.input_data) {
                            method.input_data = { fields: [] };
                          }
                          setCurrentMethod(method);
                          // Устанавливаем индекс в пределах обычных методов
                          setSelectedTab(
                            availableMethods.individual_methods.findIndex(m => m.id === method.id)
                          );
                        }
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        backgroundColor:
                          (method.is_group &&
                            currentMethod &&
                            method.methods?.some(m => m.id === currentMethod.id)) ||
                          (!method.is_group && currentMethod?.id === method.id)
                            ? '#e2e8f0'
                            : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease-in-out',
                        boxShadow:
                          (method.is_group &&
                            currentMethod &&
                            method.methods?.some(m => m.id === currentMethod.id)) ||
                          (!method.is_group && currentMethod?.id === method.id)
                            ? '0 2px 4px rgba(0,0,0,0.05)'
                            : 'none',
                        border:
                          (method.is_group &&
                            currentMethod &&
                            method.methods?.some(m => m.id === currentMethod.id)) ||
                          (!method.is_group && currentMethod?.id === method.id)
                            ? '1px solid #cbd5e0'
                            : '1px solid transparent',
                        fontFamily: 'HeliosCondC',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = '#edf2f7';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        e.currentTarget.style.border = '1px solid #e2e8f0';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor =
                          (method.is_group &&
                            currentMethod &&
                            method.methods?.some(m => m.id === currentMethod.id)) ||
                          (!method.is_group && currentMethod?.id === method.id)
                            ? '#e2e8f0'
                            : 'transparent';
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow =
                          (method.is_group &&
                            currentMethod &&
                            method.methods?.some(m => m.id === currentMethod.id)) ||
                          (!method.is_group && currentMethod?.id === method.id)
                            ? '0 2px 4px rgba(0,0,0,0.05)'
                            : 'none';
                        e.currentTarget.style.border =
                          (method.is_group &&
                            currentMethod &&
                            method.methods?.some(m => m.id === currentMethod.id)) ||
                          (!method.is_group && currentMethod?.id === method.id)
                            ? '1px solid #cbd5e0'
                            : '1px solid transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontFamily: 'HeliosCondC' }}>
                          {method.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Основной контент */}
            <div
              style={{
                flex: 1,
                padding: '16px',
                overflowY: 'auto',
                position: 'relative',
                width: '100%',
                maxWidth: '100%',
                height: 'calc(100% - 10px)',
              }}
            >
              {hasNoMethods ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'left',
                    justifyContent: 'left',
                    height: '100%',
                    color: '#4a5568',
                    textAlign: 'center',
                    padding: '20px',
                  }}
                >
                  <Typography
                    variant="h6"
                    style={{
                      marginBottom: '16px',
                      color: '#2d3748',
                      fontFamily: 'HeliosCondC',
                      fontSize: '18px',
                    }}
                  >
                    Методы исследования отсутствуют
                  </Typography>
                  <Typography
                    style={{
                      marginBottom: '24px',
                      color: '#718096',
                      fontFamily: 'HeliosCondC',
                      fontSize: '14px',
                    }}
                  >
                    Нет доступных методов исследования для данного протокола
                  </Typography>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '16px',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ position: 'relative', width: '195px' }}>
                        <DatePicker
                          locale={locale}
                          format="DD.MM.YYYY"
                          value={laboratoryActivityDate}
                          onChange={date => {
                            setLaboratoryActivityDate(date);
                            setDateError('');
                          }}
                          placeholder="Дата лабораторной деятельности"
                          style={{
                            width: '100%',
                            borderColor: dateError ? '#ff4d4f' : undefined,
                          }}
                          status={dateError ? 'error' : ''}
                          required
                          showToday
                          allowClear={false}
                          popupStyle={{ zIndex: 1001 }}
                          disabled={currentMethod && lockedMethods[currentMethod.id]}
                        />
                        {dateError && (
                          <div
                            style={{
                              color: '#ff4d4f',
                              fontSize: '12px',
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              marginTop: '4px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {dateError}
                          </div>
                        )}
                      </div>
                    </div>
                    {protocolData && (
                      <Button
                        type="primary"
                        onClick={() => setIsConfirmProtocolModalOpen(true)}
                        style={{ fontFamily: 'HeliosCondC' }}
                      >
                        Сформировать протокол
                      </Button>
                    )}
                  </div>

                  {[
                    ...(availableMethods?.individual_methods || []).map(method => ({
                      ...method,
                      is_group: false,
                    })),
                    ...(availableMethods?.groups || []).map(group => ({
                      ...group,
                      is_group: true,
                    })),
                  ].map((method, index) => (
                    <TabPanel key={`panel-${method.id}`} value={selectedTab} index={index}>
                      {currentMethod && (
                        <div className="calculation-form">
                          <Typography
                            variant="h5"
                            style={{
                              color: '#2c5282',
                              fontSize: '20px',
                              fontWeight: 600,
                              textAlign: 'left',
                              marginBottom: '20px',
                              fontFamily: 'HeliosCondC',
                            }}
                          >
                            {method.is_group ? method.name : currentMethod.name}
                          </Typography>

                          {method.is_group && method.methods && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'left',
                                justifyContent: 'left',
                                marginBottom: '12px',
                                gap: '8px',
                              }}
                            >
                              <select
                                value={currentMethod.id}
                                onChange={e => {
                                  const newMethodId = parseInt(e.target.value);
                                  fetchMethodDetails(newMethodId);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid #ddd',
                                  fontSize: '14px',
                                  color: '#333',
                                  backgroundColor: 'white',
                                  cursor: 'pointer',
                                  minWidth: '200px',
                                }}
                              >
                                {method.methods.map(m => (
                                  <option key={`method-${m.id}`} value={m.id}>
                                    {m.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {renderInputFields(currentMethod.id)}

                          {/* Блок результатов */}
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              width: 'calc(100% + 20px)',
                              gap: '16px',
                              marginBottom: '10px',
                              justifyContent: 'left',
                              flexWrap: 'wrap',
                            }}
                          >
                            {calculationResults[currentMethod?.id]?.map((result, index) => (
                              <div
                                key={`result-${index}`}
                                className="calculation-results"
                                style={{
                                  border: '1px solid rgba(64, 150, 255, 0.3)',
                                  padding: '12px 16px',
                                  borderRadius: '12px',
                                  background: 'linear-gradient(to right, #f8f9ff, #f0f7ff)',
                                  boxShadow: '0 4px 12px rgba(64, 150, 255, 0.08)',
                                  marginTop: '8px',
                                  marginBottom: '12px',
                                  minWidth: '300px',
                                  maxWidth: '400px',
                                  flex: '1',
                                }}
                              >
                                <Typography
                                  variant="h6"
                                  style={{
                                    color: '#2c5282',
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    marginBottom: '6px',
                                  }}
                                >
                                  Результат:
                                  {result.convergence === 'custom'
                                    ? ` ${result.result}`
                                    : result.convergence === 'satisfactory'
                                      ? ` ${result.result} ± ${result.measurement_error} ${result.unit}`
                                      : result.convergence === 'absence'
                                        ? ' Отсутствие'
                                        : result.convergence === 'traces'
                                          ? ' Следы'
                                          : ' Неудовлетворительно'}
                                </Typography>

                                {/* Отображение информации о повторяемости */}
                                <Typography
                                  variant="h6"
                                  style={{
                                    color: '#2c5282',
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    marginBottom: '6px',
                                    marginTop: '8px',
                                    paddingTop: '8px',
                                    borderTop: '1px solid rgba(64, 150, 255, 0.15)',
                                  }}
                                >
                                  Проверка повторяемости:
                                </Typography>
                                {result.conditions_info &&
                                  result.conditions_info.map(
                                    (condition, condIndex) =>
                                      condition.satisfied && (
                                        <div
                                          key={condIndex}
                                          style={{
                                            margin: '8px 0',
                                            color: '#2c5282',
                                            fontSize: '14px',
                                            background: 'rgba(255, 255, 255, 0.5)',
                                            padding: '8px',
                                            borderRadius: '8px',
                                            borderBottom:
                                              condIndex < result.conditions_info.length - 1
                                                ? '1px dashed rgba(64, 150, 255, 0.3)'
                                                : 'none',
                                            paddingBottom:
                                              condIndex < result.conditions_info.length - 1
                                                ? '16px'
                                                : '8px',
                                            marginBottom:
                                              condIndex < result.conditions_info.length - 1
                                                ? '16px'
                                                : '8px',
                                          }}
                                        >
                                          {/* Исходная формула */}
                                          <div
                                            style={{
                                              fontFamily: 'HeliosCondC',
                                              marginBottom: '6px',
                                              fontSize: '14px',
                                              color: '#1a365d',
                                            }}
                                          >
                                            {condition.calculation_steps?.step2
                                              ? processAbs(condition.calculation_steps.step2)
                                                  .replace(/\*/g, '×')
                                                  .replace(/<=/g, '≤')
                                                  .replace(/>=/g, '≥')
                                                  .replace(/\./g, ',')
                                                  .replace(/or/g, 'или')
                                                  .replace(/and/g, 'и')
                                              : processAbs(condition.formula)
                                                  .replace(/\*/g, '×')
                                                  .replace(/<=/g, '≤')
                                                  .replace(/>=/g, '≥')
                                                  .replace(/\./g, ',')
                                                  .replace(/or/g, 'или')
                                                  .replace(/and/g, 'и')}
                                          </div>

                                          {/* Результат вычисления */}
                                          {condition.calculation_steps && (
                                            <div
                                              style={{
                                                fontFamily: 'HeliosCondC',
                                                fontSize: '14px',
                                                color: '#4a5568',
                                                paddingBottom: '8px',
                                                borderBottom: '1px solid rgba(64, 150, 255, 0.15)',
                                              }}
                                            >
                                              {condition.calculation_steps.type === 'single'
                                                ? condition.calculation_steps.step?.evaluated
                                                : condition.calculation_steps.steps?.[0]?.evaluated}
                                            </div>
                                          )}

                                          {/* Результат */}
                                          <div
                                            style={{
                                              color: '#0066cc',
                                              marginTop: '6px',
                                              fontWeight: 500,
                                            }}
                                          >
                                            {CONVERGENCE_LABELS[condition.convergence_value]}
                                          </div>
                                        </div>
                                      )
                                  )}

                                {Object.keys(result.intermediate_results).length > 0 && (
                                  <>
                                    <Typography
                                      variant="h6"
                                      style={{
                                        color: '#2c5282',
                                        fontSize: '15px',
                                        fontWeight: 600,
                                        marginBottom: '6px',
                                        marginTop: '8px',
                                        paddingTop: '8px',
                                        borderTop: '1px solid rgba(64, 150, 255, 0.15)',
                                      }}
                                    >
                                      Промежуточные результаты:
                                    </Typography>
                                    {Object.entries(result.intermediate_results).map(
                                      ([name, value]) => (
                                        <div
                                          key={name}
                                          style={{
                                            color: '#4a5568',
                                            margin: '3px 0',
                                            fontSize: '14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                          }}
                                        >
                                          <div
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                            }}
                                          >
                                            {name}
                                            {currentMethod.intermediate_data.fields.map(
                                              field =>
                                                field.name === name && (
                                                  <Tooltip
                                                    key={field.name}
                                                    title={
                                                      field.description || 'Описание отсутствует'
                                                    }
                                                    placement="right"
                                                  >
                                                    <IconButton
                                                      size="small"
                                                      style={{ padding: '0px' }}
                                                    >
                                                      <HelpOutlineIcon
                                                        style={{
                                                          fontSize: '16px',
                                                          color: '#718096',
                                                        }}
                                                      />
                                                    </IconButton>
                                                  </Tooltip>
                                                )
                                            )}
                                          </div>
                                          <span
                                            style={{
                                              color: '#2d3748',
                                              fontWeight: 500,
                                              marginLeft: '4px',
                                            }}
                                          >
                                            {roundValue(value, result.result)}
                                            {currentMethod.intermediate_data.fields.find(
                                              f => f.name === name
                                            )?.unit && (
                                              <span
                                                style={{
                                                  marginLeft: '4px',
                                                  color: '#666',
                                                  fontWeight: 'normal',
                                                }}
                                              >
                                                {
                                                  currentMethod.intermediate_data.fields.find(
                                                    f => f.name === name
                                                  ).unit
                                                }
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                      )
                                    )}
                                  </>
                                )}
                              </div>
                            ))}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'left',
                              width: '100%',
                              gap: '16px',
                            }}
                          >
                            <Button
                              type="primary"
                              onClick={() => handleCalculate(currentMethod.id)}
                              loading={isCalculating}
                              style={{ fontFamily: 'HeliosCondC' }}
                            >
                              Рассчитать
                            </Button>
                            {lastCalculationResult[currentMethod?.id] && (
                              <Button
                                type="primary"
                                onClick={handleOpenSaveModal}
                                style={{ fontFamily: 'HeliosCondC' }}
                              >
                                Сохранить результат
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </TabPanel>
                  ))}
                </>
              )}
            </div>
          </div>
        </Form>

        {currentMethod && (
          <SaveProtocolCalculationModal
            isOpen={isSaveModalOpen}
            onClose={handleCloseSaveModal}
            calculationResult={lastCalculationResult[currentMethod.id]}
            currentMethod={currentMethod}
            protocolId={protocolId}
            laboratoryId={laboratoryId}
            departmentId={departmentId}
            laboratoryActivityDate={laboratoryActivityDate}
            onSuccess={handleSaveSuccess}
          />
        )}

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{
            '& .MuiAlert-root': {
              width: '100%',
              maxWidth: '400px',
            },
          }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* Добавляем модальное окно подтверждения */}
        <ConfirmProtocolModal
          isOpen={isConfirmProtocolModalOpen}
          onClose={() => setIsConfirmProtocolModalOpen(false)}
          protocolNumber={protocolData?.test_protocol_number}
          onConfirm={handleGenerateProtocol}
        />
      </Layout>
    </ResearchMethodPageWrapper>
  );
};

export default ResearchMethodPage;
