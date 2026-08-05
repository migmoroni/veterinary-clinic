<script lang="ts" module>
	import type { Component } from "svelte";

	export interface ReferenceSummaryFieldRow {
		label: string;
		labelDescription?: string | null;
		value: string;
	}

	export interface ReferenceSummaryFieldRowGroup {
		label: string;
		rows: ReferenceSummaryFieldRow[];
	}

	export interface ReferenceSummaryField {
		label: string;
		labelDescription?: string | null;
		value?: string | null;
		icon?: Component;
		rows?: ReferenceSummaryFieldRow[];
		rowGroups?: ReferenceSummaryFieldRowGroup[];
		stackedRows?: boolean;
	}
</script>

<script lang="ts">
	import { t } from "@vet/core-local/i18n/index.js";
	import X from "@lucide/svelte/icons/x";
	import type { Snippet } from "svelte";

	let {
		title,
		subtitle = null,
		fields,
		actionHref,
		actionLabel,
		onopen = undefined,
		image,
		meta,
	}: {
		title: string;
		subtitle?: string | null;
		fields: ReferenceSummaryField[];
		actionHref: string;
		actionLabel: string;
		onopen?: () => void;
		image?: Snippet;
		meta?: Snippet;
		ondismiss?: () => void;
	} = $props();
</script>

<section
	class="overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm"
>
	<!-- Header with title + close -->
	<div
		class="flex items-center justify-between border-b border-border/40 px-4 py-2.5"
	>
		<h3 class="text-sm font-semibold">{t("common.details")}</h3>
	</div>

	<!-- Image -->
	{#if image}
		{@render image()}
	{/if}

	<div class="p-3">
		<h4 class="wrap-break-word text-base font-semibold leading-tight">
			{title}
		</h4>
		{#if subtitle}
			<p class="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
		{/if}

		{#if meta}
			<div class="mt-1.5">
				{@render meta()}
			</div>
		{/if}

		<!-- Direct fields -->
		<div class="mt-3 grid gap-1.5">
			{#each fields as field}
				<div
					class="rounded-md border border-border/40 bg-muted/10 px-3 py-2"
				>
					<div
						class="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide"
					>
						{#if field.icon}
							<field.icon
								class="size-3 text-muted-foreground/80"
							/>
						{/if}
						<span title={field.labelDescription ?? undefined}>
							{field.label}<span class="sr-only">{field.labelDescription ? ` (${field.labelDescription})` : ''}</span>
						</span>
					</div>
					<div class="mt-1">
						{#if field.rowGroups?.length}
							<div class="grid gap-2 text-xs">
								{#each field.rowGroups as group}
									<div class="border-b border-border/10 pb-2 last:border-b-0 last:pb-0">
										<div class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{group.label}</div>
										<div class="mt-1 grid gap-1.5">
											{#each group.rows as row}
												<div>
													{#if row.label}
														<div class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80" title={row.labelDescription ?? undefined}>
															{row.label}<span class="sr-only">{row.labelDescription ? ` (${row.labelDescription})` : ''}</span>
														</div>
													{/if}
													<div class="font-semibold text-foreground">{row.value}</div>
												</div>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						{:else if field.rows?.length}
							<div class="grid gap-1.5 text-xs">
								{#each field.rows as row}
									{#if field.stackedRows}
										<div class="border-b border-border/10 pb-1.5 last:border-b-0 last:pb-0">
											<div class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground" title={row.labelDescription ?? undefined}>
												{row.label}<span class="sr-only">{row.labelDescription ? ` (${row.labelDescription})` : ''}</span>
											</div>
											<div class="mt-0.5 font-semibold text-foreground">{row.value}</div>
										</div>
									{:else}
										<div
											class="flex items-baseline justify-between gap-2 border-b border-border/10 pb-1 last:border-b-0 last:pb-0"
										>
											<span class="text-muted-foreground" title={row.labelDescription ?? undefined}>
												{row.label}<span class="sr-only">{row.labelDescription ? ` (${row.labelDescription})` : ''}</span>
											</span>
											<span
												class="font-semibold tabular-nums text-foreground"
												>{row.value}</span
											>
										</div>
									{/if}
								{/each}
							</div>
						{:else}
							<p class="text-sm font-semibold text-foreground">
								{field.value || t("common.notInformed")}
							</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<a
			href={actionHref}
			onclick={() => onopen?.()}
			class="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
		>
			{actionLabel}
		</a>
	</div>
</section>
