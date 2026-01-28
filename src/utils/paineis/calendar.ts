import { eachDayOfInterval, isWeekend, format, isSameMonth } from "date-fns";

export function calculateWorkingDays(
    startDate: Date,
    endDate: Date,
    holidays: string[],
    halfDays: string[],
    customWorkDays: string[] // We might not need this if Extra is 0, but passing for completeness
): number {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    let total = 0;

    days.forEach(day => {
        const dateStr = format(day, "yyyy-MM-dd");
        const isWknd = isWeekend(day);
        const isHoliday = holidays.includes(dateStr);
        const isHalf = halfDays.includes(dateStr);
        // const isExtra = customWorkDays.includes(dateStr); // Extra days don't count per user request

        // Logic:
        // 1. If it's a Holiday (Explicit Off) -> 0
        if (isHoliday) {
            return;
        }

        // 2. If it's a Weekend -> 0 (Even if Extra/Work marked, per "extra nao conta")
        if (isWknd) {
            return;
        }

        // 3. If it's a Weekday (Standard)
        if (isHalf) {
            total += 0.5;
        } else {
            total += 1.0;
        }
    });

    return total;
}
