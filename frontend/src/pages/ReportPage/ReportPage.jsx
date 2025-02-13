import React from 'react';
import ReportPageWrapper from './ReportPageWrapper';
import Layout from '../../shared/ui/Layout/Layout';
import { Button } from '../../shared/ui/Button/Button';
import { useNavigate } from 'react-router-dom';

const ReportPage = () => {
  const navigate = useNavigate();

  return (
    <ReportPageWrapper>
      <Layout title="Пример страницы с вложенным роутингом">
        <Button
          title="Новый документ"
          className="button"
          onClick={() => navigate('new', { relative: 'path' })}
        />
      </Layout>
    </ReportPageWrapper>
  );
};

export default ReportPage;
