import Modal from './Modal';

// type Props = ModalProps & {
//   title: string;
//   description?: string;
// };

const ModalInfo = ({ title, description, ...props }) => (
  <Modal {...props}>
    <div className="body-info">
      <p className="body-info-title">Название:</p>
      <p className="body-info-text">{title}</p>
    </div>

    {description && (
      <div className="body-info">
        <p className="body-info-title">Описание:</p>
        <p className="body-info-text">{description}</p>
      </div>
    )}
  </Modal>
);

export default ModalInfo;
