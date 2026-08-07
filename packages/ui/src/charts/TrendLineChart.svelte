<script lang="ts">
	import type { EChartsCoreOption } from 'echarts/core';
	import type { AnalyticsChartTone, AnalyticsTrendChartModel } from '@vet/types/domain/analytics/charts.js';
	import { cn } from '@vet/ui/utils.js';
	import EChart from './EChart.svelte';

	let {
		model,
		emptyLabel,
		tone = 'success',
		class: className = '',
		ariaLabel
	}: {
		model: AnalyticsTrendChartModel;
		emptyLabel: string;
		tone?: AnalyticsChartTone;
		class?: string;
		ariaLabel?: string;
	} = $props();

	const hasData = $derived(model.data.some((item) => item.value > 0));
	const option = $derived(buildOption(model, tone));

	function toneColor(value: AnalyticsChartTone): string {
		if (value === 'info') return '#0284c7';
		if (value === 'warning') return '#d97706';
		if (value === 'danger') return '#dc2626';
		if (value === 'neutral') return '#64748b';
		return '#047857';
	}

	function toneAreaColor(value: AnalyticsChartTone): string {
		if (value === 'info') return 'rgba(2, 132, 199, 0.12)';
		if (value === 'warning') return 'rgba(217, 119, 6, 0.14)';
		if (value === 'danger') return 'rgba(220, 38, 38, 0.12)';
		if (value === 'neutral') return 'rgba(100, 116, 139, 0.12)';
		return 'rgba(4, 120, 87, 0.12)';
	}

	function buildOption(chartModel: AnalyticsTrendChartModel, chartTone: AnalyticsChartTone): EChartsCoreOption {
		const color = toneColor(chartTone);
		return {
			animationDuration: 240,
			grid: { left: 12, right: 18, top: 18, bottom: 28, containLabel: true },
			tooltip: { trigger: 'axis' },
			xAxis: {
				type: 'category',
				boundaryGap: false,
				data: chartModel.data.map((point) => point.label),
				axisLabel: { color: '#64748b', hideOverlap: true },
				axisTick: { show: false },
				axisLine: { lineStyle: { color: '#cbd5e1' } }
			},
			yAxis: {
				type: 'value',
				axisLabel: { color: '#64748b' },
				splitLine: { lineStyle: { color: '#e2e8f0' } }
			},
			series: [
				{
					type: 'line',
					smooth: true,
					symbolSize: 7,
					lineStyle: { color, width: 3 },
					itemStyle: { color },
					areaStyle: { color: toneAreaColor(chartTone) },
					data: chartModel.data.map((point) => point.value)
				}
			]
		};
	}
</script>

{#if hasData}
	<EChart option={option} class={cn('h-64', className)} {ariaLabel} />
{:else}
	<div class={cn('flex min-h-64 items-center justify-center rounded-md border border-dashed border-border px-4 text-center text-sm text-muted-foreground', className)}>
		{emptyLabel}
	</div>
{/if}
