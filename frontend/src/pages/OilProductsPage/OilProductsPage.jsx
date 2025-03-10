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

  const renderInputFields = (methodId, parallelIndex = 0) => {
    if (!currentMethod) return null;

    const result = calculationResults[currentMethod.id]?.[parallelIndex];

    return (
      <div
        className="input-fields"
        key={`parallel-${parallelIndex}`}
        style={{
          flex: '1',
          minWidth: '300px',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '20px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
            marginBottom: result ? '20px' : '0',
          }}
        >
          <Typography
            variant="h6"
            style={{
              marginBottom: '15px',
              color: '#2c5282',
              fontSize: '16px',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            {parallelIndex === 0 ? 'Основной расчет' : `Параллель ${parallelIndex}`}
          </Typography>
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
                name={`${currentMethod.id}_${field.name}_${parallelIndex}`}
              >
                <Input
                  placeholder={`Введите значение ${field.name}`}
                  maxLength={10}
                  onChange={e =>
                    handleInputChange(e, `${currentMethod.id}_${field.name}_${parallelIndex}`)
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
                    const processedText = pastedText.replace(/\./g, ',');
                    const pattern = /^-?\d*,?\d*$/;
                    if (pattern.test(processedText)) {
                      form.setFieldValue(
                        `${currentMethod.id}_${field.name}_${parallelIndex}`,
                        processedText
                      );
                    }
                  }}
                />
              </FormItem>
            </div>
          ))}
        </div>

        {result && (
          <div
            className="calculation-results"
            style={{
              border: '1px solid rgba(64, 150, 255, 0.3)',
              padding: '15px 20px',
              borderRadius: '12px',
              background: 'linear-gradient(to right, #f8f9ff, #f0f7ff)',
              boxShadow: '0 4px 12px rgba(64, 150, 255, 0.08)',
            }}
          >
            <Typography
              variant="h6"
              style={{
                color: '#2c5282',
                fontSize: '18px',
                fontWeight: 600,
                marginBottom: '8px',
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

            {result.convergence === 'satisfactory' &&
              Object.keys(result.intermediate_results).length > 0 && (
                <>
                  <Typography
                    variant="h6"
                    style={{
                      color: '#2c5282',
                      fontSize: '16px',
                      fontWeight: 600,
                      marginBottom: '8px',
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid rgba(64, 150, 255, 0.15)',
                    }}
                  >
                    Промежуточные результаты:
                  </Typography>
                  {Object.entries(result.intermediate_results).map(([name, value]) => (
                    <div
                      key={name}
                      style={{
                        color: '#4a5568',
                        margin: '4px 0',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                                  <HelpOutlineIcon style={{ fontSize: '16px', color: '#718096' }} />
                                </IconButton>
                              </Tooltip>
                            )
                        )}
                        :
                      </div>
                      <span style={{ color: '#2d3748', fontWeight: 500, marginLeft: '4px' }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </>
              )}
          </div>
        )}
      </div>
    );
  };

  const handleCalculate = async methodId => {
    try {
      setIsCalculating(true);
      const method = researchMethods.find(m => m.id === methodId);

      if (!method) {
        throw new Error('Метод не найден');
      }

      const methodDetailsResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/research-methods/${methodId}/`
      );

      const methodDetails = methodDetailsResponse.data;
      const parallelCount = methodDetails.parallel_count || 0;
      const parallelResults = [];

      // Вычисляем для каждой параллели
      for (let i = 0; i <= parallelCount; i++) {
        const formValues = form.getFieldsValue();
        const inputData = {};
        let hasEmptyFields = false;
        let hasInvalidValues = false;

        methodDetails.input_data.fields.forEach(field => {
          let value = formValues[`${methodId}_${field.name}_${i}`];

          if (typeof value === 'string') {
            value = value.trim().replace(',', '.');
          }

          if (!value && value !== 0) {
            hasEmptyFields = true;
          } else {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
              hasInvalidValues = true;
            }
            inputData[field.name] = numValue;
          }
        });

        if (hasEmptyFields || hasInvalidValues) {
          throw new Error(`Некорректные данные`);
        }

        const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/calculate/`, {
          input_data: inputData,
          research_method: methodDetails,
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
                  <Typography
                    variant="h6"
                    gutterBottom
                    style={{
                      color: '#2c5282',
                      fontSize: '18px',
                      fontWeight: 600,
                      textAlign: 'center',
                      marginBottom: '20px',
                    }}
                  >
                    {currentMethod.name}
                  </Typography>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: '20px',
                      marginBottom: '20px',
                      justifyContent: 'center',
                    }}
                  >
                    {Array.from({ length: (currentMethod.parallel_count || 0) + 1 }).map((_, i) =>
                      renderInputFields(currentMethod.id, i)
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <Button
                      type="primary"
                      buttonColor="#0066cc"
                      title="Рассчитать"
                      onClick={() => handleCalculate(currentMethod.id)}
                      loading={isCalculating}
                    />
                  </div>
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
