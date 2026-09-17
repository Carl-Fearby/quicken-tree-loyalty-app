export const durations = [30, 45, 60, 75, 90, 105, 120, 150, 180];

export const durationLabel = (minutes: number) =>
  ({
    30: '30 minutes',
    45: '45 minutes',
    60: '1 hour',
    75: '1 hour 15 minutes',
    90: '1 hour 30 minutes',
    105: '1 hour 45 minutes',
    120: '2 hours',
    150: '2 hours 30 minutes',
    180: '3 hours',
  })[minutes] || `${minutes} minutes`;

export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
