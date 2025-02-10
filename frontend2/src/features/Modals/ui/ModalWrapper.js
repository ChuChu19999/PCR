import styled from "styled-components";

const ModalWrapper = styled.div`
  position: absolute;
  z-index: 4;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  width: 80%;
  padding-bottom: 20px;

  color: #000;
  font-family: "HeliosCondC";
  background-color: #fcfcfc;

  border: 1px solid #babfc7;
  border-radius: 16px;

  span {
    font-family: "HeliosCondC";
  }

  input {
    font-family: "HeliosCondC" !important;
  }

  .modal-header {
    position: relative;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;

    width: 100%;
    height: 40px;

    font-size: 14px;
    background-color: #e4e6e8;
    border-radius: 16px 16px 0px 0px;
    border-bottom: #babfc7 1px solid;
  }

  .modal-close {
    position: absolute;
    right: 15px;
    cursor: pointer;

    &:hover {
      color: black;
    }
  }

  .body {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0px 20px;

    &-info {
      display: flex;
      flex-direction: column;
      font-size: 14px;

      &-title {
        margin: 5px 0px 5px 0px;
      }

      &-text {
        margin: 0px 0px 15px 12px;
      }

      &-range {
        margin: 0px 0px 15px 0px;
      }

      &-input {
        margin: 0px 0px 10px 0px;
      }
    }

    &-buttons {
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;

      width: 100%;
      gap: 15px;
    }
  }
`;

export default ModalWrapper;
