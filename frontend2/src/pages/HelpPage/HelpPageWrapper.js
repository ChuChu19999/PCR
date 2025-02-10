import styled from "styled-components";

import { colors } from "../../shared/assets/colors";

const HelpPageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 30px;

  padding: 0px 20px 20px 20px;

  .reglaments {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .link {
    font-family: "HeliosCondC";
    font-size: 14px;
    color: ${colors["light"].links};

    &-download {
      text-decoration: underline;
    }
  }

  .title {
    font-family: "HeliosCondC";
    font-size: 14px;
    color: ${colors["light"].color_text};
    margin: 0;
  }

  .block {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .list {
    font-family: "HeliosCondC";
    margin: 0;
    padding: 0 0 0 25px;

    &-item {
      font-size: 14px;
      color: ${colors["light"].color_text};

      a {
        color: ${colors["light"].links};
      }
    }

    &-icon {
      padding-right: 5px;
      align-items: center;
      vertical-align: text-top;
    }

    &-custom {
      list-style: none;
      padding: 0 0 0 10px;
    }
  }
`;

export default HelpPageWrapper;
