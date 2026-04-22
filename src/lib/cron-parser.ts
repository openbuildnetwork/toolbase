// src/lib/cron-parser.ts

/**
 * A lightweight parsing utility to convert common English phrases into cron expressions.
 * This handles common use cases to make cron syntax easy for non-developers.
 */
export function parseEnglishToCron(input: string): string | null {
    // 1. Pre-process and normalize
    let normalized = input.toLowerCase().trim();

    // Remove common conversational filler words at the start
    const fillers = [
        /^set a (cron|job|cronjob|task) (for|at|to run )?/,
        /^create a (cron|job|cronjob|task) (for|at|to run )?/,
        /^run (a |this )?(cron|job|cronjob|task )?/,
        /^schedule (a |this )?(cron|job|cronjob|task )?(for|at|to run )?/,
        /^please /,
        /^i want to /
    ];

    fillers.forEach(filler => {
        normalized = normalized.replace(filler, '');
    });

    // Normalize aliases
    normalized = normalized.replace(/\bdaily\b/g, 'every day');
    normalized = normalized.replace(/\bhourly\b/g, 'every hour');
    normalized = normalized.replace(/\bweekly\b/g, 'every week');
    normalized = normalized.replace(/\bmonthly\b/g, 'every month');
    normalized = normalized.replace(/\byearly\b/g, 'every year');
    normalized = normalized.replace(/\bannually\b/g, 'every year');
    normalized = normalized.trim();

    // 2. Common exact mappings (after normalization)
    const exactMappings: Record<string, string> = {
        'every minute': '* * * * *',
        'every hour': '0 * * * *',
        'every day at midnight': '0 0 * * *',
        'every midnight': '0 0 * * *',
        'midnight': '0 0 * * *',
        'every day at noon': '0 12 * * *',
        'every noon': '0 12 * * *',
        'noon': '0 12 * * *',
        'every sunday': '0 0 * * 0',
        'every monday': '0 0 * * 1',
        'every tuesday': '0 0 * * 2',
        'every wednesday': '0 0 * * 3',
        'every thursday': '0 0 * * 4',
        'every friday': '0 0 * * 5',
        'every saturday': '0 0 * * 6',
        'every weekday': '0 0 * * 1-5',
        'every weekend': '0 0 * * 0,6',
        'every week': '0 0 * * 0', // Default to sunday midnight
        'every month': '0 0 1 * *',
        'every year': '0 0 1 1 *',
    };

    if (exactMappings[normalized]) {
        return exactMappings[normalized];
    }

    // 3. Regex patterns for dynamic mapping

    // "every X minutes" or "every X mins"
    const everyXMinutes = normalized.match(/^(?:every )?(\d+) (?:minutes?|mins?)$/);
    if (everyXMinutes) {
        const mins = parseInt(everyXMinutes[1], 10);
        if (mins > 0 && mins < 60) return `*/${mins} * * * *`;
    }

    // "every X hours" or "every X hrs"
    const everyXHours = normalized.match(/^(?:every )?(\d+) (?:hours?|hrs?)$/);
    if (everyXHours) {
        const hours = parseInt(everyXHours[1], 10);
        if (hours > 0 && hours < 24) return `0 */${hours} * * *`;
    }

    // "every X days"
    const everyXDays = normalized.match(/^(?:every )?(\d+) days?$/);
    if (everyXDays) {
        const days = parseInt(everyXDays[1], 10);
        if (days > 0 && days <= 31) return `0 0 */${days} * *`;
    }

    // "every X months"
    const everyXMonths = normalized.match(/^(?:every )?(\d+) months?$/);
    if (everyXMonths) {
        const months = parseInt(everyXMonths[1], 10);
        if (months > 0 && months <= 12) return `0 0 1 */${months} *`;
    }

    // Extractor for time parts (e.g. "4pm", "16:30", "4:30 pm")
    const extractTime = (timeStr: string) => {
        const timeMatch = timeStr.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
        if (!timeMatch) return null;

        let hour = parseInt(timeMatch[1], 10);
        const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const ampm = timeMatch[3];

        if (ampm === 'pm' && hour < 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;

        if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
            return { hour, minute };
        }
        return null;
    };

    // "[at] [time] [every day]" (e.g. "at 4pm daily", "4pm every day", "every day at 4pm", "at 16:30")
    // Let's strip "every day" and "at" and see if what remains is a valid time
    let timeOnlyStr = normalized.replace(/every day/g, '').replace(/^at /g, '').replace(/ at /g, '').trim();
    const parsedTime = extractTime(timeOnlyStr);
    if (parsedTime) {
        return `${parsedTime.minute} ${parsedTime.hour} * * *`;
    }

    // "[every] [day] at [time]" (e.g. "every monday at 9am", "monday 9am", "on tuesdays at 4pm")
    const dayTimeMatch = normalized.match(/^(?:every |on )?(mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?)(?: at | )(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)$/);
    if (dayTimeMatch) {
        const daysMap: Record<string, string> = {
            sunday: '0', sundays: '0',
            monday: '1', mondays: '1',
            tuesday: '2', tuesdays: '2',
            wednesday: '3', wednesdays: '3',
            thursday: '4', thursdays: '4',
            friday: '5', fridays: '5',
            saturday: '6', saturdays: '6'
        };

        const day = daysMap[dayTimeMatch[1]];
        const pTime = extractTime(dayTimeMatch[2]);

        if (pTime && day) {
            return `${pTime.minute} ${pTime.hour} * * ${day}`;
        }
    }

    // "[time] on [day]" (e.g. "9am on monday")
    const timeDayMatch = normalized.match(/^(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)(?: on | every )(mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?)$/);
    if (timeDayMatch) {
        const daysMap: Record<string, string> = {
            sunday: '0', sundays: '0',
            monday: '1', mondays: '1',
            tuesday: '2', tuesdays: '2',
            wednesday: '3', wednesdays: '3',
            thursday: '4', thursdays: '4',
            friday: '5', fridays: '5',
            saturday: '6', saturdays: '6'
        };

        const pTime = extractTime(timeDayMatch[1]);
        const day = daysMap[timeDayMatch[2]];

        if (pTime && day) {
            return `${pTime.minute} ${pTime.hour} * * ${day}`;
        }
    }

    // Not recognized
    return null;
}

