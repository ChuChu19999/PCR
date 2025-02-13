import 'ag-grid-community/styles/ag-grid.css'; // Mandatory CSS required by the Data Grid
import 'ag-grid-community/styles/ag-theme-quartz.css'; // Optional Theme applied to the Data Grid

import React, { useEffect, useMemo, useState } from 'react';

import Layout from '../../shared/ui/Layout/Layout';
import { tableData } from './table.data';
import TablePageWrapper from './TablePageWrapper';
import { Table } from '../../widgets/Table';
import LoadingCard from '../../features/Cards/ui/LoadingCard/LoadingCard';
import { StatusCellRenderer } from '../../shared/lib/ag-grid/ui/StatusCellRender/StatusCellRender';

const TablePage = () => {
  const [editing, setEditing] = useState(false);
  const [isContentLoading, setContentLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    // Симуляция загрузки данных
    const timer = setTimeout(() => {
      // setContentLoading(true);
      setData(tableData);
    }, 1500); // Замените на реальный запрос данных

    return () => clearTimeout(timer);
  }, [data]);

  const handleLoadingComplete = () => {
    setContentLoading(false);
  };

  const colDefsData = useMemo(
    () => [
      {
        headerName: 'ФИО',
        field: 'name',
      },
      {
        headerName: 'Подразделение',
        field: 'division',

        cellStyle: {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        },
      },
      {
        headerName: 'Должность',
        field: 'position',
      },
      {
        headerName: 'Загруженность',
        field: 'load',
        editable: false,
        cellRenderer: 'agSparklineCellRenderer',
        cellRendererParams: {
          sparklineOptions: {
            line: {
              strokeWidth: 1.5,
            },
          },
        },
      },
      {
        headerName: 'Наличие договора о конфиденциальности',
        field: 'confidentiality',

        valueFormatter: p => {
          if (typeof p.value !== 'boolean') return p.value;
          return p.value ? 'Имеется' : 'Отсутствует';
        },
        cellRenderer: StatusCellRenderer,
        cellEditor: 'agRichSelectCellEditor',
        maxWidth: 130,
        cellEditorParams: {
          values: ['Имеется', 'Отсутствует'],
        },
        cellStyle: {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        },
      },
      {
        headerName: 'Линейный руководитель',
        field: 'leader',
      },
      {
        headerName: 'Номер рабочего телефона',
        field: 'phone',

        cellStyle: {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        },
      },
    ],
    []
  );

  const autoSize = {
    type: 'fitGridWidth',
    defaultMinWidth: 100,
    defaultMaxWidth: 300,
    columnLimits: [
      {
        colId: 'name',
        minWidth: 150,
      },
    ],
  };

  return (
    <TablePageWrapper>
      {isContentLoading && (
        <LoadingCard
          isLoading={data.length === 0}
          // isLoading
          onCompleteLoading={handleLoadingComplete}
        />
      )}
      <Layout
        settings
        title="Сводная таблица по работникам Общества 2024"
        headerClassName="header-style"
        bodyClassName="body-style"
        onSettingsClick={() => {
          console.log('click');
          setEditing(!editing);
        }}
      >
        <Table data={data} columnDefs={colDefsData} editing={editing} autoSizeStrategy={autoSize} />
      </Layout>
    </TablePageWrapper>
  );
};

export default TablePage;
