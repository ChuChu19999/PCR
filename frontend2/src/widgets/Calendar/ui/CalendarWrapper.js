import styled from "styled-components";

import { colors } from "../../../shared/assets/colors";

export const CalendarWrapper = styled.div.withConfig({
  shouldForwardProp: (prop) => !["themelocal"].includes(prop),
})`
  font-family: "HeliosCondC";

  margin: 0 20px 20px 20px;

  --fc-small-font-size: 0.85em;
  --fc-table-font-size: 0.93em;

  --fc-page-bg-color: #fff;
  --fc-neutral-bg-color: rgba(208, 208, 208, 0.3);
  --fc-neutral-text-color: #808080;
  --fc-border-color: #d9d9d9;

  --fc-button-text-color: ${(p) => colors[p.themelocal].color_text};
  --fc-button-bg-color: none;
  --fc-button-border-color: rgba(0, 66, 105, 0.28);
  --fc-button-hover-bg-color: ${(p) =>
    colors[p.themelocal].color_light_blue_20};
  --fc-button-hover-border-color: #ffffff;
  --fc-button-active-bg-color: ${(p) =>
    colors[p.themelocal].color_bright_blue_50};
  --fc-button-active-border-color: rgba(0, 66, 105, 0.28);

  --fc-event-bg-color: --fc-non-business-color;
  --fc-event-border-color: none;
  --fc-event-text-color: ${(p) => colors[p.themelocal].color_text};
  --fc-event-selected-overlay-color: rgba(0, 0, 0, 0.25);

  --fc-more-link-bg-color: #d0d0d0;
  --fc-more-link-text-color: inherit;

  --fc-event-resizer-thickness: 8px;
  --fc-event-resizer-dot-total-width: 8px;
  --fc-event-resizer-dot-border-width: 1px;

  --fc-non-business-color: rgba(211, 235, 248, 0.3);
  --fc-bg-event-color: rgb(143, 223, 130);
  --fc-bg-event-opacity: 0.3;
  --fc-highlight-color: rgba(188, 232, 241, 0.3);
  --fc-today-bg-color: #0071b226;
  --fc-now-indicator-color: red;

  label {
    font-family: "HeliosCondC";
  }

  .fc {
    table {
      font-size: var(--fc-table-font-size);
    }
  }

  .fc-toolbar-chunk {
    display: flex;
  }

  .fc-event-time {
    overflow: visible;
  }

  a {
    color: ${(p) => colors[p.themelocal].color_text};
  }

  .fc-button-active {
    color: ${(p) => colors[p.themelocal].color_main_white_0} !important;

    &:active,
    &:focus,
    &:focus-visible {
      box-shadow: none !important;
      outline: none !important;
    }
  }

  .fc-button-primary {
    &:active,
    &:focus,
    &:focus-visible {
      box-shadow: none !important;
      outline: none !important;
    }
  }

  .fc-day-other {
    background-color: rgba(0, 32, 51, 0.08);

    a {
      color: rgba(0, 32, 51, 0.8);
    }
  }

  .fc-toolbar-title {
    color: black;
    font-size: 20px;
    margin-right: 5px;
  }

  .fc-timegrid-slot {
    color: var(--fc-event-text-color);
  }

  .fc-button {
    font-size: var(--fc-small-font-size);

    &:active,
    &:focus,
    &:focus-visible {
      box-shadow: none !important;
      outline: none !important;
    }
  }

  .fc-multimonth-title {
    color: ${colors["light"].color_text};
  }

  .fc-button-group {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    color: black;
    border-radius: 4px;

    &-3 {
      height: 35px;
      display: flex;
      flex-direction: row;
      gap: 5px;
      justify-content: center;
      align-items: center;

      &-item {
        font-size: 14px;
        padding: 7px;
        box-shadow:
          0 0.5px 0.5px 0 rgba(60, 54, 67, 0.2),
          0 1px 1px 1px rgba(60, 64, 67, 0.1);
      }
    }
  }

  .fc-addEventButton-button {
    height: 35px;
    padding: 0 10px;

    border-radius: 50px;

    box-shadow:
      0 1px 2px 0 rgba(60, 64, 67, 0.3),
      0 1px 3px 1px rgba(60, 64, 67, 0.15);
  }

  .button {
    color: black;

    &:focus,
    &:focus-visible {
      outline: none;
    }

    &:hover {
      background-color: #f9f9f9;
    }

    &:active {
      background-color: #f1f1f1;
    }
  }

  &-add {
    height: 35px;
    padding: 10px;

    border-radius: 50px;

    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 5px;

    box-shadow:
      0 1px 2px 0 rgba(60, 64, 67, 0.3),
      0 1px 3px 1px rgba(60, 64, 67, 0.15);

    font-size: 14px;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 15px;

    font-family: "HeliosCondC";

    &-item {
      margin-bottom: 0px;
    }

    &-color {
      flex-direction: row;
      padding: 20px 0px;
    }

    padding: 20px 0px;
  }

  .display-none {
    display: none;
  }

  .fc-popover-title {
    color: black;
  }

  @media (max-width: 880px) {
    .fc-toolbar {
      flex-direction: column;
      gap: 15px;
    }
  }
`;
