import { DatePicker, Input } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';

import Modal from './Modal';

// type Props = ModalProps & {
//   event: ModalEventType;
// };

const { RangePicker } = DatePicker;

const ModalEvent = ({ event, editable, deleteTitle, onSave, onDelete, ...props }) => {
  const { eventTitle, eventStart, eventEnd } = event;
  const [allowEdit, setAllowEdit] = useState(false);

  const turnEdit = () => {
    if (!editable) return;

    setAllowEdit(!allowEdit);
  };

  const saveAfterEdit = () => {
    turnEdit();
  };

  const canselEdit = () => {
    turnEdit();
  };

  return (
    <Modal
      showEditButton={!allowEdit}
      editable={editable}
      onEdit={turnEdit}
      deleteTitle={allowEdit ? 'Отмена' : deleteTitle}
      onDelete={allowEdit ? canselEdit : onDelete}
      onSave={allowEdit ? saveAfterEdit : onSave}
      {...props}
    >
      <div className="body-info">
        <p className="body-info-title">Название события:</p>
        {allowEdit ? (
          <Input className="body-info-input" defaultValue={eventTitle} />
        ) : (
          <p className="body-info-text">{eventTitle}</p>
        )}
      </div>

      <div className="body-info">
        <p className="body-info-title">Длительность события:</p>
        <RangePicker
          showTime
          disabled={!allowEdit}
          allowEmpty={false}
          allowClear={allowEdit}
          defaultValue={[dayjs(eventStart), dayjs(eventEnd)]}
          placeholder={['Дата начала', 'Дата конца']}
          className="body-info-range"
        />
      </div>
    </Modal>
  );
};

export default ModalEvent;
