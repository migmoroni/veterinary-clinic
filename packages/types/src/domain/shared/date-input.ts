const DATE_BR = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})/;

type DateParts = { year: number; month: number; day: number };

function isValidDate(day: string, month: string, year: string): boolean {
	const numericDay = Number(day);
	const numericMonth = Number(month);
	const numericYear = Number(year);
	const date = new Date(numericYear, numericMonth - 1, numericDay);

	return (
		date.getFullYear() === numericYear &&
		date.getMonth() === numericMonth - 1 &&
		date.getDate() === numericDay &&
		numericYear >= 1900 &&
		numericYear <= 2100
	);
}

function parseDateParts(value: string | null | undefined): DateParts | null {
	if (!value) return null;
	const trimmed = value.trim();
	const iso = trimmed.match(DATE_ISO);
	if (iso && isValidDate(iso[3], iso[2], iso[1])) return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };

	const br = trimmed.match(DATE_BR);
	if (br && isValidDate(br[1], br[2], br[3])) return { year: Number(br[3]), month: Number(br[2]), day: Number(br[1]) };

	return null;
}

export function formatDateForInput(value: string | null | undefined): string {
	const parsed = parseDateParts(value);
	return parsed ? `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}` : '';
}

export function formatDateForDisplay(value: string | null | undefined, locale = 'pt-BR'): string {
	if (!value) return '';
	const parsed = parseDateParts(value);
	if (parsed) {
		return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(parsed.year, parsed.month - 1, parsed.day));
	}

	const trimmed = value.trim();
	return trimmed;
}

export function normalizeDateInput(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return '';

	const iso = trimmed.match(DATE_ISO);
	if (iso && isValidDate(iso[3], iso[2], iso[1])) return `${iso[1]}-${iso[2]}-${iso[3]}`;

	const br = trimmed.match(DATE_BR);
	if (br && isValidDate(br[1], br[2], br[3])) return `${br[3]}-${br[2]}-${br[1]}`;

	throw new Error('date_invalid');
}