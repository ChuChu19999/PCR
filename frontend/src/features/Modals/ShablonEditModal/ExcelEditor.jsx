import React, { useState, useEffect, useRef } from 'react';
import { HotTable } from '@handsontable/react';
import { registerRenderer } from 'handsontable/renderers';
import { textRenderer } from 'handsontable/renderers/textRenderer';
import 'handsontable/dist/handsontable.full.css';
import { read, utils } from 'xlsx';
import axios from 'axios';
import { Button, Tooltip, message } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  DownloadOutlined,
  PlusOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import { Select } from 'antd';
import './ExcelEditor.css';

const { Option } = Select;

// Регистрируем кастомный рендерер до создания компонента
registerRenderer('customTextRenderer', (instance, td, row, col, prop, value, cellProperties) => {
  textRenderer(instance, td, row, col, prop, value, cellProperties);

  // Добавляем базовые стили для всех ячеек
  td.style.padding = '8px';
  td.style.fontSize = '14px';

  // Применяем пользовательские стили, если они есть
  if (instance.getSettings().cellStyles) {
    const cellKey = `${row}-0`;
    const style = instance.getSettings().cellStyles[cellKey];

    if (style) {
      // Если выравнивание не указано явно, используем center
      if (!style.textAlign) {
        td.style.textAlign = 'center';
      }
      Object.assign(td.style, style);
    } else {
      // Если стилей нет, используем выравнивание по центру по умолчанию
      td.style.textAlign = 'center';
    }
  } else {
    // Если нет никаких стилей, используем выравнивание по центру
    td.style.textAlign = 'center';
  }

  return td;
});

