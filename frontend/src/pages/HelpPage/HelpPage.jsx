import React from 'react';
import Layout from '../../shared/ui/Layout/Layout';
import HelpPageWrapper from './HelpPageWrapper';

const HelpPage = () => {
  return (
    <Layout title="Помощь">
      <HelpPageWrapper>
        <div style={{ paddingTop: '20px' }}>
          <p className="title">Если у Вас возникли вопросы по работе в системе:</p>
          <ul className="list">
            <li className="list-item">позвоните по номеру телефона 9-66-99</li>
            <li className="list-item">
              оставьте обращение в <a>системе поддержки пользователей</a>
            </li>
          </ul>
        </div>
      </HelpPageWrapper>
    </Layout>
  );
};

export default HelpPage;
