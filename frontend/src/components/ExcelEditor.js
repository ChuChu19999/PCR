import React, { useState, useEffect, useRef } from 'react';
import { HotTable } from '@handsontable/react';
import { registerRenderer, getRenderer } from 'handsontable/renderers';
import 'handsontable/dist/handsontable.full.css';
import { read, utils } from 'xlsx';
import api from '../api/config';
import styled from 'styled-components';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import { Tooltip } from '@mui/material';
import { API_ROUTES } from '../constants/apiRoutes';

const EditorContainer = styled.div`
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin: 8px auto;
  overflow: hidden;
  width: 95%;
  max-width: 875px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ToolbarContainer = styled.div`
  width: 100%;
  padding: 12px;
  background: #ffffff;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e0e0e0;
`;

const ToolbarButton = styled.button`
  padding: 8px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  min-width: 40px;
  min-height: 40px;
  position: relative;
  color: #2c3e50;

  &:hover {
    background: #f8f9fa;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  &.active {
    background: #e3f2fd;
    border-color: #1976d2;
    color: #1976d2;
    box-shadow: 0 2px 4px rgba(25, 118, 210, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #f5f5f5;
    transform: none;
    box-shadow: none;
  }

  svg {
    font-size: 20px;
  }
`;

const FontSizeSelect = styled.select`
  padding: 8px 8px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  background: white;
  cursor: pointer;
  min-height: 40px;
  min-width: 66px;
  width: 66px;
  font-size: 14px;
  color: #2c3e50;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
  padding-right: 28px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #1976d2;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &:focus {
    outline: none;
    border-color: #1976d2;
    box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: #f5f5f5;
    box-shadow: none;
  }

  option {
    padding: 8px;
  }
`;

const TableContainer = styled.div`
  width: 100%;
  height: 325px;
  overflow: auto;
  margin-bottom: 12px;

  .handsontable {
    margin: 0 auto;
  }

  .handsontable col.rowHeader {
    width: 40px;
    min-width: 40px;
    max-width: 40px;
  }

  .handsontable td {
    white-space: normal;
    padding: 6px 10px;
    text-align: center !important;
    min-width: 180px;
  }

  .handsontable .htDimmed {
    text-align: center !important;
  }

  .handsontable .htCore td {
    text-align: center !important;
    border-right: none;
  }

  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 5px;
  }

  ::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 5px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

const ErrorMessage = styled.div`
  color: #dc3545;
  margin-top: 10px;
  padding: 10px;
  border-radius: 4px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
`;

const LoadingOverlay = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  font-size: 16px;
  color: #666;
`;

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

      const response = await api.post(API_ROUTES.EXCEL.SAVE, {
        data: newData,
        styles: processedStyles,
        section: section,
      });

      console.log('Ответ сервера при сохранении:', response.data);
    } catch (error) {
      console.error('Ошибка при сохранении данных и стилей:', error);
      setError('Не удалось сохранить изменения. Пожалуйста, попробуйте еще раз.');
      throw error; // Пробрасываем ошибку дальше для обработки в родительском компоненте
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

      // Сначала загружаем стили
      const stylesResponse = await api.get(API_ROUTES.EXCEL.GET_STYLES);
      console.log('Загруженные стили:', stylesResponse.data.styles);
      setCellStyles(stylesResponse.data.styles || {});

      // Затем загружаем данные
      const response = await api.get('/media/shablon.xlsx', {
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
        // Принудительно обновляем отображение после загрузки данных
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
    return <LoadingOverlay>Загрузка данных...</LoadingOverlay>;
  }

  return (
    <EditorContainer>
      <ToolbarContainer>
        <Tooltip title="Жирный" arrow placement="top">
          <span>
            <ToolbarButton
              onClick={() => applyFormatting({ type: 'bold' })}
              disabled={!selectedCell && !selectedRange}
              className={isStyleActive('bold') ? 'active' : ''}
            >
              <FormatBoldIcon />
            </ToolbarButton>
          </span>
        </Tooltip>
        <Tooltip title="Курсив" arrow placement="top">
          <span>
            <ToolbarButton
              onClick={() => applyFormatting({ type: 'italic' })}
              disabled={!selectedCell && !selectedRange}
              className={isStyleActive('italic') ? 'active' : ''}
            >
              <FormatItalicIcon />
            </ToolbarButton>
          </span>
        </Tooltip>
        <Tooltip title="Размер шрифта" arrow placement="top">
          <span>
            <FontSizeSelect
              onChange={e => applyFormatting({ type: 'fontSize', size: e.target.value })}
              value={isStyleActive('fontSize')}
              disabled={!selectedCell && !selectedRange}
            >
              <option value="8">8px</option>
              <option value="9">9px</option>
              <option value="10">10px</option>
              <option value="11">11px</option>
              <option value="12">12px</option>
              <option value="14">14px</option>
              <option value="16">16px</option>
              <option value="18">18px</option>
              <option value="20">20px</option>
              <option value="24">24px</option>
              <option value="30">30px</option>
              <option value="36">36px</option>
              <option value="48">48px</option>
              <option value="60">60px</option>
              <option value="72">72px</option>
              <option value="96">96px</option>
            </FontSizeSelect>
          </span>
        </Tooltip>
      </ToolbarContainer>
      <TableContainer>
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
      </TableContainer>
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </EditorContainer>
  );
});

export default ExcelEditor;
