import { 
  format, 
  addDays as dateFnsAddDays, 
  endOfWeek as dateFnsEndOfWeek, 
  endOfMonth as dateFnsEndOfMonth, 
  nextSaturday, 
  isSaturday, 
  isSunday, 
  parseISO,
  isBefore,
  isAfter,
  isSameDay,
  startOfDay,
  startOfWeek as dateFnsStartOfWeek
} from 'date-fns';

export function formatDateToYYYYMMDD(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getToday(): string {
  return formatDateToYYYYMMDD(new Date());
}

export function getTomorrow(): string {
  return formatDateToYYYYMMDD(dateFnsAddDays(new Date(), 1));
}

export function getUpcomingWeekend(): string {
  const now = new Date();
  if (isSaturday(now) || isSunday(now)) {
    return formatDateToYYYYMMDD(now);
  }
  return formatDateToYYYYMMDD(nextSaturday(now));
}

export function addDays(dateStr: string, days: number): string {
  const date = parseISO(dateStr);
  return formatDateToYYYYMMDD(dateFnsAddDays(date, days));
}

export function getMonthEnd(): string {
  return formatDateToYYYYMMDD(dateFnsEndOfMonth(new Date()));
}

export function getWeekEnd(): string {
  return formatDateToYYYYMMDD(dateFnsEndOfWeek(new Date(), { weekStartsOn: 1 }));
}

export function getWeekStart(): string {
  return formatDateToYYYYMMDD(dateFnsStartOfWeek(new Date(), { weekStartsOn: 1 }));
}

export function classifyDate(dueDate: string): 'OVERDUE' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LATER' {
  const todayStr = getToday();
  if (dueDate < todayStr) return 'OVERDUE';
  if (dueDate === todayStr) return 'TODAY';
  
  const weekEndStr = getWeekEnd();
  if (dueDate <= weekEndStr) return 'THIS_WEEK';
  
  const monthEndStr = getMonthEnd();
  if (dueDate <= monthEndStr) return 'THIS_MONTH';
  
  return 'LATER';
}

export function getShortcutDate(shortcut: string): string {
  const today = getToday();
  switch (shortcut) {
    case 'today':
      return today;
    case 'tomorrow':
      return getTomorrow();
    case 'weekend':
      return getUpcomingWeekend();
    case '+7':
      return addDays(today, 7);
    case 'month':
      return getMonthEnd();
    case '+30':
      return addDays(today, 30);
    default:
      if (/^\d{4}-\d{2}-\d{2}$/.test(shortcut)) {
        return shortcut;
      }
      return today;
  }
}
