import type { TuitionPeriod } from '../types/TuitionPeriod';

export interface PeriodRange {
  periodStart: string;
  periodEnd: string;
  label: string;
  value: string;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function getMonthEnd(date: Date): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1, 0);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] as string;
}

export function calculatePeriodsForEnrollment(
  tuitionPeriod: TuitionPeriod,
  enrollmentDate: string,
  monthsToGenerate: number = 12,
): PeriodRange[] {
  const periods: PeriodRange[] = [];
  const enrollment = new Date(enrollmentDate + 'T00:00:00');
  const today = new Date();

  for (let i = 0; i < monthsToGenerate; i++) {
    let periodStart: Date;
    let periodEnd: Date;

    if (tuitionPeriod.dayOfMonth !== null) {
      // Fixed day of month for everyone (e.g., day 5)
      const year = enrollment.getFullYear();
      const month = enrollment.getMonth() + i;
      periodStart = new Date(year, month, tuitionPeriod.dayOfMonth);
      periodEnd = getMonthEnd(new Date(year, month, tuitionPeriod.dayOfMonth));
    } else {
      // Anniversary of enrollment date
      periodStart = addMonths(enrollment, i);
      periodEnd = getMonthEnd(addMonths(enrollment, i));
    }

    // Only include periods that have started or are current
    if (periodStart <= today) {
      const startStr = periodStart.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }) ?? '';
      const endStr = periodEnd.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }) ?? '';
      periods.push({
        periodStart: formatDate(periodStart),
        periodEnd: formatDate(periodEnd),
        label: `${startStr} - ${endStr}`,
        value: `${formatDate(periodStart)}|${formatDate(periodEnd)}`,
      });
    }
  }

  return periods;
}

export function getCurrentPeriod(
  tuitionPeriod: TuitionPeriod,
  enrollmentDate: string,
): PeriodRange | null {
  const periods = calculatePeriodsForEnrollment(tuitionPeriod, enrollmentDate, 1);
  return periods[0] ?? null;
}

export function formatPeriodLabel(start: string, end: string): string {
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  const startStr = startDate.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }) ?? '';
  const endStr = endDate.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }) ?? '';
  return `${startStr} - ${endStr}`;
}