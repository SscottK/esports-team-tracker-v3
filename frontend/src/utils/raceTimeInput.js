const MAX_TIME_DIGITS = 8;

export function formatRaceTimeFromDigits(digits) {
  const normalized = digits.replace(/\D/g, '').slice(0, MAX_TIME_DIGITS);
  if (!normalized) {
    return '';
  }

  const padded = normalized.padStart(6, '0');
  const milliseconds = padded.slice(-3);
  const seconds = padded.slice(-5, -3);
  const minutes = padded.slice(0, -5).replace(/^0+/, '') || '0';

  return `${minutes}:${seconds}.${milliseconds}`;
}

export function digitsFromRaceTimeInput(value) {
  return value.replace(/\D/g, '').slice(0, MAX_TIME_DIGITS);
}

export function isRaceTimeDigitsComplete(digits) {
  return digits.replace(/\D/g, '').length >= 4;
}
