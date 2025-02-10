import React from "react";
import HeaderWrapper from "./HeaderWrapper";
import { Logo } from "../../../shared/assets/svg";

const Header = () => (
  <HeaderWrapper>
    <div className="logo">
      <img src={Logo} className="logo-icon" />
      <p className="logo-text">Шаблон приложения</p>
    </div>

    <p className="name">Василий Васильевич Васильев-Васильев</p>
  </HeaderWrapper>
);

export default Header;
