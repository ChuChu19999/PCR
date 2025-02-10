import { useMemo, useState } from "react";
import ruLocale from "@fullcalendar/core/locales/ru";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import multiMonthPlugin from "@fullcalendar/multimonth";

import { ModalEvent, ModalForm } from "../../../features/Modals";
import { CalendarWrapper } from "./CalendarWrapper";
import { DatePicker, Form, Input } from "antd";
import FullCalendar from "@fullcalendar/react";

import moment from "moment";
import dayjs from "dayjs";
import ColorPicker from "../../../shared/ui/ColorPicker/ColorPicker";
import { defaultColor, noColor } from "../../../shared/constants/presets";
import { getTextColor } from "../../../shared/model/getTextColor";
import { ThemeEnum } from "../../../shared/constants/theme";

const { RangePicker } = DatePicker;

const Calendar = ({ schedule }) => {
  const [isModalEventOpened, setModalEventOpen] = useState(false);
  const [isAddModalOpened, setAddModalOpen] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState(
    {},
  );

  const events = useMemo(
    () =>
      schedule.map((event) => {
        const difference = event.end.getDate() - event.start.getDate();
        const eventColor = difference > 1 ? defaultColor : noColor;
        const backgroundColor = event.color || eventColor;

        return {
          title: event.title,
          start: event.start,
          end: event.end,
          backgroundColor: backgroundColor,
          textColor: getTextColor(backgroundColor),
        };
      }),
    [schedule],
  );

  const onSelectEvent = (arg) => {
    if (isAddModalOpened) {
      return;
    }

    setSelectedEvent({
      eventTitle: arg.event.title,
      eventStart: arg.event.startStr,
      eventEnd: arg.event.endStr,
    });

    const nodeSelectedEvent = document.getElementsByClassName("fc-popover");
    if (nodeSelectedEvent[0]) {
      nodeSelectedEvent[0].classList.add("display-none");
    }

    setModalEventOpen(true);
  };

  const onModalEventClose = () => {
    setModalEventOpen(false);
  };

  const openAddModalWithButton = (event) => {
    if (isModalEventOpened) {
      return;
    }

    console.log(event);
    setSelectedEvent({});
    setAddModalOpen(true);
  };

  const openAddModal = (selectionInfo) => {
    if (isModalEventOpened) {
      return;
    }

    console.log("Slot info", selectionInfo);

    setSelectedEvent({
      eventTitle: "",
      eventEnd: selectionInfo.endStr,
      eventStart: selectionInfo.startStr,
    });
    setAddModalOpen(true);
  };

  const onAddModalClose = () => {
    setAddModalOpen(false);
  };

  const onAddModalSave = () => {
    setAddModalOpen(false);
  };

  const onDeleteModal = () => {
    console.log("delete");
    setModalEventOpen(false);
  };

  const calendarConfig = useMemo(
    () => ({
      customButtons: {
        //Назавания кнопок на панели
        addEventButton: {
          text: "Создать",
          click: openAddModalWithButton,
        },
      },
      buttonText: {
        //Назавания кнопок на панели
        today: "Сегодня",
        week: "Неделя",
        day: "День",
        quarterGrid: "Квартал",
      },
      headerToolbar: {
        //Отрисовка панели над календарём
        left: "title",
        center:
          "multiMonthYear,quarterGrid,dayGridMonth,timeGridWeek,timeGridDay",
        right: "prev,today,next addEventButton",
      },
      views: {
        dayGridMonth: {
          titleFormat: {
            year: "numeric",
            month: "long"
          },
        },
        quarterGrid: {
          type: "multiMonth",
          duration: { months: 3 },
          titleFormat: {
            year: "numeric",
            month: "long"
          },
          visibleRange: (currentDate) => {
            const currentMonth = currentDate.getMonth();

            const quarter = (currentMonth - 1) / 3 + 1;
            const quarterStart = moment().quarter(quarter).startOf("quarter");
            const quarterEnd = moment().quarter(quarter).endOf("quarter");

            return { start: quarterStart.toDate(), end: quarterEnd.toDate() };
          },
        },
      },
      slotLabelFormat: {
        //время для слотов в левой стороне представления по дням/неделям
        hour: "2-digit",
        minute: "2-digit",
        omitZeroMinute: false,
        meridiem: "short",
      },
      businessHours: {
        //Рабочие дни/время
        daysOfWeek: [1, 2, 3, 4, 5],
        startTime: "08:30",
        endTime: "18:00",
      },
      eventTimeFormat: {
        hour: "numeric" ,
        minute: "2-digit",
        meridiem: false,
      },
    }),
    [],
  );

  return (
    <CalendarWrapper themelocal={ThemeEnum.light}>
      {isModalEventOpened && (
        <ModalEvent
          editable
          header="Данные о событии"
          event={selectedEvent}
          onClose={onModalEventClose}
          onDelete={onDeleteModal}
        />
      )}

      {isAddModalOpened && !isModalEventOpened && (
        <ModalForm
          header="Создание события"
          deleteTitle="Отмена"
          onClose={onAddModalClose}
          onSave={onAddModalSave}
          onDelete={onAddModalClose}
        >
          <div className="form">
            <Form.Item
              name="name"
              label="Название события"
              rules={[{ required: true }]}
              className="form-item"
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="duration"
              label="Длительность события"
              rules={[{ required: true }]}
              className="form-item"
              initialValue={[
                dayjs(selectedEvent?.eventStart),
                dayjs(selectedEvent?.eventEnd),
              ]}
            >
              <RangePicker
                showTime
                placeholder={["Выберите дату начала", "Выберите дату конца"]}
              />
            </Form.Item>

            <Form.Item
              layout="horizontal"
              name="color"
              label="Цвет события"
              className="form-item"
            >
              <ColorPicker />
            </Form.Item>
          </div>
        </ModalForm>
      )}

      <FullCalendar
        selectable
        nowIndicator //Отображение красной полосы с текущим временем
        displayEventTime //Отображение времени событий
        editable={false}
        allDaySlot={false} //Убираю строку которая отображает события на весь день
        dayMaxEvents={5}
        height="auto"
        eventDisplay="block"
        initialView="dayGridMonth"
        slotDuration="00:15:00" //Продолжительность ячейки календаря в неделях и днях
        slotMinTime="08:30:00" //Время начала календаря
        slotMaxTime="18:00:00" //Время окончания календаря
        now={new Date()}
        events={events}
        locale={ruLocale}
        plugins={[
          dayGridPlugin,
          timeGridPlugin,
          interactionPlugin,
          multiMonthPlugin,
        ]}
        select={openAddModal}
        eventClick={onSelectEvent}
        {...calendarConfig}
      />
    </CalendarWrapper>
  );
};

export default Calendar;
