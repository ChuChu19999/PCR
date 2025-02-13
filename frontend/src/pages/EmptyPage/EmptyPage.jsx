import React from 'react';
import EmptyPageWrapper from './EmptyPageWrapper';
import Layout from '../../shared/ui/Layout/Layout';

const EmptyPage = () => {
  return (
    <EmptyPageWrapper>
      <Layout title="Пустая страница"></Layout>
    </EmptyPageWrapper>
  );
};

export default EmptyPage;
