import styled from 'styled-components';

import { colors } from '../../assets/colors';

const LayoutWrapper = styled.div`
  flex: 1;
  overflow: auto;

  /* Закоммитить, если верхнее меню */
  height: 100vh;

  background-color: #d3ebf8;

  .layout {
    position: relative;
    width: 100%;
    max-width: calc(100% - 40px);

    margin: 20px;
    min-height: calc(100vh - 40px);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    box-sizing: border-box;

    background-color: #fcfcfc;
    border-radius: 16px;
    border: 1px solid ${colors['light'].border_color};
  }

  .header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;

    border-bottom: ${() => colors['light'].color_main_grey_50} 1px solid;
    margin-bottom: 10px;

    &-text {
      font-family: 'HeliosCondC';
      font-style: normal;
      font-weight: 400;
      font-size: 16px;
      letter-spacing: 0.01em;
      color: #000000;

      margin: 10px;
    }

    &-settings {
      cursor: pointer;
      margin-right: 10px;
    }
  }

  .content {
    width: 100%;
    flex: 1;

    display: flex;
    flex-direction: column;
  }
`;

export default LayoutWrapper;
