const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface AgeParts {
	years: number;
	months: number;
	days: number;
}

export function nowIso(): string {
	return new Date().toISOString();
}

export function computePurgeAfter(deletedAt: string, retentionDays = 90): string {
	return new Date(new Date(deletedAt).getTime() + retentionDays * DAY_MS).toISOString();
}

function parseIsoDate(value: string): { year: number; month: number; day: number } | null {
	const match = value.match(ISO_DATE);
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(year, month - 1, day);

	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

	return { year, month, day };
}

function daysInMonth(year: number, month: number): number {
	return new Date(year, month, 0).getDate();
}

export function computeAgeFromBirthDate(birthDate: string, now = new Date()): AgeParts | null {
	const birth = parseIsoDate(birthDate);
	if (!birth) return null;

	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const birthAsDate = new Date(birth.year, birth.month - 1, birth.day);
	if (birthAsDate > today) return null;

	const todayYear = today.getFullYear();
	const todayMonth = today.getMonth() + 1;
	const todayDay = today.getDate();

	let years = todayYear - birth.year;
	let months = todayMonth - birth.month;
	let days = todayDay - birth.day;

	let borrowedYear = todayYear;
	let borrowedMonth = todayMonth;

	while (days < 0) {
		months -= 1;
		borrowedMonth -= 1;

		if (borrowedMonth === 0) {
			borrowedMonth = 12;
			borrowedYear -= 1;
		}

		days += daysInMonth(borrowedYear, borrowedMonth);
	}

	while (months < 0) {
		years -= 1;
		months += 12;
	}

	if (years < 0) return null;

	return { years, months, days };
}