import styled from "styled-components";

const HeaderWrapper = styled.div`
  width: 100%;
  height: 65px;
  background: linear-gradient(90deg, rgb(0, 121, 194) 40%, rgb(0, 74, 119));
  overflow: hidden;

  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;

  .logo {
    display: flex;
    align-items: center;
    padding-left: 20px;

    &-text {
      margin: 0px;
      padding-left: 10px;
      font-family: "HeliosCondBlack";
      font-size: 16px;
      letter-spacing: 1px;
      color: #fff;
    }

    &-icon {
      width: 40px;
    }
  }

  .name {
    font-family: "HeliosCondC";
    font-size: 14px;
    color: #fff;

    padding-right: 20px;
    max-width: 30%;
  }
`;

export default HeaderWrapper;
