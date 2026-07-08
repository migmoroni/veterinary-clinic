<script lang="ts" module>
	import type { Component } from 'svelte';

	export interface ReferenceSummaryFieldRow {
		label: string;
		value: string;
	}

	export interface ReferenceSummaryField {
		label: string;
		value?: string | null;
		icon?: Component;
		rows?: ReferenceSummaryFieldRow[];
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		eyebrow,
		title,
		subtitle = null,
		fields,
		actionHref,
		actionLabel,
		image,
		meta
	}: {
		eyebrow: string;
		title: string;
		subtitle?: string | null;
		fields: ReferenceSummaryField[];
		actionHref: string;
		actionLabel: string;
		image?: Snippet;
		meta?: Snippet;
	} = $props();
</script>

<section class="rounded-md border border-border bg-card shadow-sm">
	{#if image}
		{@render image()}
	{/if}

	<div class="p-3 sm:p-4">
		<p class="text-xs font-medium uppercase text-muted-foreground">{eyebrow}</p>
		<h3 class="mt-1 wrap-break-word text-lg font-semibold">{title}</h3>
		{#if subtitle}
			<p class="mt-1 text-sm text-muted-foreground">{subtitle}</p>
		{/if}

		{#if meta}
			{@render meta()}
		{/if}

		<div class="mt-3 grid gap-2 text-sm">
			{#each fields as field}
				<div class="rounded-md border border-border bg-background p-2.5">
					<div class="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
						{#if field.icon}
							<field.icon class="size-3.5" />
						{/if}
						{field.label}
					</div>

					{#if field.rows?.length}
						<div class="mt-2 grid gap-1.5 text-xs">
							{#each field.rows as row}
								<div class="grid gap-0.5">
									<span class="text-muted-foreground">{row.label}</span>
									<span class="font-medium tabular-nums">{row.value}</span>
								</div>
							{/each}
						</div>
					{:else}
						<p class="mt-1 font-medium">{field.value}</p>
					{/if}
				</div>
			{/each}
		</div>

		<a href={actionHref} class="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95">
			{actionLabel}
		</a>
	</div>
</section>
