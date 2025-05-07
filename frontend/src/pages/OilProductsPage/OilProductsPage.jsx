import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Typography, Snackbar, Alert, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { Form, Input, Button, Select, message, Modal, AutoComplete, DatePicker } from 'antd';
import Layout from '../../shared/ui/Layout/Layout';
import { FormItem } from '../../features/FormItems';
import OilProductsPageWrapper from './OilProductsPageWrapper';
import AddCalculationModal from '../../features/Modals/AddCalculationModal/AddCalculationModal';
import HideMethodModal from '../../features/Modals/HideMethodModal/HideMethodModal';
import GenerateProtocolModal from '../../features/Modals/GenerateProtocolModal/GenerateProtocolModal';
import LoadingCard from '../../features/Cards/ui/LoadingCard/LoadingCard';
import SaveCalculationModal from '../../features/Modals/SaveCalculationModal/SaveCalculationModal';
import axios from 'axios';
import './OilProductsPage.css';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import locale from 'antd/es/date-picker/locale/ru_RU';

const { Option } = Select;

const TabPanel = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      style={{
        width: '100%',
        maxWidth: '100%',
      }}
    >
      {value === index && (
        <div className="tab-content" style={{ width: '100%', maxWidth: '100%' }}>
          {children}
        </div>
      )}
    </div>
  );
};

const CONVERGENCE_LABELS = {
  satisfactory: 'Удовлетворительно',
  unsatisfactory: 'Неудовлетворительно',
  absence: 'Отсутствие',
  traces: 'Следы',
};

const OilProductsPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const isDepartment = location.pathname.includes('/departments/');

  const [form] = Form.useForm();
  const [formValues, setFormValues] = useState({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [lastCalculationResult, setLastCalculationResult] = useState({});
  const [researchMethods, setResearchMethods] = useState([]);
  const [methodGroups, setMethodGroups] = useState([]);
  const [currentMethod, setCurrentMethod] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [researchPageId, setResearchPageId] = useState(null);
  const [calculationResults, setCalculationResults] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [isHideModalOpen, setIsHideModalOpen] = useState(false);
  const [methodToHide, setMethodToHide] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [laboratoryId, setLaboratoryId] = useState(null);
  const [isGenerateProtocolModalOpen, setIsGenerateProtocolModalOpen] = useState(false);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [isLoadingRegistrationData, setIsLoadingRegistrationData] = useState(false);
  const [lockedMethods, setLockedMethods] = useState({});
  const [registrationOptions, setRegistrationOptions] = useState([]);
  const [methodsData, setMethodsData] = useState({});
  const [entityName, setEntityName] = useState('');
  const inputRefs = React.useRef({});
  const [laboratoryActivityDate, setLaboratoryActivityDate] = useState(null);
  const [dateError, setDateError] = useState('');

  // Эффект для отслеживания изменений значений формы
  useEffect(() => {
    const values = form.getFieldsValue();
    setFormValues(values);
  }, [form]);

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

  const fetchResearchMethods = async () => {
    try {
      setIsLoading(true);

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/research-pages/`, {
        params: {
          [isDepartment ? 'department_id' : 'laboratory_id']: id,
          type: 'oil_products',
        },
      });

      if (response.data.length > 0) {
        const page = response.data[0];
        setResearchPageId(page.id);
        setLaboratoryId(isDepartment ? page.laboratory : id);

        const groupsResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/research-method-groups/`
        );

        const groups = groupsResponse.data;
        setMethodGroups(groups);

        const methodsWithGroups = page.research_methods.map((method, index) => {
          if (method.is_group) {
            // Если это группа, добавляем только активные методы
            return {
              ...method,
              uniqueId: method.id,
              is_active: method.methods.some(m => m.is_active), // группа активна, если есть хоть один активный метод
              methods: method.methods
                .filter(m => m.is_active) // фильтруем только активные методы
                .map(m => ({
                  ...m,
                  uniqueId: `method-${m.id}-${index}`,
                })),
            };
          } else {
            // Если это обычный метод, ищем его группу
            const group = groups.find(g => g.methods.some(m => m.id === method.id));
            return {
              ...method,
              uniqueId: `method-${method.id}-${index}`,
              group: group || null,
            };
          }
        });

        // Фильтруем группы, у которых нет активных методов
        const filteredMethods = methodsWithGroups.filter(
          method => !method.is_group || (method.is_group && method.methods.length > 0)
        );

        console.log('Методы после обработки:', filteredMethods);
        setResearchMethods(filteredMethods);

        // Выбираем первый активный метод
        const activeMethods = filteredMethods.filter(method => method.is_active);
        console.log('Активные методы:', activeMethods);

        if (activeMethods.length > 0) {
          const firstMethod = activeMethods[0];
          if (firstMethod.is_group && firstMethod.methods && firstMethod.methods.length > 0) {
            // Если первый активный метод - группа, берем первый метод из группы
            await fetchMethodDetails(page.id, firstMethod.methods[0].id);
            setCurrentMethod(prev => ({
              ...prev,
              groupInfo: {
                id: firstMethod.id,
                name: firstMethod.name,
                currentMethodId: firstMethod.methods[0].id,
              },
            }));
          } else {
            await fetchMethodDetails(page.id, firstMethod.id);
          }
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке методов исследования:', error);
      setError('Не удалось загрузить методы исследования');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isDepartment) {
          const departmentResponse = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/departments/${id}/`
          );
          setLaboratoryId(departmentResponse.data.laboratory);
          setEntityName(departmentResponse.data.name);
        } else {
          const laboratoryResponse = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/laboratories/${id}/`
          );
          setLaboratoryId(id);
          setEntityName(laboratoryResponse.data.name);
        }
      } catch (error) {
        console.error('Ошибка при получении данных:', error);
        setEntityName('Нефтепродукты');
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, isDepartment]);

  useEffect(() => {
    fetchResearchMethods();
  }, [id, isDepartment]);

  const fetchMethodDetails = async (pageId, methodId) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/research-methods/${methodId}/`
      );
      setCurrentMethod(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке деталей метода:', error);
      setSnackbar({
        open: true,
        message: 'Не удалось загрузить детали метода исследования',
        severity: 'error',
      });
    }
  };

  const handleTabChange = async (_, newValue) => {
    setSelectedTab(newValue);

    const activeMethods = researchMethods.filter(method => method.is_active);
    if (researchPageId && activeMethods[newValue]) {
      const selectedMethod = activeMethods[newValue];
      if (selectedMethod.is_group && selectedMethod.methods && selectedMethod.methods.length > 0) {
        const firstGroupMethod = selectedMethod.methods[0];
        await fetchMethodDetails(researchPageId, firstGroupMethod.id);
        setCurrentMethod(prev => ({
          ...prev,
          groupInfo: {
            id: selectedMethod.id,
            name: selectedMethod.name,
            currentMethodId: firstGroupMethod.id,
          },
        }));
      } else {
        await fetchMethodDetails(researchPageId, selectedMethod.id);
        setCurrentMethod(prev => ({
          ...prev,
          groupInfo: null,
        }));
      }
    }
  };

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handleMethodAdded = async newMethod => {
    try {
      // Перезагружаем все методы и группы для обновления состояния
      await fetchResearchMethods();

      // Получаем актуальный список активных методов после обновления
      const activeMethods = researchMethods.filter(method => method.is_active);

      // Находим индекс нового метода
      const newMethodIndex = activeMethods.findIndex(
        method =>
          method.id === newMethod.id ||
          (method.is_group && method.methods?.some(m => m.id === newMethod.id))
      );

      // Устанавливаем таб на новый метод, если он найден, иначе на последний
      setSelectedTab(newMethodIndex !== -1 ? newMethodIndex : activeMethods.length - 1);

      // Если новый метод найден, загружаем его детали
      if (newMethodIndex !== -1) {
        const method = activeMethods[newMethodIndex];
        if (method.is_group && method.methods?.length > 0) {
          // Если это группа, загружаем первый метод из группы
          await fetchMethodDetails(researchPageId, method.methods[0].id);
          setCurrentMethod(prev => ({
            ...prev,
            groupInfo: {
              id: method.id,
              name: method.name,
              currentMethodId: method.methods[0].id,
            },
          }));
        } else {
          // Если это обычный метод
          await fetchMethodDetails(researchPageId, method.id);
        }
      }

      setSnackbar({
        open: true,
        message: 'Метод исследования успешно добавлен',
        severity: 'success',
      });
    } catch (error) {
      console.error('Ошибка при обновлении списка методов:', error);
      setSnackbar({
        open: true,
        message: 'Ошибка при обновлении списка методов',
        severity: 'error',
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleHideMethod = async () => {
    try {
      // Если это группа методов
      if (methodToHide.is_group) {
        // Получаем ID группы
        const groupId = methodToHide.id.replace('group_', '');

        // Деактивируем группу
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/research-method-groups/${groupId}/toggle_active/`
        );

        // Получаем ID всех методов в группе
        const methodIds = methodToHide.methods.map(method => method.id);

        // Скрываем каждый метод в группе
        for (const methodId of methodIds) {
          await axios.patch(
            `${import.meta.env.VITE_API_URL}/api/research-pages/${researchPageId}/methods/${methodId}/`,
            { is_active: false }
          );
        }
      } else {
        // Для обычного метода - стандартная логика
        await axios.patch(
          `${import.meta.env.VITE_API_URL}/api/research-pages/${researchPageId}/methods/${methodToHide.id}/`,
          { is_active: false }
        );
      }

      // Обновляем состояние на фронтенде
      const updatedMethods = researchMethods.map(method => {
        if (methodToHide.is_group) {
          // Если текущий метод - это скрываемая группа
          if (method.id === methodToHide.id) {
            return {
              ...method,
              methods: method.methods.map(m => ({ ...m, is_active: false })),
              is_active: false,
            };
          }
        } else if (method.id === methodToHide.id) {
          // Для обычного метода
          return { ...method, is_active: false };
        }
        return method;
      });

      // Перезагружаем методы для обновления состояния
      await fetchResearchMethods();

      // Находим индекс скрываемого метода среди активных методов
      const activeMethodsBeforeHide = researchMethods.filter(m => m.is_active);
      const hiddenMethodActiveIndex = activeMethodsBeforeHide.findIndex(
        m => m.id === methodToHide.id
      );

      // Если скрытый метод был активным, переключаемся на предыдущий активный метод или на первый доступный
      if (selectedTab === hiddenMethodActiveIndex) {
        const activeMethodsAfterHide = updatedMethods.filter(m => m.is_active);
        const newIndex = Math.max(0, hiddenMethodActiveIndex - 1);
        setSelectedTab(newIndex);

        if (activeMethodsAfterHide.length > 0) {
          const newMethod = activeMethodsAfterHide[newIndex] || activeMethodsAfterHide[0];
          await fetchMethodDetails(researchPageId, newMethod.id);
        }
      }

      setSnackbar({
        open: true,
        message: 'Метод успешно скрыт',
        severity: 'success',
      });
    } catch (error) {
      console.error('Ошибка при скрытии метода:', error);
      setSnackbar({
        open: true,
        message: 'Не удалось скрыть метод',
        severity: 'error',
      });
    } finally {
      setIsHideModalOpen(false);
      setMethodToHide(null);
    }
  };

  const handleOpenHideModal = method => {
    setMethodToHide(method);
    setIsHideModalOpen(true);
  };

  const handleCloseHideModal = () => {
    setIsHideModalOpen(false);
    setMethodToHide(null);
  };

  const handleMethodChange = methodId => {
    const method = researchMethods.find(m => m.id === methodId);
    setSelectedMethod(method);
    form.resetFields(['input_value']);
    setCalculationResults(null);
  };

  const handleGroupMethodChange = (groupId, methodId) => {
    const method = researchMethods.find(m => m.id === methodId);
    setSelectedMethod(method);
    form.resetFields(['input_value']);
    setCalculationResults(null);
  };

  const onFinish = async values => {
    if (!selectedMethod) {
      message.error('Пожалуйста, выберите метод исследования');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/calculate/`, {
        method_id: selectedMethod.id,
        input_value: values.input_value,
      });

      setCalculationResults(response.data);
    } catch (error) {
      console.error('Ошибка при выполнении расчета:', error);
      message.error('Не удалось выполнить расчет');
    } finally {
      setLoading(false);
    }
  };

  const renderMethodOption = method => {
    if (!method.group) {
      return (
        <Option key={method.id} value={method.id}>
          {method.name}
        </Option>
      );
    }

    return (
      <Option key={method.id} value={method.id}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '14px', fontFamily: 'HeliosCondC' }}>{method.name}</span>
          <span className="method-group-label">{method.group.name}</span>
        </div>
      </Option>
    );
  };

  const renderGroupMethodSelector = () => {
    if (!selectedMethod?.group) return null;

    const group = methodGroups.find(g => g.id === selectedMethod.group.id);
    if (!group) return null;

    const groupMethods = researchMethods.filter(m => group.method_ids.includes(m.id));

    return (
      <div className="method-group-selector">
        <span className="method-group-name">{group.name}:</span>
        <select
          value={selectedMethod.id}
          onChange={e => handleGroupMethodChange(group.id, Number(e.target.value))}
        >
          {groupMethods.map(method => (
            <option key={method.id} value={method.id}>
              {method.name}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const handleKeyDown = (e, currentFieldIndex, cardFields) => {
    // Сначала проверяем Enter для сохранения существующей функциональности
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextFieldIndex = (currentFieldIndex + 1) % cardFields.length;
      const nextField = cardFields[nextFieldIndex];
      const nextFieldName = `${methodId}_${nextField.name}`;
      if (inputRefs.current[nextFieldName]) {
        inputRefs.current[nextFieldName].focus();
      }
      return;
    }

    // Разрешаем: backspace, delete, tab, escape, запятая, минус
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'Escape' ||
      e.key === ',' ||
      e.key === '-' ||
      // Разрешаем: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      ((e.ctrlKey || e.metaKey) &&
        (e.key === 'a' || e.key === 'c' || e.key === 'v' || e.key === 'x')) ||
      // Разрешаем: цифры
      /[0-9]/.test(e.key)
    ) {
      return;
    }
    e.preventDefault();
  };

  const renderInputFields = methodId => {
    if (!currentMethod) return null;

    const fields = currentMethod.input_data.fields;
    const cardIndices = [...new Set(fields.map(field => field.card_index))].sort();

    return (
      <>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
            gap: '16px',
            marginBottom: '10px',
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
                  padding: '20px',
                  paddingBottom: '12px',
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
                            maxLength={10}
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
      </>
    );
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
      setSnackbar({
        open: true,
        message: 'Нет результатов для сохранения',
        severity: 'warning',
      });
    }
  };

  const handleCloseSaveModal = () => {
    setIsSaveModalOpen(false);
  };

  const handleSaveSuccess = savedData => {
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

    setMethodsData(prev => ({
      ...prev,
      [currentMethod.id]: {
        ...prev[currentMethod.id],
        formValues: emptyValues,
        lastCalculationResult: null,
        calculationResults: [],
      },
    }));

    // Очищаем значения формы в общем состоянии
    setFormValues(prev => ({
      ...prev,
      ...emptyValues,
    }));

    // Очищаем регистрационный номер и дату лабораторной деятельности
    setRegistrationNumber('');
    setLaboratoryActivityDate(null);

    // Снимаем блокировку с полей
    setLockedMethods(prev => ({
      ...prev,
      [currentMethod.id]: false,
    }));

    message.success('Результат расчета успешно сохранен');
  };

  const handleCalculate = async methodId => {
    try {
      const methodDetailsResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/research-methods/${methodId}/`
      );
      const methodDetails = methodDetailsResponse.data;

      const inputData = {};
      methodDetails.input_data.fields.forEach(field => {
        const value = form.getFieldValue(`${methodId}_${field.name}`);
        if (value) {
          const cleanedValue = value.toString().trim().replace(',', '.');
          inputData[field.name] = cleanedValue;
        }
      });

      const emptyFields = methodDetails.input_data.fields
        .filter(field => !inputData[field.name] || inputData[field.name].length === 0)
        .map(field => field.name);

      if (emptyFields.length > 0) {
        setSnackbar({
          open: true,
          message: `Необходимо заполнить следующие поля:\n${emptyFields.join(', ')}`,
          severity: 'warning',
        });
        return;
      }

      setIsCalculating(true);

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
      setSnackbar({
        open: true,
        message: error.message || 'Ошибка при расчете',
        severity: 'error',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleInputChange = (e, fieldName) => {
    let value = e.target.value;

    // Заменяем точки на запятые при вводе
    value = value.replace(/\./g, ',');

    const pattern = /^-?\d*,?\d*$/;

    if (value === '' || value === '-' || pattern.test(value)) {
      const commaCount = (value.match(/,/g) || []).length;
      if (commaCount <= 1) {
        const minusCount = (value.match(/-/g) || []).length;
        if (minusCount <= 1 && value.indexOf('-') <= 0) {
          form.setFieldValue(fieldName, value);

          // Устанавливаем курсор в правильную позицию после замены
          const input = e.target;
          const position = input.selectionStart;
          setTimeout(() => {
            input.setSelectionRange(position, position);
          }, 0);
        }
      }
    }
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

  const onDragEnd = async result => {
    if (!result.destination) return;

    const items = Array.from(researchMethods);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      sort_order: index,
    }));

    setResearchMethods(updatedItems);

    try {
      // Собираем все методы для обновления
      const methodsToUpdate = updatedItems.flatMap((item, index) => {
        if (item.is_group) {
          // Для группы отправляем все её методы
          return item.methods.map(method => ({
            id: method.id,
            sort_order: index,
          }));
        } else {
          // Для одиночного метода
          return [
            {
              id: item.id,
              sort_order: index,
            },
          ];
        }
      });

      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/research-pages/${researchPageId}/methods/order/`,
        { methods: methodsToUpdate }
      );
    } catch (error) {
      console.error('Ошибка при обновлении порядка методов:', error);
      setSnackbar({
        open: true,
        message: 'Не удалось обновить порядок методов',
        severity: 'error',
      });
    }
  };

  const handleOpenGenerateProtocolModal = () => {
    setIsGenerateProtocolModalOpen(true);
  };

  const handleCloseGenerateProtocolModal = () => {
    setIsGenerateProtocolModalOpen(false);
  };

  const handleRegistrationSearch = async value => {
    if (!value) {
      setRegistrationOptions([]);
      return;
    }

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/get-registration-numbers/`,
        {
          params: {
            laboratory_id: laboratoryId,
            department_id: isDepartment ? id : null,
            method_id: currentMethod?.id,
            partial_number: value,
          },
        }
      );

      if (Array.isArray(response.data)) {
        const options = response.data.map(number => ({
          value: number,
          label: number,
        }));
        setRegistrationOptions(options);
      }
    } catch (error) {
      console.error('Ошибка при получении регистрационных номеров:', error);
      setRegistrationOptions([]);
    }
  };

  const handleLoadRegistrationData = async () => {
    if (!registrationNumber || !currentMethod) {
      setSnackbar({
        open: true,
        message: 'Введите регистрационный номер',
        severity: 'warning',
      });
      return;
    }

    setIsLoadingRegistrationData(true);
    setLockedMethods(prev => ({
      ...prev,
      [currentMethod.id]: true,
    }));

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/get-registration-numbers/`,
        {
          params: {
            laboratory_id: laboratoryId,
            method_id: currentMethod.id,
            registration_number: registrationNumber,
            department_id: isDepartment ? id : null,
          },
        }
      );

      console.log('Полученные данные от сервера:', response.data);

      if (response.data) {
        const initialValues = {};

        // Обрабатываем поля ввода
        Object.entries(response.data).forEach(([fieldName, value]) => {
          if (fieldName === 'laboratory_activity_date') {
            console.log('Найдена дата лабораторной деятельности:', value);
            const date = dayjs(value);
            console.log('Дата после преобразования в dayjs:', date);
            console.log('Дата валидна:', date.isValid());
            console.log('Дата в формате DD.MM.YYYY:', date.format('DD.MM.YYYY'));
            if (date.isValid()) {
              setLaboratoryActivityDate(date);
              console.log('Дата установлена в состояние');
            }
          } else {
            currentMethod.input_data.fields.forEach(field => {
              if (field.name === fieldName) {
                const formFieldName = `${currentMethod.id}_${field.name}`;
                initialValues[formFieldName] = value.toString().replace('.', ',');
              }
            });
          }
        });

        // Обновляем значения формы
        form.setFieldsValue(initialValues);
        setFormValues(prev => ({
          ...prev,
          ...initialValues,
        }));

        setSnackbar({
          open: true,
          message: 'Данные успешно загружены',
          severity: 'success',
        });
      }
    } catch (error) {
      console.error('Ошибка при получении данных:', error);
      setSnackbar({
        open: true,
        message: 'Не удалось загрузить данные по указанному номеру',
        severity: 'error',
      });
      setLockedMethods(prev => ({
        ...prev,
        [currentMethod.id]: false,
      }));
    } finally {
      setIsLoadingRegistrationData(false);
    }
  };

  useEffect(() => {
    const values = form.getFieldsValue();
    if (currentMethod?.id) {
      setMethodsData(prev => ({
        ...prev,
        [currentMethod.id]: {
          formValues: values,
          calculationResults: calculationResults[currentMethod.id] || [],
          lastCalculationResult: lastCalculationResult[currentMethod.id],
          registrationNumber: registrationNumber,
          lockedMethods: lockedMethods[currentMethod.id],
        },
      }));
    }
  }, [
    form,
    currentMethod?.id,
    calculationResults,
    lastCalculationResult,
    registrationNumber,
    lockedMethods,
  ]);

  useEffect(() => {
    if (currentMethod?.id && methodsData[currentMethod.id]) {
      const methodData = methodsData[currentMethod.id];
      form.setFieldsValue(methodData.formValues || {});
      setCalculationResults(prev => ({
        ...prev,
        [currentMethod.id]: methodData.calculationResults || [],
      }));
      setLastCalculationResult(prev => ({
        ...prev,
        [currentMethod.id]: methodData.lastCalculationResult,
      }));
      setRegistrationNumber(methodData.registrationNumber || '');
      setLockedMethods(prev => ({
        ...prev,
        [currentMethod.id]: methodData.lockedMethods,
      }));
    }
  }, [currentMethod?.id]);

  // Функция для форматирования ввода даты
  const formatDateInput = value => {
    const numbers = value.replace(/\D/g, '');
    const limitedNumbers = numbers.slice(0, 8);
    if (limitedNumbers.length <= 2) return limitedNumbers;
    if (limitedNumbers.length <= 4)
      return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2)}`;
    return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 4)}.${limitedNumbers.slice(4)}`;
  };

  // Функция для валидации даты
  const isValidDate = dateString => {
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) return false;
    const [day, month, year] = dateString.split('.').map(Number);
    const date = new Date(year, month - 1, day);
    return (
      date.getDate() === day &&
      date.getMonth() === month - 1 &&
      date.getFullYear() === year &&
      year >= 1900 &&
      year <= 2100
    );
  };

  if (isLoading) {
    return (
      <OilProductsPageWrapper>
        <Layout title="Загрузка...">
          <div style={{ position: 'relative', minHeight: 'calc(100vh - 64px)' }}>
            <LoadingCard />
          </div>
        </Layout>
      </OilProductsPageWrapper>
    );
  }

  if (error) {
    return (
      <OilProductsPageWrapper>
        <Layout title="Ошибка">
          <Alert severity="error">{error}</Alert>
        </Layout>
      </OilProductsPageWrapper>
    );
  }

  const activeMethods = researchMethods.filter(method => method.is_active);
  const hasNoMethods = activeMethods.length === 0;

  return (
    <OilProductsPageWrapper>
      <Layout title={entityName || 'Нефтепродукты'}>
        <Form form={form} onFinish={onFinish} layout="vertical" preserve={false}>
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
                  paddingBottom: '12px',
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
                <IconButton
                  color="primary"
                  aria-label="добавить метод"
                  size="small"
                  onClick={handleOpenAddModal}
                  sx={{
                    backgroundColor: '#f5f5f5',
                    '&:hover': {
                      backgroundColor: '#e0e0e0',
                    },
                    padding: '4px',
                  }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
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
                  Нет активных методов исследования
                </div>
              ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="methods">
                    {provided => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '5px',
                          height: 'calc(100% - 60px)',
                          overflowY: 'auto',
                          paddingRight: '4px',
                        }}
                      >
                        {researchMethods.map((method, index) => {
                          if (method.is_group) {
                            return (
                              <Draggable
                                key={method.uniqueId}
                                draggableId={method.uniqueId.toString()}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    onClick={() => handleTabChange(null, index)}
                                    style={{
                                      ...provided.draggableProps.style,
                                      padding: '8px 12px',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      backgroundColor:
                                        selectedTab === index ? '#e2e8f0' : 'transparent',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      transition: 'all 0.2s ease-in-out',
                                      boxShadow:
                                        selectedTab === index
                                          ? '0 2px 4px rgba(0,0,0,0.05)'
                                          : 'none',
                                      border:
                                        selectedTab === index
                                          ? '1px solid #cbd5e0'
                                          : '1px solid transparent',
                                      opacity: snapshot.isDragging ? 0.8 : 1,
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
                                        selectedTab === index ? '#e2e8f0' : 'transparent';
                                      e.currentTarget.style.transform = 'none';
                                      e.currentTarget.style.boxShadow =
                                        selectedTab === index
                                          ? '0 2px 4px rgba(0,0,0,0.05)'
                                          : 'none';
                                      e.currentTarget.style.border =
                                        selectedTab === index
                                          ? '1px solid #cbd5e0'
                                          : '1px solid transparent';
                                    }}
                                  >
                                    <div
                                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                      <div
                                        {...provided.dragHandleProps}
                                        style={{ display: 'flex', alignItems: 'center' }}
                                      >
                                        <DragIndicatorIcon
                                          style={{ fontSize: '20px', color: '#666' }}
                                        />
                                      </div>
                                      <span style={{ fontSize: '14px', fontFamily: 'HeliosCondC' }}>
                                        {method.name}
                                      </span>
                                    </div>
                                    <IconButton
                                      size="small"
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleOpenHideModal(method);
                                      }}
                                      sx={{ padding: '2px' }}
                                    >
                                      <CloseIcon fontSize="small" />
                                    </IconButton>
                                  </div>
                                )}
                              </Draggable>
                            );
                          }
                          return method.is_active ? (
                            <Draggable
                              key={method.uniqueId}
                              draggableId={method.uniqueId.toString()}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  onClick={() => handleTabChange(null, index)}
                                  style={{
                                    ...provided.draggableProps.style,
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    backgroundColor:
                                      selectedTab === index ? '#e2e8f0' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'all 0.2s ease-in-out',
                                    boxShadow:
                                      selectedTab === index ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                    border:
                                      selectedTab === index
                                        ? '1px solid #cbd5e0'
                                        : '1px solid transparent',
                                    opacity: snapshot.isDragging ? 0.8 : 1,
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
                                      selectedTab === index ? '#e2e8f0' : 'transparent';
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow =
                                      selectedTab === index ? '0 2px 4px rgba(0,0,0,0.05)' : 'none';
                                    e.currentTarget.style.border =
                                      selectedTab === index
                                        ? '1px solid #cbd5e0'
                                        : '1px solid transparent';
                                  }}
                                >
                                  <div
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                  >
                                    <div
                                      {...provided.dragHandleProps}
                                      style={{ display: 'flex', alignItems: 'center' }}
                                    >
                                      <DragIndicatorIcon
                                        style={{ fontSize: '20px', color: '#666' }}
                                      />
                                    </div>
                                    <span style={{ fontSize: '14px', fontFamily: 'HeliosCondC' }}>
                                      {method.name}
                                    </span>
                                  </div>
                                  <IconButton
                                    size="small"
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleOpenHideModal(method);
                                    }}
                                    sx={{ padding: '2px' }}
                                  >
                                    <CloseIcon fontSize="small" />
                                  </IconButton>
                                </div>
                              )}
                            </Draggable>
                          ) : null;
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
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
                height: 'calc(100% + 21px)',
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
                    Добавьте первый метод исследования, нажав на кнопку "+" в левой панели
                  </Typography>
                  <Button
                    type="primary"
                    onClick={handleOpenAddModal}
                    icon={<AddIcon />}
                    style={{ fontFamily: 'HeliosCondC' }}
                  >
                    Добавить метод
                  </Button>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '16px',
                      alignItems: 'center',
                      width: '100%',
                      maxWidth: '100%',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AutoComplete
                          value={registrationNumber}
                          onChange={value => setRegistrationNumber(value)}
                          onSearch={handleRegistrationSearch}
                          options={registrationOptions}
                          placeholder="Введите регистрационный номер"
                          style={{ width: '250px', fontFamily: 'HeliosCondC' }}
                        />
                        <Button
                          onClick={handleLoadRegistrationData}
                          loading={isLoadingRegistrationData}
                          style={{ fontFamily: 'HeliosCondC' }}
                        >
                          Показать
                        </Button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    </div>
                    <Button
                      type="primary"
                      onClick={handleOpenGenerateProtocolModal}
                      style={{ fontFamily: 'HeliosCondC' }}
                    >
                      Сформировать протокол
                    </Button>
                  </div>

                  {researchMethods
                    .filter(method => method.is_active)
                    .map((method, index) => (
                      <TabPanel key={`panel-${method.uniqueId}`} value={selectedTab} index={index}>
                        {currentMethod && (
                          <div
                            className="calculation-form"
                            style={{ width: '100%', maxWidth: '100%' }}
                          >
                            <Typography
                              variant="h5"
                              style={{
                                color: '#2c5282',
                                fontSize: '20px',
                                fontWeight: 600,
                                textAlign: 'left',
                                marginBottom: '20px',
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
                                    fetchMethodDetails(researchPageId, newMethodId);
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

                            {/* Блок полей ввода */}
                            {renderInputFields(currentMethod.id)}

                            {/* Блок результатов */}
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'row',
                                gap: '16px',
                                marginBottom: '0',
                                justifyContent: 'left',
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
                                    {result.convergence === 'satisfactory'
                                      ? ` ${result.result} ± ${result.measurement_error} ${result.unit}`
                                      : result.convergence === 'absence'
                                        ? ' Отсутствие'
                                        : result.convergence === 'traces'
                                          ? ' Следы'
                                          : ' Неудовлетворительно'}
                                  </Typography>

                                  {/* Отображение информации о сходимости */}
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
                                    Проверка сходимости:
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
                                                fontFamily: 'monospace',
                                                marginBottom: '12px',
                                                fontSize: '14px',
                                                color: '#1a365d',
                                                paddingBottom: '12px',
                                                borderBottom: '1px solid rgba(64, 150, 255, 0.15)',
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

                                  {result.convergence === 'satisfactory' &&
                                    Object.keys(result.intermediate_results).length > 0 && (
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
                                                          field.description ||
                                                          'Описание отсутствует'
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
                                buttonColor="#0066cc"
                                onClick={() => handleCalculate(currentMethod.id)}
                                loading={isCalculating}
                                style={{ fontFamily: 'HeliosCondC' }}
                              >
                                Рассчитать
                              </Button>
                              {lastCalculationResult[currentMethod?.id] && (
                                <Button
                                  type="primary"
                                  buttonColor="#28a745"
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

          <HideMethodModal
            isOpen={isHideModalOpen}
            onClose={handleCloseHideModal}
            onConfirm={handleHideMethod}
            methodName={methodToHide?.name}
          />

          {currentMethod && (
            <SaveCalculationModal
              isOpen={isSaveModalOpen}
              onClose={handleCloseSaveModal}
              calculationResult={{
                ...lastCalculationResult[currentMethod.id],
                laboratory_activity_date: laboratoryActivityDate,
              }}
              currentMethod={currentMethod}
              laboratoryId={laboratoryId}
              departmentId={isDepartment ? id : null}
              onSuccess={handleSaveSuccess}
            />
          )}

          <AddCalculationModal
            isOpen={isAddModalOpen}
            onClose={handleCloseAddModal}
            researchPageId={researchPageId}
            onSuccess={handleMethodAdded}
            objectType="oil_products"
          />

          <GenerateProtocolModal
            isOpen={isGenerateProtocolModalOpen}
            onClose={handleCloseGenerateProtocolModal}
            laboratoryId={isDepartment ? laboratoryId : id}
            departmentId={isDepartment ? id : null}
          />

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
        </Form>
      </Layout>
    </OilProductsPageWrapper>
  );
};

export default OilProductsPage;
