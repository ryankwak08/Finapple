const SEOUL_TIME_ZONE = 'Asia/Seoul';
const WEEKDAY_TO_INDEX = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getSeoulDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SEOUL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    dateString: `${values.year}-${values.month}-${values.day}`,
    weekdayIndex: WEEKDAY_TO_INDEX[values.weekday] ?? 0,
  };
}

function shiftDateString(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return shifted.toISOString().slice(0, 10);
}

function formatSeasonLabel(startDate, endDate) {
  return `${startDate.slice(5).replace('-', '.')} - ${endDate.slice(5).replace('-', '.')}`;
}

export function getCurrentSeasonMeta(date = new Date()) {
  const { dateString, weekdayIndex } = getSeoulDateParts(date);
  const mondayOffset = weekdayIndex === 0 ? -6 : 1 - weekdayIndex;
  const startDate = shiftDateString(dateString, mondayOffset);
  const endDate = shiftDateString(startDate, 6);

  return {
    seasonKey: `week:${startDate}`,
    startDate,
    endDate,
    label: formatSeasonLabel(startDate, endDate),
  };
}

export function getPreviousSeasonMeta(date = new Date()) {
  const currentSeason = getCurrentSeasonMeta(date);
  const previousSeasonDate = new Date(`${currentSeason.startDate}T12:00:00+09:00`);
  previousSeasonDate.setUTCDate(previousSeasonDate.getUTCDate() - 1);
  return getCurrentSeasonMeta(previousSeasonDate);
}

export function getSeasonProgressMeta(date = new Date()) {
  const season = getCurrentSeasonMeta(date);
  const { weekdayIndex } = getSeoulDateParts(date);
  const currentDayIndex = weekdayIndex === 0 ? 6 : weekdayIndex - 1;
  const dayLabels = ['월', '화', '수', '목', '금', '토', '일'];

  return {
    ...season,
    currentDayIndex,
    progressPercent: ((currentDayIndex + 1) / 7) * 100,
    dayLabels,
  };
}
