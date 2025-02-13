import React, { useState, useEffect, useRef } from 'react';
import { HotTable } from '@handsontable/react';
import { registerRenderer, getRenderer } from 'handsontable/renderers';
import 'handsontable/dist/handsontable.full.css';
import { read, utils } from 'xlsx';
import axios from 'axios';
import { Button, Tooltip } from 'antd';
import { BoldOutlined, ItalicOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import './ExcelEditor.css';

const { Option } = Select;

const ExcelEditor = React.forwardRef(({ onDataChange, section }, ref) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);
  const [cellStyles, setCellStyles] = useState({});
  const hotTableRef = useRef(null);

  const COLUMN_HEADERS = ['A'];

  useEffect(() => {
    const baseRenderer = getRenderer('text');
    console.log('Регистрация кастомного рендерера');

    registerRenderer(
      'customTextRenderer',
      function (instance, td, row, col, prop, value, cellProperties) {
        baseRenderer.apply(this, [instance, td, row, col, prop, value, cellProperties]);

        const cellKey = `${row}-${col}`;
        const style = cellStyles[cellKey];

        console.log(`Рендеринг ячейки [${row}, ${col}]:`, {
          value,
          style,
          currentStyles: td.style,
        });

        if (style) {
          console.log(`Применение стилей к ячейке [${row}, ${col}]:`, style);
          Object.assign(td.style, style);
        }
        return td;
      }
    );

    // Если есть инстанс таблицы и стили, принудительно обновляем отображение
    if (hotTableRef.current?.hotInstance && Object.keys(cellStyles).length > 0) {
      console.log('Принудительное обновление таблицы после изменения стилей');
      hotTableRef.current.hotInstance.render();
    }
  }, [cellStyles]);

  const saveDataWithStyles = async (newData, newStyles) => {
    try {
      setError(null);
      const processedStyles = {};
      Object.entries(newStyles).forEach(([key, style]) => {
        processedStyles[key] = {
          ...style,
          fontSize: style.fontSize ? parseInt(style.fontSize) + 'px' : '14px',
        };
      });

      console.log('Сохранение данных и стилей:', {
        data: newData,
        styles: processedStyles,
        section,
      });

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/save-excel/`, {
        data: newData,
        styles: processedStyles,
        section: section,
      });

      console.log('Ответ сервера при сохранении:', response.data);
    } catch (error) {
      console.error('Ошибка при сохранении данных и стилей:', error);
      setError('Не удалось сохранить изменения. Пожалуйста, попробуйте еще раз.');
      throw error;
    }
  };

  // Функция для получения текущих стилей выбранных ячеек
  const getCurrentCellStyles = () => {
    if (!selectedRange && !selectedCell) return {};

    const hot = hotTableRef.current?.hotInstance;
    if (!hot) return {};

    let styles = {};

    if (selectedRange) {
      const { from, to } = selectedRange;
      // Проверяем, выделена ли вся строка или столбец
      const isFullRowSelection = from.col === -1;
      const isFullColumnSelection = from.row === -1;

      if (isFullRowSelection) {
        // Для выделенной строки берем стили первой ячейки в строке
        const cellKey = `${from.row}-0`;
        styles = cellStyles[cellKey] || {};
      } else if (isFullColumnSelection) {
        // Для выделенного столбца берем стили первой ячейки в столбце
        const cellKey = `0-${from.col}`;
        styles = cellStyles[cellKey] || {};
      } else {
        // Для обычного выделения берем стили первой ячейки
        const cellKey = `${from.row}-${from.col}`;
        styles = cellStyles[cellKey] || {};
      }
    } else if (selectedCell) {
      const cellKey = `${selectedCell.row}-${selectedCell.col}`;
      styles = cellStyles[cellKey] || {};
    }

    return styles;
  };

  // Функция для применения стилей к диапазону ячеек
  const applyStylesToRange = newStyle => {
    const updatedStyles = { ...cellStyles };
    const hot = hotTableRef.current?.hotInstance;
    if (!hot) return updatedStyles;

    if (selectedRange) {
      const { from, to } = selectedRange;
      // Проверяем, выделена ли вся строка или столбец
      const isFullRowSelection = from.col === -1;
      const isFullColumnSelection = from.row === -1;

      if (isFullRowSelection) {
        // Применяем стили ко всем ячейкам в строке
        for (let col = 0; col < hot.countCols(); col++) {
          const cellKey = `${from.row}-${col}`;
          updatedStyles[cellKey] = {
            ...(updatedStyles[cellKey] || {}),
            ...newStyle,
          };
        }
      } else if (isFullColumnSelection) {
        // Применяем стили ко всем ячейкам в столбце
        const columnIndex = from.col;
        for (let row = 0; row < data.length; row++) {
          const cellKey = `${row}-${columnIndex}`;
          updatedStyles[cellKey] = {
            ...(updatedStyles[cellKey] || {}),
            ...newStyle,
          };
        }
      } else {
        // Применяем стили к выделенному диапазону
        for (let row = Math.min(from.row, to.row); row <= Math.max(from.row, to.row); row++) {
          for (let col = Math.min(from.col, to.col); col <= Math.max(from.col, to.col); col++) {
            const cellKey = `${row}-${col}`;
            updatedStyles[cellKey] = {
              ...(updatedStyles[cellKey] || {}),
              ...newStyle,
            };
          }
        }
      }
    } else if (selectedCell) {
      // Применяем стили к одной ячейке
      const cellKey = `${selectedCell.row}-${selectedCell.col}`;
      updatedStyles[cellKey] = {
        ...(updatedStyles[cellKey] || {}),
        ...newStyle,
      };
    }

    return updatedStyles;
  };

  const applyFormatting = format => {
    console.log('Начало форматирования:', format);

    const hot = hotTableRef.current?.hotInstance;
    if (!hot) {
      console.warn('HotTable инстанс не найден');
      return;
    }

    if (!selectedCell && !selectedRange) {
      console.warn('Не выбрана ни одна ячейка');
      return;
    }

    const currentStyle = getCurrentCellStyles();
    console.log('Текущие стили:', currentStyle);

    let newStyle = {};

    switch (format.type) {
      case 'bold':
        if (currentStyle.fontWeight === 'bold') {
          console.log('Удаление жирного начертания');
          newStyle = { fontWeight: 'normal' };
        } else {
          console.log('Применение жирного начертания');
          newStyle = { fontWeight: 'bold' };
        }
        break;
      case 'italic':
        if (currentStyle.fontStyle === 'italic') {
          console.log('Удаление курсива');
          newStyle = { fontStyle: 'normal' };
        } else {
          console.log('Применение курсива');
          newStyle = { fontStyle: 'italic' };
        }
        break;
      case 'fontSize':
        const fontSize = parseInt(format.size);
        console.log(`Изменение размера шрифта на ${fontSize}px`);
        newStyle = { fontSize: `${fontSize}px` };
        break;
    }

    const updatedStyles = applyStylesToRange(newStyle);
    setCellStyles(updatedStyles);

    // Принудительно обновляем отображение
    requestAnimationFrame(() => {
      if (selectedRange) {
        const { from, to } = selectedRange;
        for (let row = Math.min(from.row, to.row); row <= Math.max(from.row, to.row); row++) {
          for (let col = Math.min(from.col, to.col); col <= Math.max(from.col, to.col); col++) {
            const td = hot.getCell(row, col);
            if (td) {
              Object.assign(td.style, newStyle);
            }
          }
        }
      } else if (selectedCell) {
        const td = hot.getCell(selectedCell.row, selectedCell.col);
        if (td) {
          Object.assign(td.style, newStyle);
        }
      }
      hot.render();
    });
  };

  const loadExcelData = async () => {
    try {
      setError(null);
      setLoading(true);

      // Загружаем стили
      const stylesResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/get-excel-styles/`
      );
      console.log('Загруженные стили:', stylesResponse.data.styles);
      setCellStyles(stylesResponse.data.styles || {});

      // Загружаем данные
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/media/shablon.xlsx`, {
        responseType: 'arraybuffer',
        params: {
          t: new Date().getTime(),
        },
      });

      const workbook = read(response.data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      const jsonData = utils.sheet_to_json(firstSheet, {
        header: 1,
        raw: false,
        defval: '',
      });

      const firstEightRows = jsonData.slice(0, 8).map(row => {
        return [row[0] || ''];
      });

      setData(firstEightRows);
      if (onDataChange) {
        onDataChange(firstEightRows);
      }

      if (hotTableRef.current?.hotInstance) {
        hotTableRef.current.hotInstance.loadData(firstEightRows);
        setTimeout(() => {
          hotTableRef.current.hotInstance.render();
        }, 0);
      }
    } catch (error) {
      console.error('Ошибка при загрузке файла:', error);
      setError('Не удалось загрузить файл. Пожалуйста, проверьте, что файл существует и доступен.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExcelData();
  }, []);

  React.useImperativeHandle(ref, () => ({
    loadExcelData,
    saveDataWithStyles: () => saveDataWithStyles(data, cellStyles),
  }));

  // Функция для проверки, активен ли определенный стиль
  const isStyleActive = styleType => {
    const currentStyles = getCurrentCellStyles();
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
      </div>
      <div className="table-container">
        <HotTable
          ref={hotTableRef}
          data={data}
          rowHeaders={true}
          colHeaders={COLUMN_HEADERS}
          height="100%"
          width="100%"
          licenseKey="non-commercial-and-evaluation"
          stretchH="none"
          columns={[
            {
              type: 'text',
              wordWrap: true,
              readOnly: false,
              width: 800,
              renderer: 'customTextRenderer',
            },
          ]}
          colWidths={[800]}
          preventOverflow="horizontal"
          className="custom-table"
          manualColumnResize={true}
          manualRowResize={false}
          autoColumnSize={false}
          stretchingColumnRatio={1}
          fixedRowsTop={0}
          contextMenu={true}
          allowInsertColumn={false}
          allowRemoveColumn={false}
          allowInsertRow={false}
          allowRemoveRow={false}
          customBorders={true}
          cell={[]}
          afterSelection={(row, column, row2, column2, preventScrolling, selectionLayerLevel) => {
            console.log('Выделение:', {
              start: { row, column },
              end: { row: row2, column: column2 },
              preventScrolling,
              selectionLayerLevel,
            });

            // Определяем тип выделения
            const isColumnSelection = row === 0 && row2 === data.length - 1;

            if (isColumnSelection) {
              setSelectedRange({
                from: { row: -1, col: column },
                to: { row: -1, col: column2 },
              });
              setSelectedCell(null);
            } else if (row === row2 && column === column2) {
              setSelectedCell({ row, col: column });
              setSelectedRange(null);
            } else {
              setSelectedRange({
                from: { row, col: column },
                to: { row: row2, col: column2 },
              });
              setSelectedCell(null);
            }

            // Обновляем отображение стилей в панели инструментов
            const currentStyles = isColumnSelection
              ? cellStyles[`0-${column}`] || {}
              : cellStyles[`${row}-${column}`] || {};

            console.log('Текущие стили выбранной ячейки:', currentStyles);
          }}
          afterGetColHeader={(col, TH) => {
            if (col === 0) {
              TH.style.width = 'calc(100% - 50px)';
            }
          }}
          afterChange={changes => {
            if (changes) {
              const updatedData = [...data];
              changes.forEach(([row, col, oldValue, newValue]) => {
                if (updatedData[row]) {
                  if (!updatedData[row][col]) {
                    updatedData[row] = [...updatedData[row]];
                  }
                  updatedData[row][col] = newValue;
                }
              });
              setData(updatedData);
              if (onDataChange) {
                onDataChange(updatedData);
              }
            }
          }}
        />
      </div>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
});

export default ExcelEditor;
