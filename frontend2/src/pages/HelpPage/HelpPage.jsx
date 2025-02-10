import React from "react";
import { BiPhone } from "react-icons/bi";

import Layout from "../../shared/ui/Layout/Layout";
import HelpPageWrapper from "./HelpPageWrapper";

const HelpPage = () => {
  const reglaments = [
    { reglamentName: "Регламент 1", reglamentLink: "" },
    { reglamentName: "Регламент 2", reglamentLink: "" },
    { reglamentName: "Регламент 3", reglamentLink: "" },
    { reglamentName: "Регламент 4", reglamentLink: "" },
    { reglamentName: "Регламент 5", reglamentLink: "" },
  ];

  return (
    <Layout title="Помощь">
      <HelpPageWrapper>
        <div className="block">
          <a href="" className="link">
            Пользовательская документация
          </a>
          <a href="" className="link">
            Журнал регистрации ошибок, замечаний и предложений по работе в
            системе «Шаблон приложения»
          </a>
          <div className="reglaments">
            <p className="title">Регламенты для ознакомления:</p>
            {reglaments.map((reglament) => (
              <a
                href={reglament.reglamentLink}
                className="link link-download"
                key={reglament.reglamentName}
              >
                {reglament.reglamentName}
              </a>
            ))}
          </div>
        </div>
        <div>
          <p className="title">
            Если у Вас возникли вопросы по работе в системе:
          </p>
          <ul className="list">
            <li className="list-item">позвоните по номеру телефона 9-66-99</li>
            <li className="list-item">
              оставьте обращение в <a>системе поддержки пользователей</a>
            </li>
          </ul>
        </div>
        <div>
          <p className="title">Контактная информация:</p>
          <ul className="list list-custom">
            <li className="list-item">
              <span className="list-icon">
                <BiPhone />
              </span>
              11-11-11 Отдел приема заявок системы «Шаблон приложения»
            </li>
            <li className="list-item">
              <span className="list-icon">
                <BiPhone />
              </span>
              10-10-10 Отдел маркетинга системы «Шаблон приложения»
            </li>
          </ul>
        </div>
      </HelpPageWrapper>
    </Layout>
  );
};

export default HelpPage;
