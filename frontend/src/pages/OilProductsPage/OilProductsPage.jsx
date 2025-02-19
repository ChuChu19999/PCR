import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Tab,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import axios from 'axios';
import { Form, Input } from 'antd';
import Layout from '../../shared/ui/Layout/Layout';
import { Button } from '../../shared/ui/Button/Button';
import { FormItem } from '../../features/FormItems';
import OilProductsPageWrapper from './OilProductsPageWrapper';

const TabPanel = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <div className="tab-content">{children}</div>}
    </div>
  );
};

const OilProductsPage = () => {
  const [form] = Form.useForm();
  const [currentTab, setCurrentTab] = useState(0);
  const [waterMassFractionData, setWaterMassFractionData] = useState({
    Vo1: '',
    Vo2: '',
    Vpr1: '',
    Vpr2: '',
    density: '',
    result: null,
    rawResult: null,
  });
  const [paraffinData, setParaffinData] = useState({
    T1: '',
    T2: '',
    result: null,
    rawResult: null,
  });
  const [pourPointData, setPourPointData] = useState({
    T1: '',
    T2: '',
    result: null,
    rawResult: null,
  });
  const [kinematicViscosityData, setKinematicViscosityData] = useState({
    t1: '',
    t2: '',
    C1: '',
    C2: '',
    K: '1,0017',
    result: null,
    rawResult: null,
  });
  const [kinematicViscosity50Data, setKinematicViscosity50Data] = useState({
    t1: '',
    t2: '',
    C1: '',
    C2: '',
    K: '1,0017',
    result: null,
    rawResult: null,
  });
  const [settings, setSettings] = useState({
    decimal_places: 1,
    measurement_error: '0,3',
  });
  const [pourPointSettings, setPourPointSettings] = useState({
    decimal_places: 0,
    measurement_error: '6,0',
  });
  const [waterMassFractionSettings, setWaterMassFractionSettings] = useState({
    decimal_places: 2,
    measurement_error: '0,14',
  });
  const [kinematicViscositySettings, setKinematicViscositySettings] = useState({
    decimal_places: 4,
  });
  const [kinematicViscosity50Settings, setKinematicViscosity50Settings] = useState({
    decimal_places: 4,
  });
  const [sulfurMassFractionSettings, setSulfurMassFractionSettings] = useState({
    decimal_places: 4,
  });
  const [isSettingsChanged, setIsSettingsChanged] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // Добавляем новое состояние для массовой доли серы
  const [sulfurMassFractionData, setSulfurMassFractionData] = useState({
    X1: '',
    X2: '',
    result: null,
    rawResult: null,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Получаем настройки для каждого типа расчета отдельно
        const [
          paraffinResponse,
          pourPointResponse,
          waterMassFractionResponse,
          kinematicViscosity20Response,
          kinematicViscosity50Response,
          sulfurMassFractionResponse,
        ] = await Promise.all([
          axios.get(
            `${import.meta.env.VITE_API_URL}/api/calculation-settings/active/?calculation_type=paraffin_melting_point`
          ),
          axios.get(
            `${import.meta.env.VITE_API_URL}/api/calculation-settings/active/?calculation_type=pour_point`
          ),
          axios.get(
            `${import.meta.env.VITE_API_URL}/api/calculation-settings/active/?calculation_type=water_mass_fraction`
          ),
          axios.get(
            `${import.meta.env.VITE_API_URL}/api/calculation-settings/active/?calculation_type=kinematic_viscosity_20`
          ),
          axios.get(
            `${import.meta.env.VITE_API_URL}/api/calculation-settings/active/?calculation_type=kinematic_viscosity_50`
          ),
          axios.get(
            `${import.meta.env.VITE_API_URL}/api/calculation-settings/active/?calculation_type=sulfur_mass_fraction`
          ),
        ]);

        // Устанавливаем настройки для температуры плавления
        if (paraffinResponse.data) {
          const paraffinDecimalPlaces = paraffinResponse.data.decimal_places ?? 1;
          const paraffinMeasurementError = formatRussianFloat(
            paraffinResponse.data.measurement_error?.toString() ?? '0,3'
          );

          setSettings({
            decimal_places: paraffinDecimalPlaces,
            measurement_error: paraffinMeasurementError,
          });
        }

        // Устанавливаем настройки для температуры застывания
        if (pourPointResponse.data) {
          const pourPointDecimalPlaces = pourPointResponse.data.decimal_places ?? 0;
          const pourPointMeasurementError = formatRussianFloat(
            pourPointResponse.data.measurement_error?.toString() ?? '6,0'
          );

          setPourPointSettings({
            decimal_places: pourPointDecimalPlaces,
            measurement_error: pourPointMeasurementError,
          });
        }

        // Устанавливаем настройки для массовой доли воды
        if (waterMassFractionResponse.data) {
          const waterMassFractionDecimalPlaces = waterMassFractionResponse.data.decimal_places ?? 2;
          const waterMassFractionMeasurementError = formatRussianFloat(
            waterMassFractionResponse.data.measurement_error?.toString() ?? '0,14'
          );

          setWaterMassFractionSettings({
            decimal_places: waterMassFractionDecimalPlaces,
            measurement_error: waterMassFractionMeasurementError,
          });
        }

        // Устанавливаем настройки для кинематической вязкости при 20°C
        if (kinematicViscosity20Response.data) {
          const kinematicViscosity20DecimalPlaces =
            kinematicViscosity20Response.data.decimal_places ?? 4;

          setKinematicViscositySettings({
            decimal_places: parseInt(kinematicViscosity20DecimalPlaces),
          });

          form.setFieldsValue({
            decimal_places_viscosity: parseInt(kinematicViscosity20DecimalPlaces),
          });
        }

        // Устанавливаем настройки для кинематической вязкости при 50°C
        if (kinematicViscosity50Response.data) {
          const kinematicViscosity50DecimalPlaces =
            kinematicViscosity50Response.data.decimal_places ?? 4;

          setKinematicViscosity50Settings({
            decimal_places: parseInt(kinematicViscosity50DecimalPlaces),
          });

          form.setFieldsValue({
            decimal_places_viscosity_50: parseInt(kinematicViscosity50DecimalPlaces),
          });
        }

        // Устанавливаем значение K по умолчанию для обоих расчетов
        setKinematicViscosityData(prev => ({
          ...prev,
          K: '1,0017',
        }));
        setKinematicViscosity50Data(prev => ({
          ...prev,
          K: '1,0017',
        }));

        // Устанавливаем настройки для массовой доли серы
        if (sulfurMassFractionResponse.data) {
          const sulfurDecimalPlaces = sulfurMassFractionResponse.data.decimal_places ?? 4;
          setSulfurMassFractionSettings(prev => ({
            ...prev,
            decimal_places: parseInt(sulfurDecimalPlaces),
          }));
        }

        // Обновляем значения в форме для остальных полей
        form.setFieldsValue({
          decimal_places: paraffinResponse.data?.decimal_places ?? 1,
          measurement_error: formatRussianFloat(
            paraffinResponse.data?.measurement_error?.toString() ?? '0,3'
          ),
          decimal_places_pour: pourPointResponse.data?.decimal_places ?? 0,
          measurement_error_pour: formatRussianFloat(
            pourPointResponse.data?.measurement_error?.toString() ?? '6,0'
          ),
          decimal_places_water: waterMassFractionResponse.data?.decimal_places ?? 2,
          measurement_error_water: formatRussianFloat(
            waterMassFractionResponse.data?.measurement_error?.toString() ?? '0,14'
          ),
          decimal_places_sulfur: sulfurMassFractionResponse.data?.decimal_places ?? 4,
          decimal_places_viscosity: kinematicViscosity20Response.data?.decimal_places ?? 4,
          decimal_places_viscosity_50: kinematicViscosity50Response.data?.decimal_places ?? 4,
          K: '1,0017',
        });
      } catch (error) {
        console.error('Ошибка при загрузке настроек:', error);
        // Устанавливаем настройки по умолчанию
        setSettings({
          decimal_places: 1,
          measurement_error: '0,3',
        });
        setPourPointSettings({
          decimal_places: 0,
          measurement_error: '6,0',
        });
        setWaterMassFractionSettings({
          decimal_places: 2,
          measurement_error: '0,14',
        });
        setKinematicViscositySettings({
          decimal_places: 4,
        });
        setKinematicViscosity50Settings({
          decimal_places: 4,
        });
        setKinematicViscosityData(prev => ({
          ...prev,
          K: '1,0017',
        }));
        setKinematicViscosity50Data(prev => ({
          ...prev,
          K: '1,0017',
        }));
        form.setFieldsValue({
          decimal_places: 1,
          measurement_error: '0,3',
          decimal_places_pour: 0,
          measurement_error_pour: '6,0',
          decimal_places_water: 2,
          measurement_error_water: '0,14',
          decimal_places_sulfur: 4,
          decimal_places_viscosity: 4,
          decimal_places_viscosity_50: 4,
          K: '1,0017',
        });
      }
    };
    fetchSettings();
  }, [form]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const parseRussianFloat = value => {
    if (typeof value !== 'string') return NaN;
    return parseFloat(value.replace(',', '.'));
  };

  const formatRussianFloat = value => {
    if (typeof value !== 'string') return '';
    return value.replace('.', ',');
  };

  const handleSettingsChange =
    (field, calculationType = 'paraffin_melting_point') =>
    event => {
      let value = event.target.value;

      if (field.includes('measurement_error') && !calculationType.includes('kinematic_viscosity')) {
        value = value.replace('.', ',');
        const isValidNumber = /^-?\d*,?\d*$/.test(value);
        if (!isValidNumber && value !== '') return;
      }

      if (field.includes('decimal_places')) {
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < 0 || numValue > 5) return;
      }

      const fieldName = field
        .replace('_pour', '')
        .replace('_water', '')
        .replace('_viscosity', '')
        .replace('_50', '');

      switch (calculationType) {
        case 'water_mass_fraction':
          setWaterMassFractionSettings(prev => ({
            ...prev,
            [fieldName]: value,
          }));
          break;
        case 'pour_point':
          setPourPointSettings(prev => ({
            ...prev,
            [fieldName]: value,
          }));
          break;
        case 'kinematic_viscosity_20':
          setKinematicViscositySettings(prev => ({
            ...prev,
            [fieldName]: parseInt(value),
          }));
          break;
        case 'kinematic_viscosity_50':
          setKinematicViscosity50Settings(prev => ({
            ...prev,
            [fieldName]: parseInt(value),
          }));
          break;
        default:
          setSettings(prev => ({
            ...prev,
            [fieldName]: value,
          }));
      }
      setIsSettingsChanged(true);
    };

  const handleCloseNotification = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotification(prev => ({ ...prev, open: false }));
  };

  const saveSettings = async (calculationType = 'paraffin_melting_point') => {
    try {
      const type = typeof calculationType === 'string' ? calculationType : 'paraffin_melting_point';

      let currentSettings;
      switch (type) {
        case 'water_mass_fraction':
          currentSettings = waterMassFractionSettings;
          break;
        case 'pour_point':
          currentSettings = pourPointSettings;
          break;
        case 'kinematic_viscosity_20':
          currentSettings = kinematicViscositySettings;
          break;
        case 'kinematic_viscosity_50':
          currentSettings = kinematicViscosity50Settings;
          break;
        case 'sulfur_mass_fraction':
          currentSettings = sulfurMassFractionSettings;
          break;
        default:
          currentSettings = settings;
      }

      const dataToSend = {
        calculation_type: type,
        decimal_places: parseInt(currentSettings.decimal_places),
      };

      if (
        !type.includes('kinematic_viscosity') &&
        !type.includes('sulfur_mass_fraction') &&
        currentSettings.measurement_error
      ) {
        const measurementError = parseRussianFloat(currentSettings.measurement_error);
        if (isNaN(measurementError)) {
          setNotification({
            open: true,
            message: 'Введите корректное значение погрешности измерения',
            severity: 'error',
          });
          return;
        }
        dataToSend.measurement_error = measurementError;
      }

      console.log('Отправляемые данные:', dataToSend);

      await axios.post(`${import.meta.env.VITE_API_URL}/api/calculation-settings/`, dataToSend);

      setIsSettingsChanged(false);
      setNotification({
        open: true,
        message: 'Настройки успешно сохранены',
        severity: 'success',
      });
    } catch (error) {
      console.error('Ошибка при сохранении настроек:', error);
      setNotification({
        open: true,
        message: 'Ошибка при сохранении настроек',
        severity: 'error',
      });
    }
  };

  const calculateParaffinMeltingPoint = async () => {
    try {
      // Проверяем, что значения не пустые
      if (!paraffinData.T1 || !paraffinData.T2) {
        setNotification({
          open: true,
          message: 'Введите значения T₁ и T₂',
          severity: 'error',
        });
        return;
      }

      // Заменяем запятую на точку перед отправкой
      const T1 = paraffinData.T1.replace(',', '.');
      const T2 = paraffinData.T2.replace(',', '.');

      const requestData = {
        T1,
        T2,
        decimal_places: settings.decimal_places,
        measurement_error: settings.measurement_error.replace(',', '.'),
      };

      console.log('Отправляемые данные для расчета температуры плавления:', requestData);

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/calculate/paraffin-melting/`,
        requestData
      );

      console.log('Полученный результат для температуры плавления:', response.data);

      setParaffinData(prev => ({
        ...prev,
        result: response.data.result,
        rawResult: response.data.raw_result,
      }));
    } catch (error) {
      console.error(
        'Ошибка при расчете температуры плавления:',
        error.response?.data || error.message
      );
      setNotification({
        open: true,
        message: 'Ошибка при расчете температуры плавления',
        severity: 'error',
      });
    }
  };

  const validateDecimalPlaces = value => {
    if (!value.includes(',')) return true;
    const decimalPart = value.split(',')[1];
    return !decimalPart || decimalPart.length <= settings.decimal_places;
  };

  const handleInputChange = field => event => {
    let value = event.target.value;

    // Разрешаем ввод только цифр, минуса и запятой
    value = value.replace(/[^0-9,-]/g, '');

    // Разрешаем минус только в начале
    if (value.length > 0 && value[0] !== '-') {
      value = value.replace(/-/g, '');
    }

    // Проверяем, что запятая только одна
    const commaCount = (value.match(/,/g) || []).length;
    if (commaCount > 1) {
      value = value.slice(0, value.lastIndexOf(','));
    }

    setParaffinData(prev => ({
      ...prev,
      [field]: value,
      result: null,
    }));
  };

  const handleKeyPress = event => {
    // Разрешаем только цифры, минус и запятую
    if (
      !/[-0-9,]/.test(event.key) &&
      event.key !== 'Backspace' &&
      event.key !== 'Delete' &&
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight'
    ) {
      event.preventDefault();
    }

    // Разрешаем минус только в начале и только если его еще нет
    if (
      event.key === '-' &&
      (event.target.value.includes('-') || event.target.selectionStart !== 0)
    ) {
      event.preventDefault();
    }

    // Если уже есть запятая и пытаемся ввести еще одну - отменяем ввод
    if (event.key === ',' && event.target.value.includes(',')) {
      event.preventDefault();
    }

    // Проверяем количество знаков после запятой
    if (event.target.value.includes(',')) {
      const [, decimalPart] = event.target.value.split(',');
      const maxDecimals = parseInt(settings.decimal_places);

      if (
        decimalPart &&
        decimalPart.length >= maxDecimals &&
        event.key !== 'Backspace' &&
        event.key !== 'Delete' &&
        event.key !== 'ArrowLeft' &&
        event.key !== 'ArrowRight' &&
        event.target.selectionStart > event.target.value.indexOf(',')
      ) {
        event.preventDefault();
      }
    }
  };

  const handlePourPointInputChange = field => event => {
    let value = event.target.value.replace(/[^0-9-]/g, '');

    // Разрешаем минус только в начале
    if (value.length > 0 && value[0] !== '-') {
      value = value.replace(/-/g, '');
    }

    // Ограничиваем длину числа
    if (value.length > 3 && value[0] !== '-') {
      value = value.slice(0, 3);
    } else if (value.length > 4 && value[0] === '-') {
      value = value.slice(0, 4);
    }

    setPourPointData(prev => ({
      ...prev,
      [field]: value,
      result: null,
    }));
  };

  const handlePourPointKeyPress = event => {
    // Разрешаем только цифры и минус
    if (
      !/[-0-9,]/.test(event.key) &&
      event.key !== 'Backspace' &&
      event.key !== 'Delete' &&
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight'
    ) {
      event.preventDefault();
    }

    // Разрешаем минус только в начале и только если его еще нет
    if (
      event.key === '-' &&
      (event.target.value.includes('-') || event.target.selectionStart !== 0)
    ) {
      event.preventDefault();
    }

    // Запрещаем запятую, если decimal_places равно 0 или если запятая уже есть
    if (
      event.key === ',' &&
      (parseInt(pourPointSettings.decimal_places) === 0 || event.target.value.includes(','))
    ) {
      event.preventDefault();
    }
  };

  const calculatePourPoint = async () => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/calculate/pour-point/`,
        {
          T1: pourPointData.T1,
          T2: pourPointData.T2,
          decimal_places: pourPointSettings.decimal_places,
          measurement_error: pourPointSettings.measurement_error,
        }
      );

      setPourPointData(prev => ({
        ...prev,
        result: response.data.result,
        rawResult: response.data.raw_result,
      }));
    } catch (error) {
      setNotification({
        open: true,
        message: 'Ошибка при расчете температуры застывания',
        severity: 'error',
      });
    }
  };

  const handleWaterMassFractionInputChange = field => event => {
    let value = event.target.value.replace(/[^0-9-]/g, '');

    // Разрешаем минус только в начале
    if (value.length > 0 && value[0] !== '-') {
      value = value.replace(/-/g, '');
    }

    // Проверяем, что запятая только одна
    const commaCount = (value.match(/,/g) || []).length;
    if (commaCount > 1) {
      value = value.slice(0, value.lastIndexOf(','));
    }

    // Проверяем количество знаков после запятой для V₀₁ и V₀₂
    if (value.includes(',') && field.startsWith('Vo')) {
      const [integerPart, decimalPart] = value.split(',');
      const maxDecimals = parseInt(waterMassFractionSettings.decimal_places);

      if (decimalPart) {
        if (decimalPart.length > maxDecimals) {
          value = `${integerPart},${decimalPart.substring(0, maxDecimals)}`;
        }
      }
    }

    setWaterMassFractionData(prev => ({
      ...prev,
      [field]: value,
      result: null,
    }));
  };

  const handleWaterMassFractionKeyPress = field => event => {
    // Разрешаем только цифры и минус
    if (
      !/[-0-9,]/.test(event.key) &&
      event.key !== 'Backspace' &&
      event.key !== 'Delete' &&
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight'
    ) {
      event.preventDefault();
    }

    // Разрешаем минус только в начале и только если его еще нет
    if (
      event.key === '-' &&
      (event.target.value.includes('-') || event.target.selectionStart !== 0)
    ) {
      event.preventDefault();
    }

    // Если уже есть запятая и пытаемся ввести еще одну - отменяем ввод
    if (event.key === ',' && event.target.value.includes(',')) {
      event.preventDefault();
    }

    // Проверяем количество знаков после запятой для V₀₁ и V₀₂
    if (event.target.value.includes(',') && field.startsWith('Vo')) {
      const [, decimalPart] = event.target.value.split(',');
      const maxDecimals = parseInt(waterMassFractionSettings.decimal_places);

      if (
        decimalPart &&
        decimalPart.length >= maxDecimals &&
        event.key !== 'Backspace' &&
        event.key !== 'Delete' &&
        event.key !== 'ArrowLeft' &&
        event.key !== 'ArrowRight'
      ) {
        event.preventDefault();
      }
    }
  };

  const calculateWaterMassFraction = async () => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/calculate/water-mass-fraction/`,
        {
          Vo1: waterMassFractionData.Vo1,
          Vo2: waterMassFractionData.Vo2,
          Vpr1: waterMassFractionData.Vpr1,
          Vpr2: waterMassFractionData.Vpr2,
          density: waterMassFractionData.density,
          decimal_places: waterMassFractionSettings.decimal_places,
          measurement_error: waterMassFractionSettings.measurement_error,
        }
      );

      setWaterMassFractionData(prev => ({
        ...prev,
        result: response.data.result,
        rawResult: response.data.raw_result,
      }));
    } catch (error) {
      setNotification({
        open: true,
        message: 'Ошибка при расчете массовой доли воды',
        severity: 'error',
      });
    }
  };

  const handleKinematicViscosityInputChange = field => event => {
    let value = event.target.value;

    // Разрешаем ввод только цифр, минуса и запятой
    value = value.replace(/[^0-9,-]/g, '');

    // Разрешаем минус только в начале
    if (value.length > 0 && value[0] !== '-') {
      value = value.replace(/-/g, '');
    }

    // Проверяем, что запятая только одна
    const commaCount = (value.match(/,/g) || []).length;
    if (commaCount > 1) {
      value = value.slice(0, value.lastIndexOf(','));
    }

    setKinematicViscosityData(prev => ({
      ...prev,
      [field]: value,
      result: null,
    }));
  };

  const handleKinematicViscosityKeyPress = event => {
    // Разрешаем только цифры и минус
    if (
      !/[-0-9,]/.test(event.key) &&
      event.key !== 'Backspace' &&
      event.key !== 'Delete' &&
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight'
    ) {
      event.preventDefault();
    }

    // Разрешаем минус только в начале и только если его еще нет
    if (
      event.key === '-' &&
      (event.target.value.includes('-') || event.target.selectionStart !== 0)
    ) {
      event.preventDefault();
    }

    // Если уже есть запятая и пытаемся ввести еще одну - отменяем ввод
    if (event.key === ',' && event.target.value.includes(',')) {
      event.preventDefault();
    }

    // Проверяем количество знаков после запятой
    if (event.target.value.includes(',') && event.target.name === 'measurement_error') {
      const [, decimalPart] = event.target.value.split(',');
      const maxDecimals = parseInt(kinematicViscositySettings.decimal_places);

      if (
        decimalPart &&
        decimalPart.length >= maxDecimals &&
        event.key !== 'Backspace' &&
        event.key !== 'Delete' &&
        event.key !== 'ArrowLeft' &&
        event.key !== 'ArrowRight'
      ) {
        event.preventDefault();
      }
    }
  };

  const calculateKinematicViscosity = async () => {
    try {
      // Проверяем, что все необходимые значения введены
      if (
        !kinematicViscosityData.t1 ||
        !kinematicViscosityData.t2 ||
        !kinematicViscosityData.C1 ||
        !kinematicViscosityData.C2 ||
        !kinematicViscosityData.K
      ) {
        setNotification({
          open: true,
          message: 'Пожалуйста, заполните все поля',
          severity: 'error',
        });
        return;
      }

      const requestData = {
        t1: kinematicViscosityData.t1.replace(',', '.'),
        t2: kinematicViscosityData.t2.replace(',', '.'),
        C1: kinematicViscosityData.C1.replace(',', '.'),
        C2: kinematicViscosityData.C2.replace(',', '.'),
        K: kinematicViscosityData.K.replace(',', '.'),
        decimal_places: kinematicViscositySettings.decimal_places,
      };

      console.log('Отправляемые данные для расчета вязкости при 20°C:', requestData);

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/calculate/kinematic-viscosity/`,
        requestData
      );

      console.log('Полученный результат для вязкости при 20°C:', response.data);

      setKinematicViscosityData(prev => ({
        ...prev,
        result: response.data.result,
        rawResult: response.data.raw_result,
      }));
    } catch (error) {
      console.error('Ошибка при расчете вязкости при 20°C:', error);
      setNotification({
        open: true,
        message: 'Ошибка при расчете кинематической вязкости',
        severity: 'error',
      });
    }
  };

  const calculateKinematicViscosity50 = async () => {
    try {
      // Проверяем, что все необходимые значения введены
      if (
        !kinematicViscosity50Data.t1 ||
        !kinematicViscosity50Data.t2 ||
        !kinematicViscosity50Data.C1 ||
        !kinematicViscosity50Data.C2 ||
        !kinematicViscosity50Data.K
      ) {
        setNotification({
          open: true,
          message: 'Пожалуйста, заполните все поля',
          severity: 'error',
        });
        return;
      }

      const requestData = {
        t1: kinematicViscosity50Data.t1.replace(',', '.'),
        t2: kinematicViscosity50Data.t2.replace(',', '.'),
        C1: kinematicViscosity50Data.C1.replace(',', '.'),
        C2: kinematicViscosity50Data.C2.replace(',', '.'),
        K: kinematicViscosity50Data.K.replace(',', '.'),
        decimal_places: kinematicViscosity50Settings.decimal_places,
      };

      console.log('Отправляемые данные для расчета вязкости при 50°C:', requestData);

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/calculate/kinematic-viscosity-50/`,
        requestData
      );

      console.log('Полученный результат для вязкости при 50°C:', response.data);

      setKinematicViscosity50Data(prev => ({
        ...prev,
        result: response.data.result,
        rawResult: response.data.raw_result,
      }));
    } catch (error) {
      console.error('Ошибка при расчете вязкости при 50°C:', error);
      setNotification({
        open: true,
        message: 'Ошибка при расчете кинематической вязкости при 50°C',
        severity: 'error',
      });
    }
  };

  const handleKinematicViscosity50InputChange = field => event => {
    let value = event.target.value;

    // Разрешаем ввод только цифр, минуса и запятой
    value = value.replace(/[^0-9,-]/g, '');

    // Разрешаем минус только в начале
    if (value.length > 0 && value[0] !== '-') {
      value = value.replace(/-/g, '');
    }

    // Проверяем, что запятая только одна
    const commaCount = (value.match(/,/g) || []).length;
    if (commaCount > 1) {
      value = value.slice(0, value.lastIndexOf(','));
    }

    setKinematicViscosity50Data(prev => ({
      ...prev,
      [field]: value,
      result: null,
    }));
  };

  const handleKinematicViscosity50KeyPress = event => {
    // Разрешаем только цифры и минус
    if (
      !/[-0-9,]/.test(event.key) &&
      event.key !== 'Backspace' &&
      event.key !== 'Delete' &&
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight'
    ) {
      event.preventDefault();
    }

    // Разрешаем минус только в начале и только если его еще нет
    if (
      event.key === '-' &&
      (event.target.value.includes('-') || event.target.selectionStart !== 0)
    ) {
      event.preventDefault();
    }

    if (event.key === ',' && event.target.value.includes(',')) {
      event.preventDefault();
    }

    if (event.target.value.includes(',') && event.target.name === 'measurement_error') {
      const [, decimalPart] = event.target.value.split(',');
      const maxDecimals = parseInt(kinematicViscosity50Settings.decimal_places);

      if (
        decimalPart &&
        decimalPart.length >= maxDecimals &&
        event.key !== 'Backspace' &&
        event.key !== 'Delete' &&
        event.key !== 'ArrowLeft' &&
        event.key !== 'ArrowRight'
      ) {
        event.preventDefault();
      }
    }
  };

  const handleSulfurKeyPress = event => {
    // Разрешаем только цифры и минус
    if (
      !/[-0-9,]/.test(event.key) &&
      event.key !== 'Backspace' &&
      event.key !== 'Delete' &&
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight'
    ) {
      event.preventDefault();
    }

    // Разрешаем минус только в начале и только если его еще нет
    if (
      event.key === '-' &&
      (event.target.value.includes('-') || event.target.selectionStart !== 0)
    ) {
      event.preventDefault();
    }

    // Если уже есть запятая и пытаемся ввести еще одну - отменяем ввод
    if (event.key === ',' && event.target.value.includes(',')) {
      event.preventDefault();
    }
  };

  const handleSulfurInputChange = field => event => {
    let value = event.target.value;

    // Разрешаем ввод только цифр, минуса и запятой
    value = value.replace(/[^0-9,-]/g, '');

    // Разрешаем минус только в начале
    if (value.length > 0 && value[0] !== '-') {
      value = value.replace(/-/g, '');
    }

    // Проверяем, что запятая только одна
    const commaCount = (value.match(/,/g) || []).length;
    if (commaCount > 1) {
      value = value.slice(0, value.lastIndexOf(','));
    }

    setSulfurMassFractionData(prev => ({
      ...prev,
      [field]: value,
      result: null,
    }));
  };

  const calculateSulfurMassFraction = async () => {
    try {
      console.log('Входные данные для расчета массовой доли серы:', {
        X1: sulfurMassFractionData.X1,
        X2: sulfurMassFractionData.X2,
        decimal_places: sulfurMassFractionSettings.decimal_places,
      });

      // Проверяем, что значения не пустые
      if (!sulfurMassFractionData.X1 || !sulfurMassFractionData.X2) {
        setNotification({
          open: true,
          message: 'Введите значения X₁ и X₂',
          severity: 'error',
        });
        return;
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/calculate/sulfur-mass-fraction/`,
        {
          X1: sulfurMassFractionData.X1.replace(',', '.'),
          X2: sulfurMassFractionData.X2.replace(',', '.'),
          decimal_places: sulfurMassFractionSettings.decimal_places,
        }
      );

      console.log('Результат расчета массовой доли серы:', response.data);

      setSulfurMassFractionData(prev => ({
        ...prev,
        result: response.data.result,
        rawResult: response.data.raw_result,
      }));
    } catch (error) {
      console.error(
        'Ошибка при расчете массовой доли серы:',
        error.response?.data || error.message
      );
      setNotification({
        open: true,
        message: 'Ошибка при расчете массовой доли серы',
        severity: 'error',
      });
    }
  };

  return (
    <OilProductsPageWrapper>
      <Layout title="Нефтепродукты">
        <Form form={form} layout="vertical">
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            className="custom-tabs"
            TabIndicatorProps={{ className: 'tab-indicator' }}
          >
            <Tab className="custom-tab" label="Массовая доля воды" />
            <Tab className="custom-tab" label="Температура застывания" />
            <Tab className="custom-tab" label="Вязкость кинематическая при 20°C" />
            <Tab className="custom-tab" label="Вязкость кинематическая при 50°C" />
            <Tab className="custom-tab" label="Температура плавления" />
            <Tab className="custom-tab" label="Массовая концентрация хлористых солей" />
            <Tab className="custom-tab" label="Массовая доля серы" />
          </Tabs>

          <TabPanel value={currentTab} index={0}>
            <div className="calculation-form">
              <Typography variant="h6" gutterBottom>
                Расчет массовой доли воды
              </Typography>

              <Accordion className="settings-accordion">
                <AccordionSummary expandIcon={<ExpandMoreIcon />} className="settings-summary">
                  <Typography>Настройки расчета</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <div className="settings-content">
                    <Form.Item label="Количество знаков после запятой" name="decimal_places_water">
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        placeholder="От 0 до 5 знаков"
                        onChange={e =>
                          handleSettingsChange('decimal_places_water', 'water_mass_fraction')(e)
                        }
                      />
                    </Form.Item>

                    <Form.Item label="Погрешность измерения (±%)" name="measurement_error_water">
                      <Input
                        placeholder="Используйте запятую в качестве разделителя"
                        onChange={e =>
                          handleSettingsChange('measurement_error_water', 'water_mass_fraction')(e)
                        }
                      />
                    </Form.Item>

                    {isSettingsChanged && (
                      <Button
                        type="primary"
                        buttonColor="#4caf50"
                        title="Сохранить настройки"
                        onClick={() => saveSettings('water_mass_fraction')}
                      />
                    )}
                  </div>
                </AccordionDetails>
              </Accordion>

              <FormItem title="V₀₁ (см³)" name="Vo1">
                <Input
                  value={waterMassFractionData.Vo1}
                  onChange={handleWaterMassFractionInputChange('Vo1')}
                  onKeyPress={handleWaterMassFractionKeyPress('Vo1')}
                  placeholder="Введите значение V₀₁"
                  maxLength={10}
                  lang="en"
                  inputMode="decimal"
                />
              </FormItem>

              <FormItem title="V₀₂ (см³)" name="Vo2">
                <Input
                  value={waterMassFractionData.Vo2}
                  onChange={handleWaterMassFractionInputChange('Vo2')}
                  onKeyPress={handleWaterMassFractionKeyPress('Vo2')}
                  placeholder="Введите значение V₀₂"
                  maxLength={10}
                  lang="en"
                  inputMode="decimal"
                />
              </FormItem>

              <FormItem title="Vпр₁ (см³)" name="Vpr1">
                <Input
                  value={waterMassFractionData.Vpr1}
                  onChange={handleWaterMassFractionInputChange('Vpr1')}
                  onKeyPress={handleWaterMassFractionKeyPress('Vpr1')}
                  placeholder="Введите значение Vпр₁"
                  maxLength={10}
                  lang="en"
                  inputMode="decimal"
                />
              </FormItem>

              <FormItem title="Vпр₂ (см³)" name="Vpr2">
                <Input
                  value={waterMassFractionData.Vpr2}
                  onChange={handleWaterMassFractionInputChange('Vpr2')}
                  onKeyPress={handleWaterMassFractionKeyPress('Vpr2')}
                  placeholder="Введите значение Vпр₂"
                  maxLength={10}
                  lang="en"
                  inputMode="decimal"
                />
              </FormItem>

              <FormItem title="ρпр (г/см³)" name="density">
                <Input
                  value={waterMassFractionData.density}
                  onChange={handleWaterMassFractionInputChange('density')}
                  onKeyPress={handleWaterMassFractionKeyPress('density')}
                  placeholder="Введите значение ρпр"
                  maxLength={10}
                  lang="en"
                  inputMode="decimal"
                />
              </FormItem>

              <Button
                type="primary"
                buttonColor="#0066cc"
                title="Рассчитать"
                onClick={calculateWaterMassFraction}
              />

              {waterMassFractionData.result && (
                <div
                  className={`calculation-result ${
                    waterMassFractionData.result === 'Неудовлетворительно' ? 'error' : 'success'
                  }`}
                >
                  <Typography variant="h6">Результат: {waterMassFractionData.result}</Typography>
                </div>
              )}
            </div>
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <div className="calculation-form">
              <Typography variant="h6" gutterBottom>
                Расчет температуры застывания
              </Typography>

              <Accordion className="settings-accordion">
                <AccordionSummary expandIcon={<ExpandMoreIcon />} className="settings-summary">
                  <Typography>Настройки расчета</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <div className="settings-content">
                    <Form.Item label="Количество знаков после запятой" name="decimal_places_pour">
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        placeholder="От 0 до 5 знаков"
                        onChange={e => handleSettingsChange('decimal_places_pour', 'pour_point')(e)}
                      />
                    </Form.Item>

                    <Form.Item label="Погрешность измерения (±°C)" name="measurement_error_pour">
                      <Input
                        placeholder="Используйте запятую в качестве разделителя"
                        onChange={e =>
                          handleSettingsChange('measurement_error_pour', 'pour_point')(e)
                        }
                      />
                    </Form.Item>

                    {isSettingsChanged && (
                      <Button
                        type="primary"
                        buttonColor="#4caf50"
                        title="Сохранить настройки"
                        onClick={() => saveSettings('pour_point')}
                      />
                    )}
                  </div>
                </AccordionDetails>
              </Accordion>

              <FormItem title="T₁ (°C)" name="T1_pour">
                <Input
                  value={pourPointData.T1}
                  onChange={handlePourPointInputChange('T1')}
                  onKeyPress={handlePourPointKeyPress}
                  placeholder="Введите значение T₁"
                  maxLength={10}
                  lang="en"
                  inputMode="numeric"
                />
              </FormItem>

              <FormItem title="T₂ (°C)" name="T2_pour">
                <Input
                  value={pourPointData.T2}
                  onChange={handlePourPointInputChange('T2')}
                  onKeyPress={handlePourPointKeyPress}
                  placeholder="Введите значение T₂"
                  maxLength={10}
                  lang="en"
                  inputMode="numeric"
                />
              </FormItem>

              <Button
                type="primary"
                buttonColor="#0066cc"
                title="Рассчитать"
                onClick={calculatePourPoint}
              />

              {pourPointData.result && (
                <div
                  className={`calculation-result ${pourPointData.result === 'Неудовлетворительно' ? 'error' : 'success'}`}
                >
                  <Typography variant="h6">Результат: {pourPointData.result}</Typography>
                </div>
              )}
            </div>
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            <div className="calculation-form">
              <Typography variant="h6" gutterBottom>
                Расчет кинематической вязкости при 20°C
              </Typography>

              <Accordion className="settings-accordion">
                <AccordionSummary expandIcon={<ExpandMoreIcon />} className="settings-summary">
                  <Typography>Настройки расчета</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <div className="settings-content">
                    <Form.Item label="Количество значащих знаков" name="decimal_places_viscosity">
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        placeholder="От 0 до 5 знаков"
                        onChange={e =>
                          handleSettingsChange(
                            'decimal_places_viscosity',
                            'kinematic_viscosity_20'
                          )(e)
                        }
                      />
                    </Form.Item>

                    {isSettingsChanged && (
                      <Button
                        type="primary"
                        buttonColor="#4caf50"
                        title="Сохранить настройки"
                        onClick={() => saveSettings('kinematic_viscosity_20')}
                      />
                    )}
                  </div>
                </AccordionDetails>
              </Accordion>

              <FormItem title="t₁ (с)" name="t1">
                <Input
                  value={kinematicViscosityData.t1}
                  onChange={handleKinematicViscosityInputChange('t1')}
                  onKeyPress={handleKinematicViscosityKeyPress}
                  placeholder="Введите значение t₁"
                  maxLength={10}
                  lang="en"
                  inputMode="decimal"
                />
              </FormItem>

              <FormItem title="t₂ (с)" name="t2">
                <Input
                  value={kinematicViscosityData.t2}
                  onChange={handleKinematicViscosityInputChange('t2')}
                  onKeyPress={handleKinematicViscosityKeyPress}
                  placeholder="Введите значение t₂"
                  maxLength={10}
                  lang="en"
                  inputMode="decimal"
                />
              </FormItem>

              <FormItem title="C₁ (мм²/с)" name="C1">
                <Input
                  value={kinematicViscosityData.C1}
                  onChange={handleKinematicViscosityInputChange('C1')}
                  onKeyPress={handleKinematicViscosityKeyPress}
                  placeholder="Введите значение C₁"
                  maxLength={10}
                  lang="en"
                  inputMode="decimal"
                />
              </FormItem>

              <FormItem title="C₂ (мм²/с)" name="C2">
                <Input
                  value={kinematicViscosityData.C2}
                  onChange={handleKinematicViscosityInputChange('C2')}
                  onKeyPress={handleKinematicViscosityKeyPress}
                  placeholder="Введите значение C₂"
                  maxLength={10}
                  lang="en"
                  inputMode="decimal"
                />
              </FormItem>

              <FormItem title="K" name="K">
                <Input
                  value={kinematicViscosityData.K}
                  onChange={handleKinematicViscosityInputChange('K')}
                  onKeyPress={handleKinematicViscosityKeyPress}
                  placeholder="Введите значение K"
                  maxLength={10}
                  lang="en"
                  inputMode="decimal"
                  defaultValue="1,0017"
                />
              </FormItem>

              <Button
                type="primary"
                buttonColor="#0066cc"
                title="Рассчитать"
                onClick={calculateKinematicViscosity}
              />

              {kinematicViscosityData.result && (
                <div
                  className={`calculation-result ${
                    kinematicViscosityData.result === 'Неудовлетворительно' ? 'error' : 'success'
                  }`}
                >
                  <Typography variant="h6">Результат: {kinematicViscosityData.result}</Typography>
                </div>
              )}
            </div>
          </TabPanel>

          <TabPanel value={currentTab} index={3}>
            <div className="calculation-form">
              <Typography variant="h6" gutterBottom>
                Расчет кинематической вязкости при 50°C
              </Typography>

              <Accordion className="settings-accordion">
                <AccordionSummary expandIcon={<ExpandMoreIcon />} className="settings-summary">
                  <Typography>Настройки расчета</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <div className="settings-content">
                    <Form.Item
                      label="Количество значащих знаков"
                      name="decimal_places_viscosity_50"
                    >
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        placeholder="От 0 до 5 знаков"
                        onChange={e =>
                          handleSettingsChange(
                            'decimal_places_viscosity_50',
                            'kinematic_viscosity_50'
                          )(e)
                        }
                      />
                    </Form.Item>

                    {isSettingsChanged && (
                      <Button
                        type="primary"
                        buttonColor="#4caf50"
                        title="Сохранить настройки"
                        onClick={() => saveSettings('kinematic_viscosity_50')}
                      />
                    )}
                  </div>
                </AccordionDetails>
              </Accordion>

              <FormItem title="t₁ (с)" name="t1_50">
                <Input
                  value={kinematicViscosity50Data.t1}
                  onChange={handleKinematicViscosity50InputChange('t1')}
                  onKeyPress={handleKinematicViscosity50KeyPress}
                  placeholder="Введите значение t₁"
                  maxLength={10}
                  lang="en"
                  inputMode="decimal"
                />
              </FormItem>

              <FormItem title="t₂ (с)" name="t2_50">
                <Input
                  value={kinematicViscosity50Data.t2}
                  onChange={handleKinematicViscosity50InputChange('t2')}
                  onKeyPress={handleKinematicViscosity50KeyPress}
                  placeholder="Введите значение t₂"
                  maxLength={10}
                  lang="en"
                  inputMode="decimal"
                />
              </FormItem>

              <FormItem title="C₁ (мм²/с)" name="C1_50">
                <Input
                  value={kinematicViscosity50Data.C1}
                  onChange={handleKinematicViscosity50InputChange('C1')}
                  onKeyPress={handleKinematicViscosity50KeyPress}
                  placeholder="Введите значение C₁"
                  maxLength={10}
                  lang="en"
                  inputMode="decimal"
                />
              </FormItem>

              <FormItem title="C₂ (мм²/с)" name="C2_50">
                <Input
                  value={kinematicViscosity50Data.C2}
                  onChange={handleKinematicViscosity50InputChange('C2')}
                  onKeyPress={handleKinematicViscosity50KeyPress}
                  placeholder="Введите значение C₂"
                  maxLength={10}
                  lang="en"
                  inputMode="decimal"
                />
              </FormItem>

              <FormItem title="K" name="K_50">
                <Input
                  value={kinematicViscosity50Data.K}
                  onChange={handleKinematicViscosity50InputChange('K')}
                  onKeyPress={handleKinematicViscosity50KeyPress}
                  placeholder="Введите значение K"
                  maxLength={10}
                  lang="en"
                  inputMode="decimal"
                  defaultValue="1,0017"
                />
              </FormItem>

              <Button
                type="primary"
                buttonColor="#0066cc"
                title="Рассчитать"
                onClick={calculateKinematicViscosity50}
              />

              {kinematicViscosity50Data.result && (
                <div
                  className={`calculation-result ${
                    kinematicViscosity50Data.result === 'Неудовлетворительно' ? 'error' : 'success'
                  }`}
                >
                  <Typography variant="h6">Результат: {kinematicViscosity50Data.result}</Typography>
                </div>
              )}
            </div>
          </TabPanel>

          <TabPanel value={currentTab} index={4}>
            <div className="calculation-form">
              <Typography variant="h6" gutterBottom>
                Расчет температуры плавления
              </Typography>

              <Accordion className="settings-accordion">
                <AccordionSummary expandIcon={<ExpandMoreIcon />} className="settings-summary">
                  <Typography>Настройки расчета</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <div className="settings-content">
                    <Form.Item label="Количество знаков после запятой" name="decimal_places">
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        placeholder="От 0 до 5 знаков"
                        onChange={e => handleSettingsChange('decimal_places')(e)}
                      />
                    </Form.Item>

                    <Form.Item label="Погрешность измерения (±°C)" name="measurement_error">
                      <Input
                        placeholder="Используйте запятую в качестве разделителя"
                        onChange={e => handleSettingsChange('measurement_error')(e)}
                      />
                    </Form.Item>

                    {isSettingsChanged && (
                      <Button
                        type="primary"
                        buttonColor="#4caf50"
                        title="Сохранить настройки"
                        onClick={() => saveSettings('paraffin_melting_point')}
                      />
                    )}
                  </div>
                </AccordionDetails>
              </Accordion>

              <FormItem title="T₁ (°C)" name="T1">
                <Input
                  value={paraffinData.T1}
                  onChange={handleInputChange('T1')}
                  onKeyPress={handleKeyPress}
                  placeholder="Введите значение T₁"
                  maxLength={10}
                  lang="en"
                  inputMode="decimal"
                />
              </FormItem>

              <FormItem title="T₂ (°C)" name="T2">
                <Input
                  value={paraffinData.T2}
                  onChange={handleInputChange('T2')}
                  onKeyPress={handleKeyPress}
                  placeholder="Введите значение T₂"
                  maxLength={10}
                  lang="en"
                  inputMode="decimal"
                />
              </FormItem>

              <Button
                type="primary"
                buttonColor="#0066cc"
                title="Рассчитать"
                onClick={calculateParaffinMeltingPoint}
              />

              {paraffinData.result && (
                <div
                  className={`calculation-result ${paraffinData.result === 'Неудовлетворительно' ? 'error' : 'success'}`}
                >
                  <Typography variant="h6">Результат: {paraffinData.result}</Typography>
                </div>
              )}
            </div>
          </TabPanel>

          <TabPanel value={currentTab} index={5}>
            <div className="development-message">Раздел в разработке</div>
          </TabPanel>

          <TabPanel value={currentTab} index={6}>
            <div className="calculation-form">
              <Typography variant="h6" gutterBottom>
                Расчет массовой доли серы
              </Typography>

              <Accordion className="settings-accordion">
                <AccordionSummary expandIcon={<ExpandMoreIcon />} className="settings-summary">
                  <Typography>Настройки расчета</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <div className="settings-content">
                    <Form.Item label="Количество значащих знаков" name="decimal_places_sulfur">
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        value={sulfurMassFractionSettings.decimal_places}
                        placeholder="От 0 до 5 знаков"
                        onChange={e => {
                          const value = parseInt(e.target.value);
                          if (value >= 0 && value <= 5) {
                            setSulfurMassFractionSettings(prev => ({
                              ...prev,
                              decimal_places: value,
                            }));
                            setIsSettingsChanged(true);
                          }
                        }}
                      />
                    </Form.Item>

                    {isSettingsChanged && (
                      <Button
                        type="primary"
                        buttonColor="#4caf50"
                        title="Сохранить настройки"
                        onClick={() => saveSettings('sulfur_mass_fraction')}
                      />
                    )}
                  </div>
                </AccordionDetails>
              </Accordion>

              <FormItem title="X₁" name="X1">
                <Input
                  value={sulfurMassFractionData.X1}
                  onChange={handleSulfurInputChange('X1')}
                  onKeyPress={handleSulfurKeyPress}
                  placeholder="Введите значение X₁"
                  maxLength={10}
                  lang="en"
                  inputMode="decimal"
                />
              </FormItem>

              <FormItem title="X₂" name="X2">
                <Input
                  value={sulfurMassFractionData.X2}
                  onChange={handleSulfurInputChange('X2')}
                  onKeyPress={handleSulfurKeyPress}
                  placeholder="Введите значение X₂"
                  maxLength={10}
                  lang="en"
                  inputMode="decimal"
                />
              </FormItem>

              <Button
                type="primary"
                buttonColor="#0066cc"
                title="Рассчитать"
                onClick={calculateSulfurMassFraction}
              />

              {sulfurMassFractionData.result && (
                <div
                  className={`calculation-result ${
                    sulfurMassFractionData.result === 'Неудовлетворительно' ? 'error' : 'success'
                  }`}
                >
                  <Typography variant="h6">Результат: {sulfurMassFractionData.result}</Typography>
                </div>
              )}
            </div>
          </TabPanel>
        </Form>

        <Snackbar
          open={notification.open}
          autoHideDuration={3000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            onClose={handleCloseNotification}
            severity={notification.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Layout>
    </OilProductsPageWrapper>
  );
};

export default OilProductsPage;
