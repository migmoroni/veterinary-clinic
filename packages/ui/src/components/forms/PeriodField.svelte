<script lang="ts">
	import { onMount } from 'svelte';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import X from '@lucide/svelte/icons/x';
	import { t } from '@vet/core-local/i18n/index.js';

	type PeriodUnit = 'days' | 'months' | 'years';

	let {
		value = $bindable(1),
		unit = $bindable<PeriodUnit>('months'),
		disabled = false,
		ariaLabel = t('period.label'),
		onChange
	}: { value?: number; unit?: PeriodUnit; disabled?: boolean; ariaLabel?: string; onChange?: (value: number, unit: PeriodUnit) => void } = $props();

	let root: HTMLDivElement | null = null;
	let panel = $state<HTMLDivElement | null>(null);
	let open = $state(false);
	let manualValue = $state('');

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

	function openField() {
		if (disabled) return;
		open = true;
	}

	function close() {
		open = false;
	}

	function syncManualValue() {
		manualValue = value > 0 ? String(value) : '';
	}

	function applyManualValue(): boolean {
		if (!manualValue) return false;

		const nextValue = Math.trunc(Number(manualValue));
		if (!Number.isFinite(nextValue) || nextValue <= 0) return false;

		value = nextValue;
		onChange?.(value, unit);
		return true;
	}

	function setManualValue(event: Event) {
		manualValue = (event.currentTarget as HTMLInputElement).value;
		applyManualValue();
	}

	function confirmManualValue(event: KeyboardEvent) {
		if (event.key !== 'Enter' || event.isComposing) return;

		event.preventDefault();
		event.stopPropagation();

		if (!applyManualValue()) return;
		syncManualValue();
		close();
	}

	function selectUnit(nextUnit: PeriodUnit) {
		unit = nextUnit;
		if (value <= 0) value = 1;
		syncManualValue();
		onChange?.(value, unit);
	}

	function clearValue() {
		value = 0;
		syncManualValue();
		onChange?.(value, unit);
		close();
	}

	function isInsideElement(element: HTMLElement | null, event: Event): boolean {
		if (!element) return false;
		if (event.composedPath().includes(element)) return true;
		if (event.target instanceof Node && element.contains(event.target)) return true;

		if ('clientX' in event && 'clientY' in event) {
			const rect = element.getBoundingClientRect();
			const clientX = Number(event.clientX);
			const clientY = Number(event.clientY);
			return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
		}

		return false;
	}

	function isInsideField(event: Event): boolean {
		return isInsideElement(root, event) || isInsideElement(panel, event);
	}

	function closeIfOutside(event: Event) {
		if (isInsideField(event)) return;
		close();
	}

	function closeOnEscape(event: KeyboardEvent) {
		if (event.key === 'Escape') close();
	}

	onMount(() => {
		document.addEventListener('pointerdown', closeIfOutside, true);
		window.addEventListener('keydown', closeOnEscape);

		return () => {
			document.removeEventListener('pointerdown', closeIfOutside, true);
			window.removeEventListener('keydown', closeOnEscape);
		};
	});

	$effect(() => {
		if (open) syncManualValue();
	});
</script>

<div class="relative" bind:this={root}>
	<div class="flex h-10 w-full rounded-md border border-input bg-background shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30 {disabled ? 'opacity-60' : ''}">
		<button type="button" aria-label={`${ariaLabel}: ${displayValue}`} aria-haspopup="dialog" aria-expanded={open} class="flex min-w-0 flex-1 items-center gap-2 rounded-l-md px-3 text-left text-sm outline-none disabled:cursor-not-allowed" {disabled} onclick={openField}>
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
		<div bind:this={panel} role="dialog" aria-label={t('period.dialog')} class="absolute left-0 top-full z-50 mt-2 flex w-80 flex-col gap-3 rounded-md border border-border bg-card p-3 shadow-lg">
			<div class="rounded-md border border-border bg-muted/40 p-3">
				<label class="flex min-w-0 flex-col gap-2 text-xs font-medium text-muted-foreground">
					<span>{t('period.customValue')}</span>
					<input type="number" min="1" step="1" inputmode="numeric" class="h-12 rounded-md border border-input bg-background px-3 text-base font-medium text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={manualValue} placeholder={t('period.customValuePlaceholder')} aria-label={t('period.customValue')} oninput={setManualValue} onkeydown={confirmManualValue} />
				</label>
			</div>

			<div class="grid grid-cols-3 gap-2">
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
