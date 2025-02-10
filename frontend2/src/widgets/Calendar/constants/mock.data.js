import { colors } from "../../../shared/assets/colors";

const now = new Date();

export const events = [
  {
    id: 0,
    title: "Собыите на весь день с очень длинным названием",
    allDay: true,
    start: new Date(2024, 3, 0),
    end: new Date(2024, 3, 1),
  },
  {
    id: 1,
    title: "Долгое событие",
    start: new Date(2024, 3, 7),
    end: new Date(2024, 3, 10),
  },

  {
    id: 2,
    title: "Что-то начинается",
    start: new Date(2024, 2, 13, 0, 0, 0),
    end: new Date(2024, 2, 20, 0, 0, 0),
  },

  {
    id: 3,
    title: "Что-то заканчивается",
    start: new Date(2024, 10, 6, 0, 0, 0),
    end: new Date(2024, 10, 8, 0, 0, 0),
  },

  {
    id: 4,
    title: "Просто событие",
    start: new Date(2024, 10, 9, 0, 0, 0),
    end: new Date(2024, 10, 10, 0, 0, 0),
  },
  {
    id: 5,
    title: "Конференция",
    start: new Date(2024, 10, 11),
    end: new Date(2024, 10, 13),
    desc: "Важная конференция для важных людей",
    color: colors["light"].color_bright_orange_50,
  },
  {
    id: 6,
    title: "Встреча",
    start: new Date(2024, 10, 12, 10, 30, 0, 0),
    end: new Date(2024, 10, 12, 12, 30, 0, 0),
    desc: "Встреча для подготовки к другой встрече",
    color: "#a45252",
  },
  {
    id: 7,
    title: "Обед",
    start: new Date(2024, 10, 12, 12, 0, 0, 0),
    end: new Date(2024, 10, 12, 13, 0, 0, 0),
    desc: "Звездная призма, дай мне сил",
  },
  {
    id: 8,
    title: "Встреча",
    start: new Date(2024, 10, 12, 14, 0, 0, 0),
    end: new Date(2024, 10, 12, 15, 0, 0, 0),
  },
  {
    id: 9,
    title: "Нельзя пропустить",
    start: new Date(2024, 10, 12, 17, 0, 0, 0),
    end: new Date(2024, 10, 12, 17, 30, 0, 0),
    desc: "Второй обед или завтрак",
  },
  {
    id: 10,
    title: "Ужин",
    start: new Date(2024, 10, 12, 20, 0, 0, 0),
    end: new Date(2024, 10, 12, 21, 0, 0, 0),
  },
  {
    id: 11,
    title: "Планируем встречу с боссом",
    start: new Date(2024, 3, 13, 8, 0, 0),
    end: new Date(2024, 3, 13, 10, 30, 0),
  },
  {
    id: 11.1,
    title: "Крайне неудобный созвон",
    start: new Date(2024, 3, 13, 9, 30, 0),
    end: new Date(2024, 3, 13, 12, 0, 0),
  },
  {
    id: 11.2,
    title: "Закрываем надоевший проект",
    start: new Date(2024, 3, 13, 11, 30, 0),
    end: new Date(2024, 3, 13, 14, 0, 0),
  },
  {
    id: 11.3,
    title: "Ретро",
    start: new Date(2024, 3, 13, 15, 30, 0),
    end: new Date(2024, 3, 13, 16, 0, 0),
  },
  {
    id: 12,
    title: "Что-то поздно вечером",
    start: new Date(2024, 3, 17, 19, 30, 0),
    end: new Date(2024, 3, 18, 2, 0, 0),
  },
  {
    id: 12.5,
    title: "Что-то еще позже",
    start: new Date(2024, 3, 17, 19, 30, 0),
    end: new Date(2024, 3, 17, 23, 30, 0),
  },
  {
    id: 13,
    title: "Событие на несколько дней",
    start: new Date(2024, 3, 20, 19, 30, 0),
    end: new Date(2024, 3, 22, 2, 0, 0),
  },
  {
    id: 14,
    title: "Сегодня",
    start: new Date(new Date().setHours(new Date().getHours() - 3)),
    end: new Date(new Date().setHours(new Date().getHours() + 3)),
    color: colors["light"].color_bright_orange_50,
  },
  {
    id: 15,
    title: "Вы находитесь здесь",
    start: now,
    end: new Date(new Date().setMinutes(new Date().getMinutes() + 3)),
    color: "#ffd3d3",
  },
  {
    id: 16,
    title: "Записываем видео",
    start: new Date(2024, 3, 14, 15, 30, 0),
    end: new Date(2024, 3, 14, 19, 0, 0),
  },
  {
    id: 17,
    title: "Записываем «В лесу родилась елочка»",
    start: new Date(2024, 3, 14, 16, 30, 0),
    end: new Date(2024, 3, 14, 20, 0, 0),
  },
  {
    id: 18,
    title: "Хэллоуин",
    start: new Date(2024, 3, 14, 16, 30, 0),
    end: new Date(2024, 3, 14, 17, 30, 0),
  },
  {
    id: 19,
    title: "Онлайн-собеседование",
    start: new Date(2024, 3, 14, 17, 30, 0),
    end: new Date(2024, 3, 14, 20, 30, 0),
  },
  {
    id: 20,
    title: "Накладывающееся собыите",
    start: new Date(2024, 3, 14, 17, 0, 0),
    end: new Date(2024, 3, 14, 18, 30, 0),
  },
  {
    id: 21,
    title: "Собеседование по телефону",
    start: new Date(2024, 3, 14, 17, 0, 0),
    end: new Date(2024, 3, 14, 18, 30, 0),
  },
  {
    id: 22,
    title: "Регата",
    start: new Date(2024, 3, 14, 17, 30, 0),
    end: new Date(2024, 3, 14, 19, 0, 0),
  },
  {
    id: 23,
    title: "В спорзал",
    start: new Date(2024, 3, 14, 18, 30, 0),
    end: new Date(2024, 3, 14, 20, 0, 0),
  },

  {
    id: 24,
    title: "Онлайн-собеседование",
    start: new Date(2024, 6, 14, 17, 30, 0),
    end: new Date(2024, 6, 14, 20, 30, 0),
  },
  {
    id: 25,
    title: "Накладывающееся событие",
    start: new Date(2024, 6, 14, 17, 0, 0),
    end: new Date(2024, 6, 14, 18, 30, 0),
  },
  {
    id: 26,
    title: "Собеседование по телефону",
    start: new Date(2024, 7, 14, 17, 0, 0),
    end: new Date(2024, 7, 14, 18, 30, 0),
  },
  {
    id: 27,
    title: "Регата",
    start: new Date(2024, 7, 14, 17, 30, 0),
    end: new Date(2024, 7, 14, 19, 0, 0),
  },
  {
    id: 28,
    title: "В спорзал",
    start: new Date(2024, 5, 14, 18, 30, 0),
    end: new Date(2024, 5, 14, 20, 0, 0),
  },
];

export const backgroundEvent = [
  {
    id: 0,
    title: "Только для пользователей",
    start: new Date(2024, 3, 13, 6),
    end: new Date(2024, 3, 13, 18),
  },
];
