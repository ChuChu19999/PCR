import styled, { css } from 'styled-components';

import { colors } from '../../../shared/assets/colors';
import { getTextColor } from '../../../shared/model/getTextColor';

// type Props = {
//   collapsed: boolean;
//   themelocal: ThemeEnum;
// };

const SidebarWrapper = styled.div.withConfig({
  shouldForwardProp: prop => !['collapsed', 'themelocal'].includes(prop),
})`
  min-width: ${p => (p.collapsed ? '75px' : '200px')};
  max-width: ${p => (p.collapsed ? '75px' : '200px')};

  height: 100vh;
  overflow-y: hidden;

  display: flex;
  flex-direction: column;
  justify-content: space-between;

  transition: 0.4s;
  background: ${p => colors[p.themelocal].sidebar_gradient_lvl_1};
  color: ${p => getTextColor(colors[p.themelocal].sidebar_gradient_lvl_1)};

  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .logo {
    width: ${p => (p.collapsed ? '40px' : '70px')};

    &-collapsed {
      width: 25px;
    }

    padding: 20px 0;
  }

  .arrowButton {
    transform: ${p => !p.collapsed && 'rotate(180deg)'};
    transition: 0.4s;

    margin: 20px 20px 20px 20px;

    &:hover {
      cursor: pointer;
    }
  }

  .sidebar {
    width: 100%;
    box-sizing: border-box;
    padding: 0;
    margin: 0;

    &-item {
      display: flex;
    }
  }

  .menu-item {
    position: relative;
    width: 100%;
    padding: 10px 15px;

    cursor: pointer;

    font-family: 'HeliosCondC';
    font-size: 15px;

    ${p =>
      p.collapsed &&
      css`
        display: flex;
        justify-content: center;
        align-items: center;
      `}

    &:hover {
      background-color: ${colors['light'].menu_item_background};
    }

    &-active {
      ${p =>
        p.collapsed &&
        css`
          display: flex;
          justify-content: center;
          align-items: center;
        `}

      position: relative;
      width: 100%;
      padding: 10px 15px 10px 10px;

      cursor: pointer;

      font-family: 'HeliosCondC';
      font-size: 15px;
      background-color: ${colors['light'].menu_item_background};

      border-left: 5px solid ${p => colors[p.themelocal].color_bright_orange_50};
    }
  }

  /* .item-level {
    &-0 {
      font-weight: bold;
    }
  } */

  a.menu-item {
    transition: 0.3s;
    text-decoration: none;
    color: inherit;
    display: flex;
  }

  .submenu {
    z-index: 4;

    margin-left: 20px;
    display: none;
    height: 100%;
    box-sizing: border-box;
    transition: 0.3s;
    padding: 0px;

    &-title {
      padding: 20px 0 10px 0;
      font-family: 'HeliosCondC';
      text-decoration: underline;
      text-underline-offset: 6px;
      align-self: center;
    }

    &.level-1 {
      display: flex;
      flex-direction: column;
      position: absolute;
      top: 0;

      width: 200px;

      background: ${p => colors[p.themelocal].sidebar_gradient_lvl_2};
      background-color: #e1e1e1;
    }

    &.level-2 {
      display: flex;
      flex-direction: column;
      position: absolute;
      top: 0;

      width: 200px;

      background: ${p => colors[p.themelocal].sidebar_gradient_lvl_3};
      background-color: #d1d1d1;
    }
  }

  .collapsed {
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .user {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: row;

    padding: 20px;
    border-top: 1px solid #bdbfc1;

    &:hover {
      cursor: pointer;
    }

    &:active {
      cursor: pointer;

      background-color: #043b6b8f;
    }

    &-icon {
      flex: 1;
    }

    &-name {
      flex: 5;

      font-family: 'HeliosCondC';
      font-size: 15px;

      padding-left: 10px;
      margin: 0px;
    }
  }

  .footer {
    display: flex;
    flex-direction: column;
    align-items: ${p => (p.collapsed ? 'center' : 'flex-end')};
    justify-content: center;
  }

  .logo-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 90px;

    &:hover {
      background-color: rgba(25, 118, 210, 0.04);
    }
  }
`;

export default SidebarWrapper;
