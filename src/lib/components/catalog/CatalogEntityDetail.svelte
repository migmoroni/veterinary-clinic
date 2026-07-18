<script lang="ts" module>
	import type { Component } from 'svelte';
	import type { TranslationKey } from '$lib/i18n/index.js';

	export interface CatalogEntityDetailField {
		label: string;
		labelDescription?: string | null;
		value?: string | null;
		items?: CatalogEntityDetailFieldItem[];
		rows?: CatalogEntityDetailFieldRow[];
		rowGroups?: CatalogEntityDetailFieldRowGroup[];
		tables?: CatalogEntityDetailFieldTable[];
		fullWidth?: boolean;
	}

	export interface CatalogEntityDetailFieldTable {
		label?: string | null;
		columns: string[];
		rows: CatalogEntityDetailFieldTableRow[];
	}

	export interface CatalogEntityDetailFieldTableRow {
		cells: CatalogEntityDetailFieldTableCell[];
	}

	export interface CatalogEntityDetailFieldTableCell {
		value: string;
		href?: string | null;
	}

	export interface CatalogEntityDetailFieldRowGroup {
		label: string;
		rows: CatalogEntityDetailFieldRow[];
	}

	export interface CatalogEntityDetailFieldRow {
		label: string;
		labelDescription?: string | null;
		value: string;
	}

	export interface CatalogEntityDetailFieldItem {
		label: string;
		href?: string | null;
	}

	export interface CatalogEntityDetailSection<TSectionId extends string = string> {
		id: TSectionId;
		labelKey: TranslationKey;
		icon: Component;
	}
</script>

<script lang="ts">
	import BinaryImage from '$lib/components/shared/BinaryImage.svelte';
	import { t } from '$lib/i18n/index.js';
	import ImageIcon from '@lucide/svelte/icons/image';
	import type { Snippet } from 'svelte';

	let {
		title,
		subtitle = null,
		subtitleContent,
		imageBytes = null,
		imageAlt = '',
		fallbackIcon = ImageIcon,
		fields = [],
		sections,
		sectionTexts,
		sectionFields = {},
		sectionsLabelKey = 'catalog.sectionsLabel'
	}: {
		title: string;
		subtitle?: string | null;
		subtitleContent?: Snippet;
		imageBytes?: Uint8Array | null;
		imageAlt?: string;
		fallbackIcon?: Component;
		fields?: CatalogEntityDetailField[];
		sections: CatalogEntityDetailSection[];
		sectionTexts: Record<string, string | undefined>;
		sectionFields?: Record<string, CatalogEntityDetailField[] | undefined>;
		sectionsLabelKey?: TranslationKey;
	} = $props();

	let activeSectionId = $state('');

	const activeSection = $derived(sections.find((section) => section.id === activeSectionId) ?? sections[0]);
	const activeSectionText = $derived(sectionText(activeSection?.id ?? ''));
	const activeSectionFields = $derived(sectionFields[activeSection?.id ?? ''] ?? []);

	function sectionText(sectionId: string): string {
		return sectionTexts[sectionId]?.trim() ?? '';
	}

	function hasSectionText(sectionId: string): boolean {
		return sectionText(sectionId).length > 0;
	}

	function hasSectionFields(sectionId: string): boolean {
		return (sectionFields[sectionId]?.length ?? 0) > 0;
	}

	function hasSectionContent(sectionId: string): boolean {
		return hasSectionText(sectionId) || hasSectionFields(sectionId);
	}

	function availableSectionIds(): string[] {
		return sections.filter((section) => hasSectionContent(section.id)).map((section) => section.id);
	}

	function sectionParagraphs(text: string): string[] {
		return text
			.split(/\n+/)
			.map((paragraph) => paragraph.trim())
			.filter(Boolean);
	}

	$effect(() => {
		const available = availableSectionIds();
		if (available.length > 0 && !available.includes(activeSectionId)) activeSectionId = available[0];
		if (available.length === 0 && sections[0] && activeSectionId !== sections[0].id) activeSectionId = sections[0].id;
	});
</script>

