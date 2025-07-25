import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../../shared/ui/Layout/Layout';
import { Typography, IconButton, Tooltip } from '@mui/material';
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
  const [sampleId] = useState(searchParams.get('sample_id'));
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
  const [sampleData, setSampleData] = useState(null);
  const inputRefs = React.useRef({});
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isConfirmProtocolModalOpen, setIsConfirmProtocolModalOpen] = useState(false);

  useEffect(() => {
    try {
      // Получаем данные пробы
      const fetchSampleData = async () => {
        try {
          const response = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/samples/${sampleId}/`
          );
          setSampleData(response.data);
        } catch (error) {
          console.error('Ошибка при загрузке данных пробы:', error);
        }
      };

      if (sampleId) {
        fetchSampleData();
      }

      // Получаем данные из sessionStorage
      const methodsData = sessionStorage.getItem('available_methods');
      if (methodsData) {
        const parsedMethods = JSON.parse(methodsData);
        setAvailableMethods(parsedMethods);

        // Выбираем первый доступный метод
        if (parsedMethods.methods?.length > 0) {
          const firstMethod = parsedMethods.methods[0];
          if (firstMethod.is_group && firstMethod.methods?.length > 0) {
            const firstGroupMethod = firstMethod.methods[0];
            if (!firstGroupMethod.input_data) {
              firstGroupMethod.input_data = { fields: [] };
            }
            setCurrentMethod(firstGroupMethod);
          } else {
            if (!firstMethod.input_data) {
              firstMethod.input_data = { fields: [] };
            }
            setCurrentMethod(firstMethod);
          }
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

            // Получаем доступные методы для пробы
            const response = await axios.get(
              `${import.meta.env.VITE_API_URL}/api/research-methods/available-methods/`,
              {
                params: {
                  sample_id: sampleId,
                  research_page_id: researchPage.id,
                },
              }
            );

            setAvailableMethods(response.data);
            if (response.data.methods?.length > 0) {
              const firstMethod = response.data.methods[0];
              if (firstMethod.is_group && firstMethod.methods?.length > 0) {
                const firstGroupMethod = firstMethod.methods[0];
                if (!firstGroupMethod.input_data) {
                  firstGroupMethod.input_data = { fields: [] };
                }
                setCurrentMethod(firstGroupMethod);
              } else {
                if (!firstMethod.input_data) {
                  firstMethod.input_data = { fields: [] };
                }
                setCurrentMethod(firstMethod);
              }
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
  }, [sampleId]);

  useEffect(() => {
    const values = form.getFieldsValue();
    setFormValues(values);
  }, [form]);

  const handleCalculate = async methodId => {
    try {
      setIsCalculating(true);

      // Получаем актуальные данные метода
      const methodDetailsResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/research-methods/${methodId}/`
      );
      const methodDetails = methodDetailsResponse.data;

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
      message.error(error.response?.data?.error || error.message || 'Ошибка при расчете');
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
      // Разрешаем сочетания клавиш с Ctrl
      if (e.ctrlKey || e.metaKey) {
        const allowedKeyCodes = ['KeyA', 'KeyC', 'KeyV', 'KeyX'];
        if (allowedKeyCodes.includes(e.code)) {
          return;
        }
      }

      // Добавляем навигацию по Enter
      if (e.code === 'Enter') {
        e.preventDefault();
        const nextFieldIndex = (currentFieldIndex + 1) % cardFields.length;
        const nextField = cardFields[nextFieldIndex];
        const nextFieldName = `${methodId}_${nextField.name}`;
        if (inputRefs.current[nextFieldName]) {
          inputRefs.current[nextFieldName].focus();
        }
        return;
      }

      // Отключаем Tab
      if (e.code === 'Tab') {
        e.preventDefault();
        return;
      }

      // Разрешаем: backspace, delete, escape, запятая, минус, цифры
      if (
        e.code === 'Backspace' ||
        e.code === 'Delete' ||
        e.code === 'Escape' ||
        e.code === 'Comma' ||
        e.code === 'Minus' ||
        e.code === 'NumpadSubtract' ||
        e.code === 'NumpadDecimal' ||
        e.code.startsWith('Digit') ||
        e.code.startsWith('Numpad')
      ) {
        return;
      }

      // Разрешаем стрелки для навигации
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        return;
      }

      e.preventDefault();
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
                          style={{
                            fontSize: '14px',
                            flex: '1',
                          }}
                          className="hover-input"
                          value={fieldValue}
                          disabled={lockedMethods[methodId]}
                          onChange={e => {
                            let value = e.target.value;
                            value = value.replace(/\./g, ',');
                            const pattern = /^-?\d*,?\d*$/;

                            if (value === '' || value === '-' || pattern.test(value)) {
                              const commaCount = (value.match(/,/g) || []).length;
                              if (commaCount <= 1) {
                                const minusCount = (value.match(/-/g) || []).length;
                                if (minusCount <= 1 && value.indexOf('-') <= 0) {
                                  form.setFieldValue(formFieldName, value);
                                  setFormValues(prev => ({
                                    ...prev,
                                    [formFieldName]: value,
                                  }));

                                  // Устанавливаем курсор в правильную позицию после замены
                                  const input = e.target;
                                  const position = input.selectionStart;
                                  setTimeout(() => {
                                    input.setSelectionRange(position, position);
                                  }, 0);
                                }
                              }
                            }
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

  const fetchAvailableMethods = async () => {
    try {
      // Получаем страницу исследований
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

      const researchPage = researchPageResponse.data.find(page => page.type === 'oil_products');
      if (!researchPage) {
        throw new Error('Страница исследований не найдена');
      }

      // Получаем доступные методы для пробы
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/research-methods/available-methods/`,
        {
          params: {
            sample_id: sampleId,
            research_page_id: researchPage.id,
          },
        }
      );

      setAvailableMethods(response.data);

      // Если текущий метод больше недоступен, выбираем первый доступный метод
      const isCurrentMethodAvailable = response.data.methods.some(method =>
        method.is_group
          ? method.methods.some(m => m.id === currentMethod?.id)
          : method.id === currentMethod?.id
      );

      if (!isCurrentMethodAvailable && response.data.methods.length > 0) {
        const firstMethod = response.data.methods[0];
        if (firstMethod.is_group && firstMethod.methods?.length > 0) {
          const firstGroupMethod = firstMethod.methods[0];
          if (!firstGroupMethod.input_data) {
            firstGroupMethod.input_data = { fields: [] };
          }
          setCurrentMethod(firstGroupMethod);
          setSelectedTab(0);
        } else {
          if (!firstMethod.input_data) {
            firstMethod.input_data = { fields: [] };
          }
          setCurrentMethod(firstMethod);
          setSelectedTab(0);
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке методов:', error);
      message.error('Не удалось обновить список методов');
    }
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
      // Обновляем список методов
      await fetchAvailableMethods();
    } catch (error) {
      console.error('Ошибка при обновлении списка методов:', error);
      message.error('Не удалось обновить список методов');
    }
  };

  const handleGenerateProtocol = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/generate-sample-excel/?sample_id=${sampleId}`,
        {
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Формируем имя файла на основе данных пробы
      const filename = `Проба_${sampleData.registration_number}.xlsx`;

      // Очищаем имя файла от недопустимых символов
      const cleanedFilename = filename.replace(/[^\wа-яА-Я\s\.\-_]/g, '');

      link.setAttribute('download', cleanedFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setIsConfirmProtocolModalOpen(false);
      message.success('Отчет по пробе успешно сформирован');
    } catch (error) {
      console.error('Ошибка при формировании отчета:', error);
      message.error('Не удалось сформировать отчет');
    }
  };

  if (isLoading) {
    return (
      <ResearchMethodPageWrapper>
        <Layout title={sampleData ? `Проба № ${sampleData.registration_number}` : 'Загрузка...'}>
          <div style={{ position: 'relative' }}>
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

  const hasNoMethods = !availableMethods?.methods?.length;

  return (
    <ResearchMethodPageWrapper>
      <Layout title={sampleData ? `Проба № ${sampleData.registration_number}` : 'Загрузка...'}>
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
                borderRight: '1px solid rgba(44, 82, 130, 0.1)',
                overflowY: 'auto',
                padding: '12px',
                paddingBottom: '0px',
                background: 'linear-gradient(180deg, #f8faff 0%, #f0f5ff 100%)',
                height: 'calc(100% + 21px)',
                position: 'sticky',
                top: 0,
                borderBottomLeftRadius: '20px',
                fontFamily: 'HeliosCondC',
                boxShadow: 'inset -1px 0 2px rgba(44, 82, 130, 0.05)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0px',
                  position: 'sticky',
                  top: 0,
                  background: 'linear-gradient(180deg, #f8faff 0%, #f0f5ff 100%)',
                  zIndex: 1,
                  paddingTop: '5px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid rgba(44, 82, 130, 0.1)',
                }}
              >
                <Typography
                  variant="h5"
                  style={{
                    fontSize: '16px',
                    background: 'linear-gradient(135deg, #2c5282 0%, #1a365d 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
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
                    paddingTop: '6px',
                  }}
                >
                  {availableMethods?.methods.map((method, index) => (
                    <div
                      key={method.id}
                      onClick={() => {
                        if (method.is_group) {
                          if (method.methods?.length > 0) {
                            const firstMethod = method.methods[0];
                            if (!firstMethod.input_data) {
                              firstMethod.input_data = { fields: [] };
                            }
                            setCurrentMethod(firstMethod);
                          }
                        } else {
                          if (!method.input_data) {
                            method.input_data = { fields: [] };
                          }
                          setCurrentMethod(method);
                        }
                        setSelectedTab(index);
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background:
                          (method.is_group &&
                            currentMethod &&
                            method.methods?.some(m => m.id === currentMethod.id)) ||
                          (!method.is_group && currentMethod?.id === method.id)
                            ? 'linear-gradient(135deg, rgba(44, 82, 130, 0.1) 0%, rgba(26, 54, 93, 0.15) 100%)'
                            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow:
                          (method.is_group &&
                            currentMethod &&
                            method.methods?.some(m => m.id === currentMethod.id)) ||
                          (!method.is_group && currentMethod?.id === method.id)
                            ? '0 4px 12px rgba(44, 82, 130, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.5)'
                            : '0 1px 3px rgba(44, 82, 130, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.5)',
                        border: '1px solid rgba(44, 82, 130, 0.08)',
                        backdropFilter: 'blur(8px)',
                        fontFamily: 'HeliosCondC',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background =
                          'linear-gradient(135deg, rgba(44, 82, 130, 0.08) 0%, rgba(26, 54, 93, 0.12) 100%)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow =
                          '0 4px 12px rgba(44, 82, 130, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.5)';
                        e.currentTarget.style.border = '1px solid rgba(44, 82, 130, 0.12)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background =
                          (method.is_group &&
                            currentMethod &&
                            method.methods?.some(m => m.id === currentMethod.id)) ||
                          (!method.is_group && currentMethod?.id === method.id)
                            ? 'linear-gradient(135deg, rgba(44, 82, 130, 0.1) 0%, rgba(26, 54, 93, 0.15) 100%)'
                            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)';
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow =
                          (method.is_group &&
                            currentMethod &&
                            method.methods?.some(m => m.id === currentMethod.id)) ||
                          (!method.is_group && currentMethod?.id === method.id)
                            ? '0 4px 12px rgba(44, 82, 130, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.5)'
                            : '0 1px 3px rgba(44, 82, 130, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.5)';
                        e.currentTarget.style.border = '1px solid rgba(44, 82, 130, 0.08)';
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          position: 'relative',
                          zIndex: 1,
                        }}
                      >
                        <span
                          style={{
                            fontSize: '14px',
                            fontFamily: 'HeliosCondC',
                            color: '#2c5282',
                            fontWeight:
                              (method.is_group &&
                                currentMethod &&
                                method.methods?.some(m => m.id === currentMethod.id)) ||
                              (!method.is_group && currentMethod?.id === method.id)
                                ? '500'
                                : '400',
                          }}
                        >
                          {method.name}
                        </span>
                      </div>
                      {/* Декоративный элемент */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          right: '12px',
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          background:
                            (method.is_group &&
                              currentMethod &&
                              method.methods?.some(m => m.id === currentMethod.id)) ||
                            (!method.is_group && currentMethod?.id === method.id)
                              ? '#2c5282'
                              : 'rgba(44, 82, 130, 0.2)',
                          transform: 'translateY(-50%)',
                          transition: 'all 0.3s ease',
                        }}
                      />
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
                    {sampleData && (
                      <Button
                        type="primary"
                        onClick={() => setIsConfirmProtocolModalOpen(true)}
                        style={{ fontFamily: 'HeliosCondC' }}
                      >
                        Сформировать отчет
                      </Button>
                    )}
                  </div>

                  {availableMethods?.methods.map((method, index) => (
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
            sampleId={sampleId}
            laboratoryId={laboratoryId}
            departmentId={departmentId}
            laboratoryActivityDate={laboratoryActivityDate}
            onSuccess={handleSaveSuccess}
          />
        )}

        {/* Модальное окно подтверждения */}
        <ConfirmProtocolModal
          isOpen={isConfirmProtocolModalOpen}
          onClose={() => setIsConfirmProtocolModalOpen(false)}
          sampleNumber={sampleData?.registration_number}
          onConfirm={handleGenerateProtocol}
        />
      </Layout>
    </ResearchMethodPageWrapper>
  );
};

export default ResearchMethodPage;
