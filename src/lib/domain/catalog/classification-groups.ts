export interface CatalogClassificationRow {
	label: string;
	labelDescription?: string | null;
	value: string;
}

export interface CatalogClassificationGroup {
	label: string;
	rows: CatalogClassificationRow[];
}

export function catalogClassificationGroupsSearchText(groups: readonly CatalogClassificationGroup[]): string {
	return groups
		.flatMap((group) => [group.label, ...group.rows.flatMap((row) => [row.label, row.labelDescription ?? '', row.value])])
		.filter(Boolean)
		.join(' ');
}
