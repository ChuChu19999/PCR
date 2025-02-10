import styled from "styled-components";

import { colors } from "../../../assets/colors";

export const FormItemWrapper = styled.div`
  width: 100%;

  .flex-row {
    display: flex;
    flex-direction: row;

    gap: 10px;
    align-items: center;
  }

  .select {
    width: 225px;
  }

  /* Установите нужный размер checkbox */
  .ant-checkbox-inner {
    width: 20px;
    height: 20px;
  }

  .options {
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  .button-delete-item {
    vertical-align: text-bottom;
    padding-left: 10px;
    margin-bottom: 12px;
    color: ${colors["light"].color_main_grey_50};
  }

  .button-add {
    width: 100%;
    gap: 5px;

    align-items: center;
  }
`;
