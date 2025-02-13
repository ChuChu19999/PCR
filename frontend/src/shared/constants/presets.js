import { colors } from '../assets/colors';

const presets = [
  {
    label: 'Основные события',
    colors: [colors['light'].color_main_blue_50, colors['light'].color_main_grey_50],
  },
  {
    label: 'Важные события',
    colors: [colors['light'].color_bright_blue_50, colors['light'].color_bright_orange_50],
  },
  {
    label: 'Очистить',
    colors: [colors['light'].none],
  },
];

const defaultColor = colors['light'].color_main_blue_50;
const noColor = colors['light'].none;

export { defaultColor, noColor, presets };
