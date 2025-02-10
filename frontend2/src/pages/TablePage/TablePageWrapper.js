import styled from "styled-components";

import { colors } from "../../shared/assets/colors";

const TablePageWrapper = styled.div`
  height: 100vh;
  flex: 1;

  .header-style {
    margin-bottom: 0 !important;
  }

  .body-style {
    border: 1px solid ${() => colors["light"].border_color};
    /* height: 100%; */
  }

  .ag-theme-quartz {
    --ag-font-family: "HeliosCondC";

    --ag-header-background-color: ${() =>
      colors["light"].table_title_background};
    --ag-wrapper-border-radius: 0 0 16px 16px;
    --ag-border-color: ${() => colors["light"].border_color};
  }
`;

export default TablePageWrapper;
