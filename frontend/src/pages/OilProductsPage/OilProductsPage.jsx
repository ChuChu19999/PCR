import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Tabs, Tab, Typography, Snackbar, Alert, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Form, Input } from 'antd';
import Layout from '../../shared/ui/Layout/Layout';
import { Button } from '../../shared/ui/Button/Button';
import { FormItem } from '../../features/FormItems';
import OilProductsPageWrapper from './OilProductsPageWrapper';
import AddCalculationModal from '../../features/Modals/AddCalculationModal/AddCalculationModal';
import axios from 'axios';

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
  const [currentMethod, setCurrentMethod] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [researchPageId, setResearchPageId] = useState(null);
  const [calculationResults, setCalculationResults] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
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
          setResearchMethods(page.research_methods || []);

          if (page.research_methods?.length > 0) {
            await fetchMethodDetails(page.id, page.research_methods[0].id);
          }
        }
      } catch (error) {
        console.error('Ошибка при загрузке методов исследования:', error);
        setError('Не удалось загрузить методы исследования');
      } finally {
        setIsLoading(false);
      }
    };

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
    if (researchPageId && researchMethods[newValue]) {
      await fetchMethodDetails(researchPageId, researchMethods[newValue].id);
    }
  };

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handleMethodAdded = newMethod => {
    setResearchMethods(prev => [...prev, newMethod]);
    setSelectedTab(researchMethods.length);
    setSnackbar({
      open: true,
      message: 'Метод исследования успешно добавлен',
      severity: 'success',
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleCalculate = async methodId => {
    try {
      setIsCalculating(true);
      const method = researchMethods.find(m => m.id === methodId);

      console.log('Базовые данные метода:', method);

      if (!method) {
        throw new Error('Метод не найден');
      }

      const methodDetailsResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/research-methods/${methodId}/`
      );

      const methodDetails = methodDetailsResponse.data;
      console.log('Полные данные метода:', methodDetails);

      if (!methodDetails.input_data || !methodDetails.input_data.fields) {
        console.error('Структура метода некорректна:', methodDetails);
        throw new Error('Некорректная структура метода исследования');
      }

      const formValues = form.getFieldsValue();
      console.log('Значения формы:', formValues);

      const inputData = {};
      let hasEmptyFields = false;
      let hasInvalidValues = false;

      methodDetails.input_data.fields.forEach(field => {
        let value = formValues[`${methodId}_${field.name}`];
        console.log(`Поле ${field.name}:`, value);

        if (typeof value === 'string') {
          value = value.trim();
          // Заменяем запятые на точки перед отправкой на сервер
          value = value.replace(',', '.');
        }

        if (!value && value !== 0) {
          hasEmptyFields = true;
          console.log(`Пустое поле: ${field.name}`);
        } else {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            hasInvalidValues = true;
            console.log(`Некорректное значение в поле ${field.name}: ${value}`);
          }
          inputData[field.name] = numValue;
        }
      });

      if (hasEmptyFields) {
        setSnackbar({
          open: true,
          message: 'Пожалуйста, заполните все поля',
          severity: 'warning',
        });
        setIsCalculating(false);
        return;
      }

      if (hasInvalidValues) {
        setSnackbar({
          open: true,
          message: 'Пожалуйста, введите корректные числовые значения',
          severity: 'warning',
        });
        setIsCalculating(false);
        return;
      }

      const requestData = {
        input_data: inputData,
        research_method: methodDetails,
      };

      console.log('Отправляемые данные:', requestData);

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/calculate/`,
        requestData
      );

      console.log('Ответ сервера:', response.data);

      // Преобразуем точки в запятые в результатах
      const formattedResults = {
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
      };

      setCalculationResults(prev => ({
        ...prev,
        [methodId]: formattedResults,
      }));
    } catch (error) {
      console.error('Подробная информация об ошибке:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });

      let errorMessage = 'Ошибка при расчете';
      if (error.message === 'Метод не найден') {
        errorMessage = 'Метод исследования не найден';
      } else if (error.message === 'Некорректная структура метода исследования') {
        errorMessage = 'Некорректная структура метода исследования';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleInputChange = (e, fieldName) => {
    let value = e.target.value;

    // Заменяем точки на запятые при вводе
    value = value.replace('.', ',');

    const pattern = /^-?\d*,?\d*$/;

    if (value === '' || value === '-' || pattern.test(value)) {
      const commaCount = (value.match(/,/g) || []).length;
      if (commaCount <= 1) {
        const minusCount = (value.match(/-/g) || []).length;
        if (minusCount <= 1 && value.indexOf('-') <= 0) {
          form.setFieldValue(fieldName, value);
        }
      }
    }
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
        <Form form={form} layout="vertical">
          <div style={{ display: 'flex', alignItems: 'center', width: 'fit-content' }}>
            <Tabs
              value={selectedTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              className="custom-tabs"
              TabIndicatorProps={{ className: 'tab-indicator' }}
            >
              {researchMethods.map((method, index) => (
                <Tab key={method.id} className="custom-tab" label={method.name} />
              ))}
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

          {researchMethods.map((method, index) => (
            <TabPanel key={method.id} value={selectedTab} index={index}>
              {currentMethod && currentMethod.id === method.id && (
                <div className="calculation-form">
                  <Typography variant="h6" gutterBottom>
                    {currentMethod.name}
                  </Typography>

                  <div className="input-fields">
                    {currentMethod.input_data.fields.map((field, fieldIndex) => (
                      <div key={fieldIndex} className="input-field-container">
                        <FormItem
                          title={
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span>{field.name}</span>
                              <Tooltip title={field.description} placement="right">
                                <IconButton size="small">
                                  <HelpOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </div>
                          }
                          name={`${currentMethod.id}_${field.name}`}
                        >
                          <Input
                            placeholder={`Введите значение ${field.name}`}
                            maxLength={10}
                            onChange={e =>
                              handleInputChange(e, `${currentMethod.id}_${field.name}`)
                            }
                            onKeyPress={e => {
                              const pattern = /^[0-9.,\-]$/;
                              if (!pattern.test(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            onPaste={e => {
                              e.preventDefault();
                              const pastedText = e.clipboardData.getData('text');
                              const processedText = pastedText.replace(/,/g, '.');
                              const pattern = /^-?\d*\.?\d*$/;
                              if (pattern.test(processedText)) {
                                form.setFieldValue(
                                  `${currentMethod.id}_${field.name}`,
                                  processedText
                                );
                              }
                            }}
                          />
                        </FormItem>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="primary"
                    buttonColor="#0066cc"
                    title="Рассчитать"
                    onClick={() => handleCalculate(currentMethod.id)}
                    loading={isCalculating}
                    style={{ marginTop: '16px' }}
                  />

                  {calculationResults[currentMethod.id] && (
                    <div className="calculation-results">
                      {calculationResults[currentMethod.id].convergence === 'satisfactory' && (
                        <>
                          <Typography variant="subtitle1" gutterBottom>
                            Промежуточные результаты:
                          </Typography>
                          {Object.entries(
                            calculationResults[currentMethod.id].intermediate_results
                          ).map(([name, value]) => (
                            <div key={name}>
                              {name}: {value}
                            </div>
                          ))}
                        </>
                      )}
                      <Typography variant="h6" style={{ marginTop: '16px' }}>
                        Результат:{' '}
                        {calculationResults[currentMethod.id].convergence === 'satisfactory'
                          ? `${calculationResults[currentMethod.id].result} ± ${calculationResults[currentMethod.id].measurement_error} ${calculationResults[currentMethod.id].unit}`
                          : calculationResults[currentMethod.id].convergence === 'absence'
                            ? 'Отсутствие'
                            : calculationResults[currentMethod.id].convergence === 'traces'
                              ? 'Следы'
                              : 'Неудовлетворительно'}
                      </Typography>
                    </div>
                  )}
                </div>
              )}
            </TabPanel>
          ))}
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
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
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
