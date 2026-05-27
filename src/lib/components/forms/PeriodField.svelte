<script lang="ts">
	import { onMount } from 'svelte';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import X from '@lucide/svelte/icons/x';
	import { t } from '$lib/i18n/index.js';

	type PeriodUnit = 'days' | 'months' | 'years';

	let {
		value = $bindable(1),
		unit = $bindable<PeriodUnit>('months'),
		disabled = false,
		ariaLabel = t('period.label'),
		onChange
	}: { value?: number; unit?: PeriodUnit; disabled?: boolean; ariaLabel?: string; onChange?: (value: number, unit: PeriodUnit) => void } = $props();

	let root: HTMLDivElement | null = null;
	let open = $state(false);

	const numbers = Array.from({ length: 30 }, (_, index) => index + 1);
	const yearNumbers = Array.from({ length: 10 }, (_, index) => index + 1);
	const displayValue = $derived(value > 0 ? periodLabel(value, unit) : t('common.notInformed'));

	function periodLabel(periodValue: number, periodUnit: PeriodUnit): string {
		const unitKey =
			periodUnit === 'days'
				? periodValue === 1
					? 'pet.ageDaySingular'
					: 'pet.ageDayPlural'
				: periodUnit === 'months'
					? periodValue === 1
						? 'pet.ageMonthSingular'
						: 'pet.ageMonthPlural'
					: periodValue === 1
						? 'pet.ageYearSingular'
						: 'pet.ageYearPlural';
		return `${periodValue} ${t(unitKey)}`;
	}

	function toggleOpen() {
		if (disabled) return;
		open = !open;
	}

	function close() {
		open = false;
	}

	function visibleNumbers(periodUnit: PeriodUnit): number[] {
		return periodUnit === 'years' ? yearNumbers : numbers;
	}

	function selectValue(nextValue: number) {
		value = nextValue;
		onChange?.(value, unit);
		close();
	}

	function selectUnit(nextUnit: PeriodUnit) {
		unit = nextUnit;
		if (value <= 0) value = 1;
		if (unit === 'years' && value > yearNumbers.length) value = yearNumbers.length;
		onChange?.(value, unit);
	}

	function clearValue() {
		value = 0;
		onChange?.(value, unit);
		close();
	}

	function closeIfOutside(event: Event) {
		if (event.target instanceof Node && root?.contains(event.target)) return;
		close();
	}

	function closeOnEscape(event: KeyboardEvent) {
		if (event.key === 'Escape') close();
	}

	onMount(() => {
		document.addEventListener('pointerdown', closeIfOutside, true);
		document.addEventListener('focusin', closeIfOutside, true);
		window.addEventListener('keydown', closeOnEscape);

		return () => {
			document.removeEventListener('pointerdown', closeIfOutside, true);
			document.removeEventListener('focusin', closeIfOutside, true);
			window.removeEventListener('keydown', closeOnEscape);
		};
	});
</script>

<div class="relative" bind:this={root}>
	<div class="flex h-10 w-full rounded-md border border-input bg-background shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30 {disabled ? 'opacity-60' : ''}">
		<button type="button" aria-label={`${ariaLabel}: ${displayValue}`} aria-haspopup="dialog" aria-expanded={open} class="flex min-w-0 flex-1 items-center gap-2 rounded-l-md px-3 text-left text-sm outline-none disabled:cursor-not-allowed" {disabled} onclick={toggleOpen}>
			<CalendarClock class="size-4 shrink-0 text-muted-foreground" />
			<span class="truncate {value > 0 ? 'text-foreground' : 'text-muted-foreground'}">{displayValue}</span>
		</button>

		{#if value > 0 && !disabled}
			<button type="button" aria-label={t('period.clear')} title={t('period.clear')} class="flex w-9 shrink-0 items-center justify-center rounded-r-md text-muted-foreground hover:bg-accent hover:text-foreground" onclick={clearValue}>
				<X class="size-4" />
			</button>
		{/if}
	</div>

	{#if open}
		<div role="dialog" aria-label={t('period.dialog')} class="absolute left-0 top-full z-50 mt-2 grid w-80 grid-cols-[minmax(0,1fr)_6rem] gap-3 rounded-md border border-border bg-card p-3 shadow-lg">
			<div class="grid grid-cols-5 gap-1">
				{#each visibleNumbers(unit) as number}
					<button type="button" aria-label={periodLabel(number, unit)} class="flex h-8 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent {number === value ? 'bg-primary text-primary-foreground hover:bg-primary' : 'text-foreground'}" onclick={() => selectValue(number)}>
						{number}
					</button>
				{/each}
			</div>

			<div class="flex flex-col gap-2">
				<button type="button" class="h-10 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent {unit === 'days' ? 'bg-primary text-primary-foreground hover:bg-primary' : 'bg-background'}" aria-pressed={unit === 'days'} onclick={() => selectUnit('days')}>
					{t('period.days')}
				</button>
				<button type="button" class="h-10 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent {unit === 'months' ? 'bg-primary text-primary-foreground hover:bg-primary' : 'bg-background'}" aria-pressed={unit === 'months'} onclick={() => selectUnit('months')}>
					{t('period.months')}
				</button>
				<button type="button" class="h-10 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent {unit === 'years' ? 'bg-primary text-primary-foreground hover:bg-primary' : 'bg-background'}" aria-pressed={unit === 'years'} onclick={() => selectUnit('years')}>
					{t('period.years')}
				</button>
			</div>
		</div>
	{/if}
</div>