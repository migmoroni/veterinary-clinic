<script lang="ts">
	import type { EChartsCoreOption } from 'echarts/core';
	import type { AnalyticsBarChartModel, AnalyticsChartDatum, AnalyticsChartTone } from '@vet/types/domain/analytics/charts.js';
	import { cn } from '@vet/ui/utils.js';
	import EChart from './EChart.svelte';

	let {
		model,
		emptyLabel,
		tone = 'info',
		dynamicHeight = false,
		minHeight = 256,
		rowHeight = 30,
		labelWidth = 120,
		class: className = '',
		ariaLabel
	}: {
		model: AnalyticsBarChartModel;
		emptyLabel: string;
		tone?: AnalyticsChartTone;
		dynamicHeight?: boolean;
		minHeight?: number;
		rowHeight?: number;
		labelWidth?: number;
		class?: string;
		ariaLabel?: string;
	} = $props();

	const hasData = $derived(model.data.some((item) => item.value > 0));
	const chartHeight = $derived(dynamicHeight ? Math.max(minHeight, model.data.length * rowHeight + 48) : null);
	const chartStyle = $derived(chartHeight ? `height: ${chartHeight}px` : undefined);
	const option = $derived(buildOption(model.data, tone, labelWidth));

	function toneColor(tone: AnalyticsChartTone | undefined): string {
		if (tone === 'success') return '#059669';
		if (tone === 'info') return '#0284c7';
		if (tone === 'warning') return '#d97706';
		if (tone === 'danger') return '#dc2626';
		return '#64748b';
	}

	function buildOption(data: AnalyticsChartDatum[], chartTone: AnalyticsChartTone, yAxisLabelWidth: number): EChartsCoreOption {
		return {
			animationDuration: 220,
			grid: { left: 8, right: 42, top: 8, bottom: 8, containLabel: true },
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'shadow' }
			},
			xAxis: {
				type: 'value',
				axisLabel: { color: '#64748b' },
				splitLine: { lineStyle: { color: '#e2e8f0' } }
			},
			yAxis: {
				type: 'category',
				inverse: true,
				data: data.map((item) => item.label),
				axisTick: { show: false },
				axisLine: { show: false },
				axisLabel: { color: '#334155', interval: 0, overflow: 'truncate', width: yAxisLabelWidth }
			},
			series: [
				{
					type: 'bar',
					barMaxWidth: 18,
					data: data.map((item) => ({
						value: item.value,
						itemStyle: { color: toneColor(item.tone ?? chartTone), borderRadius: [0, 4, 4, 0] }
					})),
					label: { show: true, position: 'right', color: '#334155', fontWeight: 600 }
				}
			]
		};
	}
</script>

{#if hasData}
	<EChart option={option} class={cn('h-64', className)} style={chartStyle} {ariaLabel} />
{:else}
	<div class={cn('flex min-h-64 items-center justify-center rounded-md border border-dashed border-border px-4 text-center text-sm text-muted-foreground', className)}>
		{emptyLabel}
	</div>
{/if}
