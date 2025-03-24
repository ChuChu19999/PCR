import styled from 'styled-components';

const ModalWrapper = styled.div`
  position: fixed;
  z-index: 1000;
  top: 50%;
  left: calc(50% + 125px); /* 125px - половина ширины бокового меню */
  transform: translate(-50%, -50%);
  max-height: 90vh;
  max-width: min(90vw, 1200px);
  width: ${props => props.style?.width || '80%'};
  display: flex;
  flex-direction: column;
  margin: 0 auto;

  color: #000;
  font-family: 'HeliosCondC';
  background-color: #fcfcfc;

  border: 1px solid #babfc7;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  span {
    font-family: 'HeliosCondC';
  }

  input {
    font-family: 'HeliosCondC' !important;
  }

  .modal-header {
    position: relative;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;

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
    transition: all 0.2s ease;

    &:hover {
      color: black;
      transform: scale(1.1);
    }
  }

  .body {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 20px;
    padding-right: 20px;
    max-height: calc(
      90vh - 40px - 80px
    ); /* 40px - header, 80px - примерная высота футера с кнопками */

    /* Стилизация скроллбара */
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
      background: #555;
    }

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
      margin-top: 20px;
      gap: 15px;
      flex-shrink: 0;
      padding-top: 10px;
      border-top: 1px solid #e4e6e8;
    }
  }

  @media (max-width: 1024px) {
    left: 50%; /* На мобильных устройствах центрируем по центру экрана */
    width: 95%;
  }
`;

export default ModalWrapper;
