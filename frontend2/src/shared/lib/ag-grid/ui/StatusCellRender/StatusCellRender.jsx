import React from "react";

import { Tick } from "../../../../assets/svg";
import StatusCellRenderWrapper from "./StatusCellRenderWrapper";

export const StatusCellRenderer = ({
  value,
}) => {
  const title = value ? "Имеется" : "Отсутствует";
  return (
    <StatusCellRenderWrapper>
      <div className={`tag ${value + "Tag"}`}>
        {value && <img className="tick" src={Tick} alt="tick" />}
        <span>{title}</span>
      </div>
    </StatusCellRenderWrapper>
  );
};
