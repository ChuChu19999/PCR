import { Divider, Form } from 'antd';
import React from 'react';
import { Tooltip } from '../../../../shared/ui/Tooltip/Tooltip';

// type Props = FormItemProps & {
//   title: string;
//   children: React.ReactNode;
//   tooltip?: string;
//   divider?: boolean;
// };

const FormItem = ({ title, divider, tooltip, children, ...formItemProps }) => {
  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(auto, max-content) 1fr',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
          {tooltip && <Tooltip title={tooltip} />}
        </div>

        <Form.Item {...formItemProps} style={{ margin: 0 }}>
          {children}
        </Form.Item>
      </div>

      {divider && <Divider type="horizontal" />}
    </>
  );
};

export default FormItem;
