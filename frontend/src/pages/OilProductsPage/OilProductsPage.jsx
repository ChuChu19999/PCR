import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Tabs, Tab, Typography, Snackbar, Alert, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Form, Input, Button, Select, message } from 'antd';
import Layout from '../../shared/ui/Layout/Layout';
import { FormItem } from '../../features/FormItems';
import OilProductsPageWrapper from './OilProductsPageWrapper';
import AddCalculationModal from '../../features/Modals/AddCalculationModal/AddCalculationModal';
import HideMethodModal from '../../features/Modals/HideMethodModal/HideMethodModal';
import axios from 'axios';
import './OilProductsPage.css';

const { Option } = Select;

const TabPanel = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <div className="tab-content">{children}</div>}
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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

        const groupsResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/research-method-groups/`
        );

        const groups = groupsResponse.data;
        setMethodGroups(groups);

        const methodsWithGroups = page.research_methods.map((method, index) => {
          if (method.is_group) {
            // Если это группа, добавляем is_active: true для отображения
            return {
              ...method,
              uniqueId: method.id,
              is_active: true,
              methods: method.methods.map(m => ({
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

        console.log('Методы после обработки:', methodsWithGroups);
        setResearchMethods(methodsWithGroups);

        // Выбираем первый активный метод
        const activeMethods = methodsWithGroups.filter(method => method.is_active);
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
        // Если выбрана группа, загружаем первый метод из группы
        const firstGroupMethod = selectedMethod.methods[0];
        await fetchMethodDetails(researchPageId, firstGroupMethod.id);
        // Сохраняем информацию о текущей группе
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
        // Очищаем информацию о группе
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
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/research-pages/${researchPageId}/methods/${methodToHide.id}/`,
        { is_active: false }
      );

      const updatedMethods = researchMethods.map(method =>
        method.id === methodToHide.id ? { ...method, is_active: false } : method
      );
      setResearchMethods(updatedMethods);

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
          <span>{method.name}</span>
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

  const renderInputFields = (methodId, parallelIndex = 0) => {
    if (!currentMethod) return null;

    const result = calculationResults[currentMethod.id]?.[parallelIndex];
    const generalFields = currentMethod.input_data.fields.filter(field => field.is_general);
    const nonGeneralFields = currentMethod.input_data.fields.filter(field => !field.is_general);
    const hasParallels = currentMethod.parallel_count > 0;

    // Группируем поля по card_index
    const cardIndices = [...new Set(nonGeneralFields.map(field => field.card_index))].sort();

    return (
      <>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '16px',
            marginBottom: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {cardIndices.map(cardIndex => {
            const cardFields = nonGeneralFields.filter(field => field.card_index === cardIndex);
            if (cardFields.length === 0) return null;

            return (
              <div
                key={cardIndex}
                style={{
                  padding: '20px',
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                  marginBottom: '0',
                  flex: '1',
                  minWidth: '200px',
                  maxWidth: '250px',
                }}
              >
                {cardFields.map((field, fieldIndex) => (
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
                      name={`${currentMethod.id}_${field.name}_${parallelIndex}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Input
                          placeholder={`Введите ${field.name}`}
                          maxLength={10}
                          style={{ fontSize: '14px' }}
                          onChange={e =>
                            handleInputChange(
                              e,
                              `${currentMethod.id}_${field.name}_${parallelIndex}`
                            )
                          }
                          onKeyPress={e => {
                            const pattern = /^[0-9,\-]$/;
                            if (!pattern.test(e.key)) {
                              e.preventDefault();
                            }
                            if (e.key === '.') {
                              e.preventDefault();
                              const input = e.target;
                              const value = input.value;
                              const position = input.selectionStart;
                              const newValue =
                                value.slice(0, position) + ',' + value.slice(position);
                              form.setFieldValue(
                                `${currentMethod.id}_${field.name}_${parallelIndex}`,
                                newValue
                              );
                              setTimeout(() => {
                                input.setSelectionRange(position + 1, position + 1);
                              }, 0);
                            }
                          }}
                        />
                        {field.unit && (
                          <span
                            style={{ color: '#666', fontSize: '14px', fontFamily: 'HeliosCondC' }}
                          >
                            {field.unit}
                          </span>
                        )}
                      </div>
                    </FormItem>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const handleCalculate = async methodId => {
    try {
      // Проверяем заполнение полей перед расчетом
      const methodDetailsResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/research-methods/${methodId}/`
      );
      const methodDetails = methodDetailsResponse.data;
      const parallelCount = methodDetails.parallel_count || 0;

      // Проверяем общие поля
      const emptyGeneralFields = [];
      methodDetails.input_data.fields
        .filter(field => field.is_general)
        .forEach(field => {
          const value = form.getFieldValue(`${methodId}_${field.name}_general`);
          if (!value && value !== 0) {
            emptyGeneralFields.push(field.name);
          }
        });

      // Проверяем поля для каждой параллели
      const emptyParallelFields = {};
      for (let i = 0; i <= parallelCount; i++) {
        const emptyFields = [];
        methodDetails.input_data.fields
          .filter(field => !field.is_general)
          .forEach(field => {
            const value = form.getFieldValue(`${methodId}_${field.name}_${i}`);
            if (!value && value !== 0) {
              emptyFields.push(field.name);
            }
          });
        if (emptyFields.length > 0) {
          emptyParallelFields[i] = emptyFields;
        }
      }

      // Если есть незаполненные поля, показываем уведомление
      if (emptyGeneralFields.length > 0 || Object.keys(emptyParallelFields).length > 0) {
        let message = 'Необходимо заполнить следующие поля:\n';

        if (emptyGeneralFields.length > 0) {
          message += `\nОбщие поля:\n${emptyGeneralFields.join(', ')}`;
        }

        if (Object.keys(emptyParallelFields).length > 0) {
          Object.entries(emptyParallelFields).forEach(([parallel, fields]) => {
            message += `\n\nПараллель ${parseInt(parallel) + 1}:\n${fields.join(', ')}`;
          });
        }

        setSnackbar({
          open: true,
          message,
          severity: 'warning',
        });
        return;
      }

      setIsCalculating(true);

      // Находим метод, учитывая возможность группировки
      let method = null;

      // Сначала ищем среди одиночных методов
      method = researchMethods.find(m => !m.is_group && m.id === methodId);

      // Если не нашли среди одиночных, ищем в группах
      if (!method) {
        for (const groupMethod of researchMethods) {
          if (groupMethod.is_group && groupMethod.methods) {
            const foundMethod = groupMethod.methods.find(m => m.id === methodId);
            if (foundMethod) {
              method = foundMethod;
              break;
            }
          }
        }
      }

      if (!method) {
        throw new Error('Метод не найден');
      }

      const parallelResults = [];

      // Получаем значения общих переменных
      const generalValues = {};
      methodDetails.input_data.fields
        .filter(field => field.is_general)
        .forEach(field => {
          const value = form.getFieldValue(`${methodId}_${field.name}_general`);
          if (value) {
            generalValues[field.name] = value.trim().replace(',', '.');
          }
        });

      // Вычисляем для каждой параллели
      for (let i = 0; i <= parallelCount; i++) {
        const formValues = form.getFieldsValue();
        const inputData = { ...generalValues }; // Добавляем общие значения

        // Добавляем значения не общих переменных для текущей параллели
        methodDetails.input_data.fields
          .filter(field => !field.is_general)
          .forEach(field => {
            let value = formValues[`${methodId}_${field.name}_${i}`];

            if (typeof value === 'string') {
              value = value.trim().replace(',', '.');
            }
            inputData[field.name] = parseFloat(value);
          });

        // Получаем выбранный вариант расчета
        const selectedVariantIndex = selectedVariants[`${methodId}_${i}`];
        const selectedVariant =
          selectedVariantIndex !== undefined && methodDetails.variants[selectedVariantIndex];

        const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/calculate/`, {
          input_data: inputData,
          research_method: {
            ...methodDetails,
            formula: selectedVariant ? selectedVariant.formula : methodDetails.formula,
          },
        });

        parallelResults.push({
          ...response.data,
          result: response.data.result ? response.data.result.replace('.', ',') : null,
          measurement_error: response.data.measurement_error
            ? response.data.measurement_error.replace('.', ',')
            : null,
          intermediate_results: Object.fromEntries(
            Object.entries(response.data.intermediate_results).map(([key, value]) => [
              key,
              value.replace('.', ','),
            ])
          ),
        });
      }

      setCalculationResults(prev => ({
        ...prev,
        [methodId]: parallelResults,
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

  if (isLoading) {
    return (
      <OilProductsPageWrapper>
        <Layout title="Загрузка...">
          <div>Загрузка данных...</div>
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

  return (
    <OilProductsPageWrapper>
      <Layout title="Нефтепродукты">
        <Form form={form} onFinish={onFinish} layout="vertical">
          <div style={{ display: 'flex', alignItems: 'center', width: 'fit-content' }}>
            <Tabs
              value={selectedTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              className="custom-tabs"
              TabIndicatorProps={{ className: 'tab-indicator' }}
            >
              {researchMethods.map((method, index) => {
                // Убираем фильтр is_active для групп
                // Если метод является группой
                if (method.is_group) {
                  return (
                    <Tab
                      key={method.uniqueId}
                      className="custom-tab"
                      label={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{method.name}</span>
                          <IconButton
                            size="small"
                            onClick={e => {
                              e.stopPropagation();
                              handleOpenHideModal(method);
                            }}
                            sx={{
                              padding: '2px',
                              '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                              },
                            }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </div>
                      }
                    />
                  );
                }
                // Если метод не является группой, проверяем его активность
                return method.is_active ? (
                  <Tab
                    key={method.uniqueId}
                    className="custom-tab"
                    label={
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{method.name}</span>
                        <IconButton
                          size="small"
                          onClick={e => {
                            e.stopPropagation();
                            handleOpenHideModal(method);
                          }}
                          sx={{
                            padding: '2px',
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.1)',
                            },
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </div>
                    }
                  />
                ) : null;
              })}
            </Tabs>
            <IconButton
              color="primary"
              aria-label="добавить вкладку"
              size="small"
              onClick={handleOpenAddModal}
              sx={{
                marginLeft: 0.5,
                backgroundColor: '#f5f5f5',
                '&:hover': {
                  backgroundColor: '#e0e0e0',
                },
                padding: '4px',
                minWidth: '30px',
                height: '30px',
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </div>

          {researchMethods
            .filter(method => method.is_active)
            .map((method, index) => (
              <TabPanel key={`panel-${method.uniqueId}`} value={selectedTab} index={index}>
                {currentMethod && (
                  <div className="calculation-form">
                    <Typography
                      variant="h5"
                      style={{
                        color: '#2c5282',
                        fontSize: '20px',
                        fontWeight: 600,
                        textAlign: 'center',
                        marginBottom: '10px',
                      }}
                    >
                      {method.is_group ? method.name : currentMethod.name}
                    </Typography>

                    {method.is_group && method.methods && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
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

                    {/* Блок параллелей */}
                    {currentMethod.parallel_count > -1 && (
                      <>
                        {currentMethod.parallel_count > 0 && (
                          <Typography
                            variant="h6"
                            style={{
                              color: '#2c5282',
                              fontSize: '15px',
                              fontWeight: 600,
                              marginBottom: '0',
                              textAlign: 'center',
                            }}
                          ></Typography>
                        )}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: '16px',
                            marginBottom: '0',
                            justifyContent: 'center',
                          }}
                        >
                          {Array.from({ length: (currentMethod.parallel_count || 0) + 1 }).map(
                            (_, i) => renderInputFields(currentMethod.id, i)
                          )}
                        </div>
                      </>
                    )}

                    {/* Блок общих переменных */}
                    {currentMethod.input_data.fields.some(field => field.is_general) && (
                      <div
                        style={{
                          backgroundColor: '#f8fafc',
                          padding: '12px',
                          borderRadius: '8px',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                          border: '1px solid #e2e8f0',
                          maxWidth: '400px',
                          margin: '0 auto',
                          marginBottom: '5px',
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '0',
                            alignItems: 'start',
                            marginBottom: '0',
                            padding: '0',
                          }}
                        >
                          {currentMethod.input_data.fields
                            .filter(field => field.is_general)
                            .map((field, fieldIndex) => (
                              <div
                                key={fieldIndex}
                                className="input-field-container"
                                style={{ margin: '-5px 0' }}
                              >
                                <FormItem
                                  title={
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        fontSize: '14px',
                                        color: '#4a5568',
                                        marginBottom: '0',
                                      }}
                                    >
                                      <span style={{ fontSize: '14px' }}>{field.name}</span>
                                      <Tooltip title={field.description} placement="right">
                                        <IconButton size="small">
                                          <HelpOutlineIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </div>
                                  }
                                  name={`${currentMethod.id}_${field.name}_general`}
                                >
                                  <div
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                  >
                                    <Input
                                      placeholder={`Введите ${field.name}`}
                                      maxLength={10}
                                      style={{ fontSize: '14px' }}
                                      onChange={e =>
                                        handleInputChange(
                                          e,
                                          `${currentMethod.id}_${field.name}_general`
                                        )
                                      }
                                      onKeyPress={e => {
                                        // Разрешаем только цифры, запятую и минус
                                        const pattern = /^[0-9,\-]$/;
                                        if (!pattern.test(e.key)) {
                                          e.preventDefault();
                                        }
                                        // Если пытаемся ввести точку, заменяем на запятую
                                        if (e.key === '.') {
                                          e.preventDefault();
                                          const input = e.target;
                                          const value = input.value;
                                          const position = input.selectionStart;
                                          const newValue =
                                            value.slice(0, position) + ',' + value.slice(position);
                                          form.setFieldValue(
                                            `${currentMethod.id}_${field.name}_general`,
                                            newValue
                                          );
                                          setTimeout(() => {
                                            input.setSelectionRange(position + 1, position + 1);
                                          }, 0);
                                        }
                                      }}
                                      onPaste={e => {
                                        // Разрешаем стандартную вставку текста
                                      }}
                                    />
                                    {field.unit && (
                                      <span
                                        style={{
                                          color: '#666',
                                          fontSize: '14px',
                                          fontFamily: 'HeliosCondC',
                                        }}
                                      >
                                        {field.unit}
                                      </span>
                                    )}
                                  </div>
                                </FormItem>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Блок результатов */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: '16px',
                        marginBottom: '0',
                        justifyContent: 'center',
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
                            {currentMethod.parallel_count > 0 && `Параллель ${index + 1}: `}
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
                                      {processAbs(condition.formula)
                                        .replace(/\*/g, '×')
                                        .replace(/<=/g, '≤')
                                        .replace(/>=/g, '≥')}
                                    </div>

                                    {/* Шаги расчета */}
                                    {condition.calculation_steps && (
                                      <>
                                        <div
                                          style={{
                                            fontFamily: 'monospace',
                                            marginBottom: '12px',
                                            color: '#4a5568',
                                            paddingBottom: '12px',
                                            borderBottom: '1px solid rgba(64, 150, 255, 0.15)',
                                          }}
                                        >
                                          {processAbs(condition.calculation_steps.step1)
                                            .replace(/\*/g, '×')
                                            .replace(/<=/g, '≤')
                                            .replace(/>=/g, '≥')
                                            .replace(/\./g, ',')}
                                        </div>
                                        <div
                                          style={{
                                            fontFamily: 'monospace',
                                            marginBottom: '12px',
                                            color: '#4a5568',
                                            paddingBottom: '12px',
                                            borderBottom: '1px solid rgba(64, 150, 255, 0.15)',
                                          }}
                                        >
                                          {processAbs(condition.calculation_steps.step2)
                                            .replace(/\*/g, '×')
                                            .replace(/<=/g, '≤')
                                            .replace(/>=/g, '≥')
                                            .replace(/\./g, ',')}
                                        </div>
                                      </>
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
                                                title={field.description || 'Описание отсутствует'}
                                                placement="right"
                                              >
                                                <IconButton size="small" style={{ padding: '0px' }}>
                                                  <HelpOutlineIcon
                                                    style={{ fontSize: '16px', color: '#718096' }}
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
                                        {value}
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

                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                      <Button
                        type="primary"
                        buttonColor="#0066cc"
                        onClick={() => handleCalculate(currentMethod.id)}
                        loading={isCalculating}
                        style={{ fontFamily: 'HeliosCondC' }}
                      >
                        Рассчитать
                      </Button>
                    </div>
                  </div>
                )}
              </TabPanel>
            ))}

          <HideMethodModal
            isOpen={isHideModalOpen}
            onClose={handleCloseHideModal}
            onConfirm={handleHideMethod}
            methodName={methodToHide?.name}
          />
        </Form>

        <AddCalculationModal
          isOpen={isAddModalOpen}
          onClose={handleCloseAddModal}
          researchPageId={researchPageId}
          onSuccess={handleMethodAdded}
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
      </Layout>
    </OilProductsPageWrapper>
  );
};

export default OilProductsPage;
