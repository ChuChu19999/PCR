import React from 'react';
import Layout from '../../shared/ui/Layout/Layout';
import HelpPageWrapper from './HelpPageWrapper';

const HelpPage = () => {
  return (
    <Layout title="Помощь">
      <HelpPageWrapper>
        <div style={{ paddingTop: '20px' }}>
          <p className="title">Новости обновлений:</p>
          <ul className="list">
            <li className="list-item">
              Добавлена вкладка "Пробы". Теперь добавление расчетов производится через эту вкладку,
              а не через "Протоколы"
            </li>
            <li className="list-item">
              при заполнении полей "Филиал" и "Место отбора пробы" в протоколе предлагаются варианты
              из справочников
            </li>
            <li className="list-item">добавлена вкладка "Приборы"</li>
            <li className="list-item">
              добавлена обработка условий аккредитации при формировании/создании/редактировании
              протоколов
            </li>
            <li className="list-item">
              добавлены "Условия отбора" при создании и редактировании протоколов
            </li>
            <li className="list-item">
              на страницу подразделения "26 съезда КПСС" добавлены новые методы исследований:
              плотность при 20℃ и массовая доля воды
            </li>
            <li className="list-item">
              во вкладке "Протоколы" реализовано прикрепление свободных расчетов и формирование
              протоколов с прикрепленными расчетами
            </li>
          </ul>
        </div>
        <div>
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
