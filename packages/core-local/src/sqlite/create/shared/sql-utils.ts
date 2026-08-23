export function optionalTextCheck(column: string, maxLength: number): string {
	return `${column} IS NULL OR length(${column}) <= ${maxLength}`;
}

export function requiredTextCheck(column: string, maxLength: number): string {
	return `length(trim(${column})) BETWEEN 1 AND ${maxLength}`;
}

export function uuidV4TextCheck(column: string): string {
	return `length(trim(${column})) = 36 AND substr(lower(trim(${column})), 15, 1) = '4' AND substr(lower(trim(${column})), 20, 1) IN ('8', '9', 'a', 'b')`;
}

export function uuidTextCheck(column: string): string {
	return `length(trim(${column})) = 36 AND substr(trim(${column}), 9, 1) = '-' AND substr(trim(${column}), 14, 1) = '-' AND substr(trim(${column}), 19, 1) = '-' AND substr(trim(${column}), 24, 1) = '-'`;
}

export function quoteIdentifier(identifier: string): string {
	return `"${identifier.replace(/"/g, '""')}"`;
}

export function quoteSqlString(value: string): string {
	return `'${value.replace(/'/g, "''")}'`;
}

export function normalizeCatalogName(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
}

