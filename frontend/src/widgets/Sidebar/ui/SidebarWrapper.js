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

  transition: all 0.4s ease;
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
    height: 45px;
    padding: 0 15px;
    cursor: pointer;
    font-family: 'HeliosCondC';
    font-size: 15px;
    white-space: nowrap;
    overflow: hidden;
    display: flex;
    align-items: center;
    gap: 10px;

    svg {
      flex-shrink: 0;
      font-size: 20px;
    }

    span {
      opacity: 1;
      width: auto;
      margin-left: 10px;
      transition: all 0.2s ease-in-out;
    }

    ${p =>
      p.collapsed &&
      css`
        justify-content: center;
        padding: 0 28px;

        span {
          opacity: 0;
          width: 0;
          margin-left: 0;
          transition: all 0.2s ease-in-out;
        }
      `}

    &:hover {
      background-color: ${colors['light'].menu_item_background};
    }
  }

  .menu-item-active {
    position: relative;
    width: 100%;
    height: 45px;
    padding: 0 15px 0 10px;
    cursor: pointer;
    font-family: 'HeliosCondC';
    font-size: 15px;
    background-color: ${colors['light'].menu_item_background};
    border-left: 5px solid ${p => colors[p.themelocal].color_bright_orange_50};
    white-space: nowrap;
    overflow: hidden;
    display: flex;
    align-items: center;
    gap: 10px;

    svg {
      flex-shrink: 0;
      font-size: 20px;
    }

    span {
      opacity: 1;
      width: auto;
      margin-left: 10px;
      transition: all 0.2s ease-in-out;
    }

    ${p =>
      p.collapsed &&
      css`
        justify-content: center;
        padding: 0 28px;

        span {
          opacity: 0;
          width: 0;
          margin-left: 0;
          transition: all 0.2s ease-in-out;
        }
      `}
  }

  .user-name {
    flex: 1;
    font-family: 'HeliosCondC';
    font-size: 15px;
    padding-left: 10px;
    margin: 0;
    opacity: ${p => (p.collapsed ? 0 : 1)};
    width: ${p => (p.collapsed ? 0 : 'auto')};
    transition: ${p => (p.collapsed ? 'all 0.05s linear' : 'all 0.2s ease')};
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
    justify-content: flex-start;
    flex-direction: row;
    padding: 20px;
    border-top: 1px solid #bdbfc1;
    cursor: pointer;
    transition: all 0.4s ease;
    height: 75px;
    box-sizing: border-box;

    &:hover {
      background-color: rgba(4, 59, 107, 0.1);
    }

    &:active {
      background-color: rgba(4, 59, 107, 0.2);
    }

    &-icon {
      flex: none;
      font-size: 20px;
    }

    &-name {
      position: relative;
      font-family: 'HeliosCondC';
      font-size: 15px;
      margin: 0;
      max-width: ${p => (p.collapsed ? '0' : '120px')};
      min-width: ${p => (p.collapsed ? '0' : '120px')};
      opacity: ${p => (p.collapsed ? 0 : 1)};
      overflow: hidden;
      visibility: ${p => (p.collapsed ? 'hidden' : 'visible')};
      transform: translateX(${p => (p.collapsed ? '-20px' : '0')});
      transition:
        opacity 0.2s ease-in-out ${p => (p.collapsed ? '0s' : '0.3s')},
        visibility 0.2s ease-in-out ${p => (p.collapsed ? '0s' : '0.3s')},
        transform 0.2s ease-in-out ${p => (p.collapsed ? '0s' : '0.3s')},
        max-width 0.2s ease-in-out ${p => (p.collapsed ? '0s' : '0.3s')},
        min-width 0.2s ease-in-out ${p => (p.collapsed ? '0s' : '0.3s')};
      word-wrap: break-word;
      line-height: 1.2;

      &::before {
        content: '';
        display: block;
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(
          to right,
          transparent 0%,
          transparent 90%,
          ${p => colors[p.themelocal].sidebar_gradient_lvl_1} 100%
        );
        opacity: ${p => (p.collapsed ? 1 : 0)};
        transition: opacity 0.2s ease-in-out;
        pointer-events: none;
      }
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
    transition: background-color 0.3s ease;

    &:hover {
      background-color: rgba(25, 118, 210, 0.04);
    }
  }
`;

export default SidebarWrapper;
