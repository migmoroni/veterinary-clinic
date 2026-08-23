<script lang="ts">
	import type { EChartsCoreOption } from 'echarts/core';
	import type { AnalyticsChartDatum, AnalyticsChartTone, AnalyticsDonutChartModel } from '@vet/types/domain/analytics/charts.js';
	import { cn } from '@vet/ui/utils.js';
	import EChart from './EChart.svelte';

	let {
		model,
		emptyLabel,
		selectedKey,
		onSelect,
		formatValue,
		formatPercent,
		class: className = '',
		ariaLabel
	}: {
		model: AnalyticsDonutChartModel;
		emptyLabel: string;
		selectedKey?: string;
		onSelect?: (key: string) => void;
		formatValue?: (value: number) => string;
		formatPercent?: (value: number | undefined) => string;
		class?: string;
		ariaLabel?: string;
	} = $props();

	const hasData = $derived(model.data.some((item) => item.value > 0));
	let activeKey = $state<string | null>(null);
	let selectionRevision = $state(0);
	const activeDataIndex = $derived(model.data.findIndex((item) => item.key === activeKey));
	const option = $derived(buildOption(model, activeKey, selectionRevision));

	function toneColor(tone: AnalyticsChartTone | undefined): string {
		if (tone === 'success') return '#059669';
		if (tone === 'info') return '#0284c7';
		if (tone === 'warning') return '#d97706';
		if (tone === 'danger') return '#dc2626';
		return '#64748b';
	}

	function valueText(value: number): string {
		return formatValue ? formatValue(value) : String(value);
	}

	function percentText(value: number | undefined): string {
		if (formatPercent) return `${formatPercent(value)}%`;
		return `${(value ?? 0).toFixed(1)}%`;
	}

	function chartItemKey(event: { data?: unknown; dataIndex?: number; name?: string }): string | null {
		if (typeof event.dataIndex === 'number') return model.data[event.dataIndex]?.key ?? null;

		if (typeof event.name === 'string') {
			const item = model.data.find((datum) => datum.label === event.name || datum.key === event.name);
			if (item) return item.key;
		}

		const data = event.data;
		if (!data || typeof data !== 'object' || !('id' in data)) return null;
		const id = (data as { id?: unknown }).id;
		return typeof id === 'string' ? id : null;
	}

	function handleDataClick(event: { data?: unknown; dataIndex?: number; name?: string }) {
		const key = chartItemKey(event);
		if (!key) return;
		activeKey = key;
		selectionRevision += 1;
		onSelect?.(key);
	}

	function selectDatum(item: AnalyticsChartDatum) {
		activeKey = item.key;
		selectionRevision += 1;
		onSelect?.(item.key);
	}

	function knownKey(key: string | null | undefined): key is string {
		return !!key && model.data.some((item) => item.key === key);
	}

	function buildOption(chartModel: AnalyticsDonutChartModel, selectedDatumKey: string | null, _selectionRevision: number): EChartsCoreOption {
		return {
			animationDuration: 240,
			stateAnimation: {
				duration: 120,
				easing: 'linear'
			},
			color: chartModel.data.map((item) => toneColor(item.tone)),
			title: {
				text: chartModel.centerValue ?? String(chartModel.total),
				subtext: chartModel.centerLabel,
				left: 'center',
				top: '40%',
				textStyle: { color: '#0f172a', fontSize: 22, fontWeight: 700 },
				subtextStyle: { color: '#64748b', fontSize: 12 }
			},
			tooltip: { trigger: 'item' },
			legend: { show: false },
			series: [
				{
					type: 'pie',
					radius: ['52%', '76%'],
					center: ['50%', '46%'],
					avoidLabelOverlap: true,
					selectedMode: false,
					label: { show: false },
					labelLine: { show: false },
					emphasis: {
						scale: true,
						scaleSize: 9,
						itemStyle: {
							borderColor: '#ffffff',
							borderWidth: 2
						}
					},
					data: chartModel.data.map((item) => ({
						id: item.key,
						name: item.label,
						value: item.value,
						itemStyle: {
							borderColor: '#ffffff',
							borderWidth: 1
						}
					}))
				}
			]
		};
	}

	$effect(() => {
		if (knownKey(selectedKey)) {
			activeKey = selectedKey;
			return;
		}

		if (knownKey(activeKey)) return;
		activeKey = model.data[0]?.key ?? null;
	});
</script>

{#if hasData}
	<div class={cn('grid gap-4 lg:grid-cols-[minmax(14rem,22rem)_minmax(0,1fr)] lg:items-center', className)}>
		<EChart
			option={option}
			class="h-72 min-h-72"
			{ariaLabel}
			onDataClick={onSelect ? handleDataClick : undefined}
			activeDataIndex={activeDataIndex >= 0 ? activeDataIndex : undefined}
			selectionVersion={selectionRevision}
		/>

		<div class="grid gap-2" aria-label={ariaLabel}>
			{#each model.data as item (item.key)}
				{@const active = item.key === activeKey}
				<button
					class={cn(
						'group relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-md border px-3 py-2 pl-4 text-left transition duration-150 ease-out',
						active
							? '-translate-y-0.5 scale-[1.015] border-primary bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30'
							: 'border-border bg-background text-muted-foreground hover:-translate-y-0.5 hover:bg-accent hover:text-foreground hover:shadow-sm'
					)}
					type="button"
					disabled={!onSelect}
					aria-pressed={active}
					aria-current={active ? 'true' : undefined}
					onclick={() => selectDatum(item)}
				>
					{#if active}
						<span class="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary-foreground/80"></span>
					{/if}
					<span class="size-3 rounded-full transition-transform {active ? 'scale-125 ring-2 ring-primary-foreground/45 ring-offset-2 ring-offset-primary' : ''}" style={`background-color: ${toneColor(item.tone)}`}></span>
					<span class="min-w-0 text-sm leading-5 {active ? 'font-semibold' : 'font-medium'}">{item.label}</span>
					<span class="text-right">
						<span class="block text-base font-semibold tabular-nums {active ? 'text-primary-foreground' : 'text-foreground'}">{valueText(item.value)}</span>
						<span class="block text-xs tabular-nums {active ? 'text-primary-foreground/80' : 'text-muted-foreground'}">{percentText(item.percent)}</span>
					</span>
				</button>
			{/each}
		</div>
	</div>
{:else}
	<div class={cn('flex min-h-72 items-center justify-center rounded-md border border-dashed border-border px-4 text-center text-sm text-muted-foreground', className)}>
		{emptyLabel}
	</div>
{/if}
