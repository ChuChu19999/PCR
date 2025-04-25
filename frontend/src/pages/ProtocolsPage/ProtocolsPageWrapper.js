import styled from 'styled-components';

const ProtocolsPageWrapper = styled.div`
  flex: 1;
  font-family: 'HeliosCondC';
  max-width: 100%;
  overflow-x: hidden;

  * {
    font-family: 'HeliosCondC' !important;
  }

  .form {
    padding: 20px;
    max-width: 100%;

    .ant-col,
    .ant-select-selector,
    .ant-input,
    .ant-select-selection-placeholder,
    .ant-select-selection-item,
    .ant-form-item-label > label,
    .ant-btn {
      font-family: 'HeliosCondC' !important;
      max-width: 100%;
      font-size: 13px;
    }

    .ant-form-item {
      margin-bottom: 8px;
      max-width: 100%;
    }

    .ant-btn {
      height: 32px;
      padding: 4px 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .protocols-list {
    margin-top: 20px;

    .ant-table-wrapper {
      .ant-table {
        background: #fff;
        border-radius: 12px;
        overflow: hidden;

        .ant-table-container {
          border: 1px solid #0079c2;
          border-radius: 12px;
          overflow: hidden;
        }

        table {
          border-radius: 12px;
          overflow: hidden;
        }

        .ant-table-thead > tr > th {
          background: #0079c2;
          color: #ffffff;
          font-weight: 600;
          font-size: 13px;
          padding: 16px;
          border: none;
          transition: background 0.3s ease;
          text-align: left;
          padding-left: 16px;

          &:hover {
            background: #0088db !important;
          }

          &::before {
            display: none;
          }

          .ant-table-column-sorter {
            color: rgba(255, 255, 255, 0.85);
          }
        }

        .ant-table-tbody > tr > td {
          font-size: 13px;
          padding: 14px 16px;
          border: none;
          transition: all 0.2s ease;
          color: #004a77;
          position: relative;
          padding-left: 16px;
        }

        .ant-table-tbody > tr {
          position: relative;
          transition: all 0.2s ease;
          border-bottom: 1px solid #f0f0f0;

          &:last-child {
            border-bottom: none;
          }

          &:hover {
            > td {
              background: #e6f4ff;
              cursor: pointer;
              color: #0079c2;
              font-weight: 500;
            }
          }

          &:nth-child(even) {
            background-color: #f8fafd;

            &:hover {
              > td {
                background: #e6f4ff;
              }
            }
          }

          &:active > td {
            background: rgba(0, 121, 194, 0.15) !important;
          }
        }

        .ant-table-cell {
          vertical-align: middle;
        }

        .ant-table-column-sorter-up.active,
        .ant-table-column-sorter-down.active {
          color: #ffffff;
        }
      }

      .ant-pagination {
        margin: 20px 0;

        .ant-pagination-item-active {
          border-color: #0079c2;
          background: #0079c2;
          transform: scale(1.05);
          transition: all 0.2s ease;

          a {
            color: white;
          }

          &:hover {
            border-color: #0088db;
            background: #0088db;
          }
        }

        .ant-pagination-item {
          transition: all 0.2s ease;

          &:hover {
            border-color: #0079c2;
            transform: scale(1.05);
            a {
              color: #0079c2;
            }
          }
        }

        .ant-pagination-prev,
        .ant-pagination-next {
          button {
            transition: all 0.2s ease;

            &:hover {
              border-color: #0079c2;
              color: #0079c2;
              transform: scale(1.05);
            }
          }
        }

        .ant-pagination-options {
          .ant-select-selector {
            cursor: pointer;
          }

          .ant-pagination-options-quick-jumper {
            input {
              cursor: text;
            }
          }
        }
      }

      .ant-table-column-sorter {
        color: rgba(44, 82, 130, 0.5);
        transition: color 0.3s ease;
      }

      .ant-table-column-sorter-up.active,
      .ant-table-column-sorter-down.active {
        color: #2c5282;
      }

      .ant-empty {
        padding: 40px 0;

        .ant-empty-description {
          color: #718096;
          font-size: 14px;
        }
      }
    }
  }

  .ant-select-dropdown {
    * {
      font-family: 'HeliosCondC' !important;
      font-size: 13px;
    }
  }

  .protocol-item {
    background: linear-gradient(135deg, #f0f7ff 0%, #e6f3ff 100%);
    border-radius: 12px;
    padding: 16px;
    border: 1px solid rgba(44, 82, 130, 0.1);
    box-shadow: 0 4px 12px rgba(44, 82, 130, 0.05);
    transition: all 0.3s ease;

    &:hover {
      box-shadow: 0 6px 16px rgba(44, 82, 130, 0.08);
      transform: translateY(-1px);
    }

    h3 {
      color: #2c5282;
      font-size: 15px;
      margin: 0 0 8px 0;
      font-weight: 500;
      font-family: 'HeliosCondC' !important;
    }

    p {
      margin: 4px 0;
      font-size: 13px;
      color: #4a5568;
      font-family: 'HeliosCondC' !important;
    }
  }

  .no-protocols {
    text-align: center;
    padding: 24px;
    background: #f8f9fa;
    border-radius: 8px;
    color: #666;
    font-size: 13px;
    font-family: 'HeliosCondC' !important;
  }
`;

export default ProtocolsPageWrapper;
