import styled from "styled-components";

import { colors } from "../../../../shared/assets/colors";

const ErrorCardWrapper = styled.div`
  flex: 1;

  .text {
    display: flex;
    flex-direction: column;
    align-items: center;

    color: ${colors["light"].color_text};

    .text-title {
      font-size: 48px;
      font-weight: 800;
      margin: 10px 0 10px 0;
    }

    .text-main {
      font-size: 24px;
      font-weight: 400;
      margin: 10px 0 10px 0;
    }
  }

  .layout {
    position: relative;
    width: 100%;
    max-width: calc(100% - 40px);

    margin: 20px;
    min-height: calc(100vh - 40px);

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;

    background-color: #fcfcfc;
    border-radius: 16px;
    border: 1px solid ${colors["light"].border_color};

    padding: 20px;
  }
`;

export default ErrorCardWrapper;
