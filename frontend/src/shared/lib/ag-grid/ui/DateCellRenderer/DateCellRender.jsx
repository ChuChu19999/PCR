import React from 'react';
import DateCellRendererWrapper from './DateCellRendererWrapper';

export const DateCellRenderer = ({ value }) => {
  const getDate = date => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Месяцы в JavaScript начинаются с 0
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  return (
    <DateCellRendererWrapper>
      <span>{getDate(value)}</span>
    </DateCellRendererWrapper>
  );
};