<section class="grid gap-5 rounded-md border border-border bg-card p-3 shadow-sm sm:p-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
	<aside class="min-w-0 space-y-4">
		<BinaryImage imageBytes={imageBytes} alt={imageAlt} className="aspect-16/10 w-full bg-muted/60" imageClass="h-full w-full object-contain p-4" iconClass="size-12 text-primary" {fallbackIcon} />

		<nav class="overflow-hidden rounded-md border border-border bg-background" aria-label={t(sectionsLabelKey)}>
			{#each sections as section}
				{@const hasText = hasSectionContent(section.id)}
				<button
					type="button"
					class="flex min-h-12 w-full items-center gap-3 border-b border-border px-3 text-left text-sm transition-colors last:border-b-0 {activeSectionId === section.id ? 'bg-primary/10 text-primary' : hasText ? 'hover:bg-accent' : 'text-muted-foreground/60'}"
					disabled={!hasText}
					aria-current={activeSectionId === section.id ? 'page' : undefined}
					onclick={() => (activeSectionId = section.id)}
				>
					<section.icon class="size-4 shrink-0" />
					<span class="wrap-break-word">{t(section.labelKey)}</span>
				</button>
			{/each}
		</nav>
	</aside>

	<article class="min-w-0">
		<header class="border-b border-border pb-4">
			<h3 class="wrap-break-word text-2xl font-semibold">{title}</h3>
			{#if subtitleContent}
				<div class="mt-2 text-sm uppercase tracking-normal text-muted-foreground">
					{@render subtitleContent()}
				</div>
			{:else if subtitle}
				<p class="mt-2 text-sm uppercase tracking-normal text-muted-foreground">{subtitle}</p>
			{/if}

			{#if fields.length > 0}
				<div class="mt-4 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
					{#each fields as field}
						<div class={field.fullWidth ? 'sm:col-span-2' : ''}>
							{#if field.rowGroups?.length}
								<div title={field.labelDescription ?? undefined} class="font-medium text-foreground">
									{field.label}<span class="sr-only">{field.labelDescription ? ` (${field.labelDescription})` : ''}</span>
								</div>
								<div class="mt-2 grid gap-3 md:grid-cols-2">
									{#each field.rowGroups as group}
										<div class="rounded-md border border-border/60 bg-muted/10 px-3 py-2.5">
											<div class="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{group.label}</div>
											<div class="mt-2 grid gap-2">
												{#each group.rows as row}
													<div>
														{#if row.label}
															<div class="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground" title={row.labelDescription ?? undefined}>
																{row.label}<span class="sr-only">{row.labelDescription ? ` (${row.labelDescription})` : ''}</span>
															</div>
														{/if}
														<div class={row.label ? 'mt-0.5 text-foreground' : 'text-foreground'}>{row.value || t('common.notInformed')}</div>
													</div>
												{/each}
											</div>
										</div>
									{/each}
								</div>
							{:else if field.rows?.length}
								<div title={field.labelDescription ?? undefined} class="font-medium text-foreground">
									{field.label}<span class="sr-only">{field.labelDescription ? ` (${field.labelDescription})` : ''}</span>
								</div>
								<div class="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
									{#each field.rows as row}
										<div class="border-b border-border/50 pb-2">
											<div class="text-xs font-semibold uppercase tracking-normal text-muted-foreground" title={row.labelDescription ?? undefined}>
												{row.label}<span class="sr-only">{row.labelDescription ? ` (${row.labelDescription})` : ''}</span>
											</div>
											<div class="mt-1 text-foreground">{row.value || t('common.notInformed')}</div>
										</div>
									{/each}
								</div>
							{:else}
								<p>
									<span title={field.labelDescription ?? undefined}>
										{field.label}<span class="sr-only">{field.labelDescription ? ` (${field.labelDescription})` : ''}</span>
									</span>:
									<span class="text-foreground">
										{#if field.items?.length}
											{#each field.items as item, index}
												{#if item.href}
													<a class="hover:text-primary hover:underline" href={item.href}>{item.label}</a>
												{:else}
													<span>{item.label}</span>
												{/if}{index + 1 < field.items.length ? ', ' : ''}
											{/each}
										{:else}
											{field.value || t('common.notInformed')}
										{/if}
									</span>
								</p>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</header>

		<section class="pt-5">
			<h4 class="text-xl font-semibold">{activeSection ? t(activeSection.labelKey) : title}</h4>
			{#if activeSectionFields.length > 0}
				<div class="mt-5 grid gap-4">
					{#each activeSectionFields as field}
						<div>
							{#if field.label}
								<div title={field.labelDescription ?? undefined} class="font-medium text-foreground">
									{field.label}<span class="sr-only">{field.labelDescription ? ` (${field.labelDescription})` : ''}</span>
								</div>
							{/if}
							{#if field.rowGroups?.length}
								<div class={field.label ? 'mt-4 grid gap-5' : 'grid gap-5'}>
									{#each field.rowGroups as group}
										<div class="border-b border-border pb-4 last:border-b-0 last:pb-0">
											<div class="text-sm font-semibold text-foreground">{group.label}</div>
											<div class="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
												{#each group.rows as row}
													<div>
														{#if row.label}
															<div class="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground" title={row.labelDescription ?? undefined}>
																{row.label}<span class="sr-only">{row.labelDescription ? ` (${row.labelDescription})` : ''}</span>
															</div>
														{/if}
														<div class={row.label ? 'mt-0.5 text-foreground' : 'text-foreground'}>{row.value || t('common.notInformed')}</div>
													</div>
												{/each}
											</div>
										</div>
									{/each}
								</div>
							{:else if field.rows?.length}
								<div class={field.label ? 'mt-2 grid gap-x-6 gap-y-3 sm:grid-cols-2' : 'grid gap-x-6 gap-y-3 sm:grid-cols-2'}>
									{#each field.rows as row}
										<div class="border-b border-border/50 pb-2">
											<div class="text-xs font-semibold uppercase tracking-normal text-muted-foreground" title={row.labelDescription ?? undefined}>
												{row.label}<span class="sr-only">{row.labelDescription ? ` (${row.labelDescription})` : ''}</span>
											</div>
											<div class="mt-1 text-foreground">{row.value || t('common.notInformed')}</div>
										</div>
									{/each}
								</div>
							{:else if field.tables?.length}
								<div class={field.label ? 'mt-3 grid gap-4' : 'grid gap-4'}>
									{#each field.tables as table}
										<div class="overflow-hidden rounded-md border border-border">
											{#if table.label}
												<div class="border-b border-border bg-muted/30 px-3 py-2 text-sm font-semibold text-foreground">{table.label}</div>
											{/if}
											<div class="overflow-x-auto">
												<table class="w-full min-w-[40rem] text-left text-sm">
													<thead class="bg-muted/40 text-primary">
														<tr>
															{#each table.columns as column}
																<th class="px-3 py-2 text-xs font-semibold uppercase tracking-normal">{column}</th>
															{/each}
														</tr>
													</thead>
													<tbody class="divide-y divide-border/70">
														{#each table.rows as row}
															<tr class="bg-background align-top">
																{#each table.columns as _column, index}
																	{@const cell = row.cells[index]}
																	<td class="px-3 py-3 text-foreground">
																		{#if cell?.href}
																			<a class="font-medium text-primary hover:underline" href={cell.href}>{cell.value || t('common.notInformed')}</a>
																		{:else}
																			<span>{cell?.value || t('common.notInformed')}</span>
																		{/if}
																	</td>
																{/each}
															</tr>
														{/each}
													</tbody>
												</table>
											</div>
										</div>
									{/each}
								</div>
							{:else if field.items?.length}
								<p class={field.label ? 'mt-1 text-foreground' : 'text-foreground'}>
									{#each field.items as item, index}
										{#if item.href}
											<a class="hover:text-primary hover:underline" href={item.href}>{item.label}</a>
										{:else}
											<span>{item.label}</span>
										{/if}{index + 1 < field.items.length ? ', ' : ''}
									{/each}
								</p>
							{:else}
								<p class={field.label ? 'mt-1 text-foreground' : 'text-foreground'}>{field.value || t('common.notInformed')}</p>
							{/if}
						</div>
					{/each}
				</div>
			{:else if activeSectionText}
				<div class="mt-5 space-y-4 text-base leading-7 text-foreground/85">
					{#each sectionParagraphs(activeSectionText) as paragraph}
						<p class="whitespace-pre-line">{paragraph}</p>
					{/each}
				</div>
			{:else}
				<p class="mt-5 rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">{t('formulary.emptySection')}</p>
			{/if}
		</section>
	</article>
</section>
