<script lang="ts">
	import { onMount } from 'svelte';
	import type { EChartsCoreOption, EChartsType } from 'echarts/core';
	import { cn } from '@vet/ui/utils.js';

	interface EChartClickEvent {
		data?: unknown;
		dataIndex?: number;
		name?: string;
	}

	let {
		option,
		class: className = '',
		ariaLabel,
		onDataClick,
		activeDataIndex,
		selectionVersion,
		style
	}: {
		option: EChartsCoreOption;
		class?: string;
		ariaLabel?: string;
		onDataClick?: (event: EChartClickEvent) => void;
		activeDataIndex?: number;
		selectionVersion?: number;
		style?: string;
	} = $props();

	let element: HTMLDivElement;
	let chart: EChartsType | null = null;
	let resizeObserver: ResizeObserver | null = null;
	let mounted = false;

	async function loadECharts() {
		const [core, charts, components, renderers] = await Promise.all([import('echarts/core'), import('echarts/charts'), import('echarts/components'), import('echarts/renderers')]);
		core.use([charts.BarChart, charts.LineChart, charts.PieChart, components.GridComponent, components.LegendComponent, components.TitleComponent, components.TooltipComponent, renderers.CanvasRenderer]);
		return core;
	}

	onMount(() => {
		mounted = true;

		void loadECharts().then((echarts) => {
			if (!mounted) return;
			chart = echarts.init(element, null, { renderer: 'canvas', useDirtyRect: true });
			setChartOption();
			syncChartHandlers();
			syncActiveData();

			if (typeof ResizeObserver !== 'undefined') {
				resizeObserver = new ResizeObserver(() => chart?.resize());
				resizeObserver.observe(element);
			}
		});

		return () => {
			mounted = false;
			resizeObserver?.disconnect();
			resizeObserver = null;
			chart?.dispose();
			chart = null;
		};
	});

	$effect(() => {
		if (!chart) return;
		setChartOption();
	});

	$effect(() => {
		syncChartHandlers();
	});

	$effect(() => {
		selectionVersion;
		syncActiveData();
	});

	function setChartOption() {
		if (!chart) return;
		chart.setOption(option, true);
		syncActiveData();
	}

	function syncChartHandlers() {
		if (!chart) return;
		chart.off('click');
		if (onDataClick) chart.on('click', (event: unknown) => onDataClick(event as EChartClickEvent));
	}

	function syncActiveData() {
		if (!chart) return;
		chart.dispatchAction({ type: 'downplay', seriesIndex: 0 });
		if (typeof activeDataIndex === 'number') {
			chart.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: activeDataIndex });
		}
	}
</script>

<div bind:this={element} class={cn('min-h-64 w-full', onDataClick ? 'cursor-pointer' : '', className)} {style} role="img" aria-label={ariaLabel}></div>
