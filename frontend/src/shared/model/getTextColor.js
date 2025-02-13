import convert from 'color-convert';

export const getTextColor = backgroundColor => {
  if (backgroundColor === 'rgba(0,0,0,0)') return '#000';
  const backgroundLightness = convert.hex.hsl(backgroundColor)[2];

  const textColor = backgroundLightness <= 50 ? '#fff' : '#000';
  return textColor;
};