const ExcelEditor = React.forwardRef(({ onDataChange, section, templateId }, ref) => {
  const [data, setData] = useState([['']]);
  const [styles, setStyles] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);
  const [cellStyles, setCellStyles] = useState({});
  const [lastSavedTemplateId, setLastSavedTemplateId] = useState(null);
  const hotTableRef = useRef(null);
  const [isDestroyed, setIsDestroyed] = useState(false);

  const COLUMN_HEADERS = ['A'];

  // Эффект для очистки при размонтировании
  useEffect(() => {
    return () => {
      setIsDestroyed(true);
      if (hotTableRef.current?.hotInstance) {
        try {
          const hot = hotTableRef.current.hotInstance;
          hot.destroy();
        } catch (e) {
          console.warn('Ошибка при уничтожении таблицы:', e);
        }
      }
    };
  }, []);

  const updateTableData = newData => {
    if (isDestroyed) return;

    console.log('Обновление данных таблицы:', newData);
    console.log('Текущие стили:', cellStyles);

    // Создаем копию данных для безопасного изменения
    const processedData = [...newData];

    // Ищем индексы меток начала и конца шапки
    let startHeaderIndex = -1;
    let endHeaderIndex = -1;

    processedData.forEach((row, index) => {
      if (row[0] === '{{start_header}}') {
        startHeaderIndex = index;
      }
      if (row[0] === '{{end_header}}') {
        endHeaderIndex = index;
      }
    });

    // Если метки не найдены, используем пустую шапку
    if (startHeaderIndex === -1 || endHeaderIndex === -1 || startHeaderIndex >= endHeaderIndex) {
      console.warn('Метки шапки не найдены или некорректны. Используется пустая шапка.');
      if (!isDestroyed) {
        setData([['']]);
      }
      return;
    }

    // Извлекаем только строки шапки (без самих меток)
    const headerData = processedData.slice(startHeaderIndex + 1, endHeaderIndex);

    // Устанавливаем данные в состояние
    if (!isDestroyed) {
      setData(headerData);
    }

    // Обновляем данные в таблице напрямую, если она инициализирована
    if (hotTableRef.current?.hotInstance && !isDestroyed) {
      try {
        const hot = hotTableRef.current.hotInstance;
        hot.loadData(headerData);
        requestAnimationFrame(() => {
          if (!isDestroyed && hot) {
            hot.render();
          }
        });
      } catch (e) {
        console.error('Ошибка при обновлении таблицы:', e);
      }
    }

    // Передаем данные и стили родительскому компоненту
    if (onDataChange && !isDestroyed) {
      onDataChange(headerData, null, cellStyles);
    }
  };

  useEffect(() => {
    console.log('ExcelEditor useEffect: templateId изменился на', templateId);
    // Загружаем данные только если это новый шаблон и не сразу после сохранения
    if (templateId && templateId !== lastSavedTemplateId) {
      loadExcelData();
    }
    // Сбрасываем lastSavedTemplateId после загрузки
    setLastSavedTemplateId(null);
  }, [templateId]);

  const loadExcelData = async () => {
    if (!templateId) {
      console.log('loadExcelData: templateId отсутствует');
      return;
    }

    // Проверяем, не идет ли уже загрузка
    if (loading) {
      console.log('loadExcelData: загрузка уже идет');
      return;
    }

    console.log('loadExcelData: начало загрузки данных для templateId', templateId);

    try {
      setError(null);
      setLoading(true);

      // Получаем стили из активного шаблона
      const stylesResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/get-excel-styles/`,
        {
          params: {
            template_id: templateId,
            section: section,
          },
        }
      );

      if (stylesResponse.data.error) {
        throw new Error(stylesResponse.data.error);
      }

      console.log('Получены стили:', stylesResponse.data);
      setCellStyles(stylesResponse.data.styles || {});
      setStyles(stylesResponse.data.styles || {});

      // Получаем дополнительную информацию о шаблоне
      console.log('Запрашиваем информацию о шаблоне:', templateId);
      const templateInfoResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/excel-templates/${templateId}/`
      );
      console.log('Информация о шаблоне:', templateInfoResponse.data);

      // Получаем файл для чтения
      const requestParams = {
        download: true,
        section: section,
      };
      console.log('Загрузка файла для templateId:', templateId, 'с параметрами:', requestParams);

      const fileResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/excel-templates/${templateId}/`,
        {
          params: requestParams,
          responseType: 'arraybuffer',
        }
      );

      console.log('Заголовки ответа:', fileResponse.headers);

      // Проверка, что получены данные
      if (!fileResponse.data || fileResponse.data.byteLength === 0) {
        throw new Error('Получен пустой файл с сервера');
      }

      console.log('Размер полученного файла:', fileResponse.data.byteLength, 'байт');

      // Читаем файл Excel
      const workbook = read(fileResponse.data, {
        type: 'array',
        cellFormula: false,
        cellText: true,
      });

      if (!workbook || !workbook.SheetNames || !workbook.SheetNames.length) {
        throw new Error('Не удалось прочитать файл Excel');
      }

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) {
        throw new Error('Не удалось найти лист в файле Excel');
      }

      // Преобразуем Excel в JSON с сохранением пустых ячеек
      const excelData = utils.sheet_to_json(firstSheet, {
        header: 1,
        raw: false,
        defval: '',
        blankrows: true,
      });

      // Ищем метки в данных
      let startHeaderIndex = -1;
      let endHeaderIndex = -1;

      excelData.forEach((row, index) => {
        if (row[0] === '{{start_header}}') {
          startHeaderIndex = index;
        }
        if (row[0] === '{{end_header}}') {
          endHeaderIndex = index;
        }
      });

      if (startHeaderIndex === -1 || endHeaderIndex === -1 || startHeaderIndex >= endHeaderIndex) {
        throw new Error(
          'В файле не найдены метки {{start_header}} и {{end_header}}. Добавьте метки в шаблон для редактирования шапки.'
        );
      }

      // Извлекаем только строки шапки (без самих меток)
      const headerData = excelData.slice(startHeaderIndex + 1, endHeaderIndex);

      console.log('Извлеченные данные из Excel:', headerData);

      // Обновляем данные в таблице
      setData(headerData);

      // Обновляем данные в таблице напрямую, если она инициализирована
      if (hotTableRef.current?.hotInstance) {
        try {
          const hot = hotTableRef.current.hotInstance;
          hot.loadData(headerData);
          setTimeout(() => hot.render(), 100);
        } catch (e) {
          console.error('Ошибка при обновлении таблицы:', e);
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      message.error(error.message || 'Неизвестная ошибка');
      setError(
        error.message ||
          'Не удалось загрузить данные. Пожалуйста, проверьте, что файл существует и доступен.'
      );
      setData([['']]);
    } finally {
      setLoading(false);
    }
  };

  // Функция для получения текущих стилей выбранных ячеек
  const getCurrentCellStyles = () => {
    if (!selectedCell && !selectedRange) return {};

    const hot = hotTableRef.current?.hotInstance;
    if (!hot) return {};

    if (selectedCell) {
      const cellKey = `${selectedCell.row}-0`;
      return cellStyles[cellKey] || {};
    }

    if (selectedRange) {
      const { from, to } = selectedRange;
      const firstCellKey = `${from.row}-0`;
      return cellStyles[firstCellKey] || {};
    }

    return {};
  };

  // Функция для применения стилей к диапазону ячеек
  const applyStylesToRange = newStyle => {
    const updatedStyles = { ...cellStyles };
    const hot = hotTableRef.current?.hotInstance;

    if (!hot) return;

    if (selectedRange) {
      const { from, to } = selectedRange;
      const startRow = Math.min(from.row, to.row);
      const endRow = Math.max(from.row, to.row);

      for (let row = startRow; row <= endRow; row++) {
        const cellKey = `${row}-0`;
        updatedStyles[cellKey] = {
          ...(updatedStyles[cellKey] || {}),
          ...newStyle,
        };
      }
    } else if (selectedCell) {
      const cellKey = `${selectedCell.row}-0`;
      updatedStyles[cellKey] = {
        ...(updatedStyles[cellKey] || {}),
        ...newStyle,
      };
    }

    console.log('Применение новых стилей:', updatedStyles);
    setCellStyles(updatedStyles);

    // Передаем обновленные стили в родительский компонент
    if (onDataChange) {
      onDataChange(data, null, updatedStyles);
    }

    hot.render(); // Принудительно обновляем отображение
  };

  // Функция для применения форматирования
  const applyFormatting = format => {
    console.log('Применение форматирования:', format);
    console.log('Выбранная ячейка:', selectedCell);
    console.log('Выбранный диапазон:', selectedRange);

    const currentStyle = getCurrentCellStyles();
    let newStyle = {};

    switch (format.type) {
      case 'bold':
        newStyle = {
          fontWeight: currentStyle.fontWeight === 'bold' ? 'normal' : 'bold',
        };
        break;
      case 'italic':
        newStyle = {
          fontStyle: currentStyle.fontStyle === 'italic' ? 'normal' : 'italic',
        };
        break;
      case 'fontSize':
        newStyle = {
          fontSize: `${format.size}px`,
        };
        break;
    }

    console.log('Новый стиль для применения:', newStyle);
    applyStylesToRange(newStyle);
  };

  const saveDataWithStyles = async () => {
    try {
      const hot = hotTableRef.current?.hotInstance;
      if (!hot) {
        throw new Error('Таблица не инициализирована');
      }

      const processedData = [['{{start_header}}'], ...data, ['{{end_header}}']];

      const formData = new FormData();
      formData.append('data', JSON.stringify(processedData));
      formData.append('styles', JSON.stringify(cellStyles));
      formData.append('template_id', templateId);
      formData.append('section', section);

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/save-excel/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      // Обновляем templateId на новую версию
      if (response.data.template_id) {
        setLastSavedTemplateId(response.data.template_id);
        if (onDataChange) {
          // Передаем текущие данные без изменений
          onDataChange(data, response.data.template_id, cellStyles);
        }
      }

      message.success('Изменения сохранены');
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      message.error(`Ошибка при сохранении изменений: ${error.message}`);
      throw error;
    }
  };

  const downloadCurrentFile = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/excel-templates/${templateId}/`,
        {
          params: {
            download: true,
            section: section,
          },
          responseType: 'blob',
        }
      );

      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `template_${templateId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success('Файл успешно скачан');
    } catch (error) {
      console.error('Ошибка при скачивании файла:', error);
      message.error('Ошибка при скачивании файла');
    }
  };

  React.useImperativeHandle(ref, () => ({
    loadExcelData,
    saveDataWithStyles: () => saveDataWithStyles(),
  }));

  // Функция для проверки активности стиля
  const isStyleActive = styleType => {
    console.log('Проверка стиля:', styleType);
    console.log('Текущая ячейка:', selectedCell);
    console.log('Текущий диапазон:', selectedRange);

    const currentStyles = getCurrentCellStyles();
    console.log('Текущие стили:', currentStyles);

    switch (styleType) {
      case 'bold':
        return currentStyles.fontWeight === 'bold';
      case 'italic':
        return currentStyles.fontStyle === 'italic';
      case 'fontSize':
        return currentStyles.fontSize ? parseInt(currentStyles.fontSize) : 14;
      default:
        return false;
    }
  };

  if (!templateId) {
    return null;
  }

  if (loading) {
    return <div className="loading-overlay">Загрузка данных...</div>;
  }

  return (
    <div className="excel-editor">
      <div className="toolbar">
        <Tooltip title="Жирный">
          <Button
            icon={<BoldOutlined />}
            onClick={() => applyFormatting({ type: 'bold' })}
            disabled={!selectedCell && !selectedRange}
            className={isStyleActive('bold') ? 'active' : ''}
          />
        </Tooltip>
        <Tooltip title="Курсив">
          <Button
            icon={<ItalicOutlined />}
            onClick={() => applyFormatting({ type: 'italic' })}
            disabled={!selectedCell && !selectedRange}
            className={isStyleActive('italic') ? 'active' : ''}
          />
        </Tooltip>
        <Tooltip title="Размер шрифта">
          <Select
            className="font-size-select"
            onChange={size => applyFormatting({ type: 'fontSize', size })}
            value={isStyleActive('fontSize')}
            disabled={!selectedCell && !selectedRange}
          >
            {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96].map(size => (
              <Option key={size} value={size}>
                {size}px
              </Option>
            ))}
          </Select>
        </Tooltip>
        <div className="toolbar-separator" />
        <Tooltip title="Добавить строку">
          <Button icon={<PlusOutlined />} disabled={true} />
        </Tooltip>
        <Tooltip title="Удалить строку">
          <Button icon={<MinusOutlined />} disabled={true} />
        </Tooltip>
        <div className="toolbar-separator" />
        <Tooltip title="Скачать текущий файл">
          <Button icon={<DownloadOutlined />} onClick={downloadCurrentFile} />
        </Tooltip>
      </div>
      <div className="table-container">
        <HotTable
          ref={hotTableRef}
          data={data}
          rowHeaders={true}
          colHeaders={COLUMN_HEADERS}
          height="auto"
          width="100%"
          licenseKey="non-commercial-and-evaluation"
          stretchH="all"
          mergeCells={false}
          columns={[
            {
              data: '0',
              type: 'text',
              wordWrap: true,
              readOnly: false,
              width: 800,
              renderer: 'customTextRenderer',
            },
          ]}
          afterSelection={(row, column, row2, column2, preventScrolling, selectionLayerLevel) => {
            if (row === row2 && column === column2) {
              setSelectedCell({ row, col: column });
              setSelectedRange(null);
            } else {
              setSelectedRange({
                from: { row, col: column },
                to: { row: row2, col: column2 },
              });
              setSelectedCell(null);
            }
          }}
          afterDeselect={() => {
            // Не очищаем выделение при клике вне таблицы
          }}
          afterLoadData={() => {
            if (isDestroyed) return;
            const hot = hotTableRef.current?.hotInstance;
            if (hot) {
              const formattedData = data.map(row => {
                return typeof row === 'object' ? row : { 0: row[0] || '' };
              });
              hot.loadData(formattedData);
            }
          }}
          afterChange={(changes, source) => {
            if (isDestroyed || !changes || source === 'loadData') return;

            const updatedData = [...data];
            changes.forEach(([row, prop, oldValue, newValue]) => {
              while (updatedData.length <= row) {
                updatedData.push(['']);
              }
              if (!Array.isArray(updatedData[row])) {
                updatedData[row] = [''];
              }
              updatedData[row][0] = newValue;
            });

            setData(updatedData);
            if (onDataChange) {
              onDataChange(updatedData, null, cellStyles);
            }
          }}
          settings={{
            cellStyles: cellStyles,
            outsideClickDeselects: false,
            autoWrapRow: true,
            autoWrapCol: true,
            selectionMode: 'multiple',
          }}
        />
      </div>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
});

export default ExcelEditor;
