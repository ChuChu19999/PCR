import React from "react";
import { Tooltip } from "antd";
import { BiQuestionMark } from "react-icons/bi";

// type Props = TooltipProps & {};

const TooltipLocal = ({
  placement,
  trigger,
  children,
  ...props
}) => {
  return (
    <Tooltip
      placement={placement || "right"}
      trigger={trigger || "hover"}
      {...props}
    >
      {children || <BiQuestionMark size={20} />}
    </Tooltip>
  );
};

export { TooltipLocal as Tooltip };
