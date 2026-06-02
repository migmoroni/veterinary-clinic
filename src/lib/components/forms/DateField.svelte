<script lang="ts">
	import { onMount } from 'svelte';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronsLeft from '@lucide/svelte/icons/chevrons-left';
	import ChevronsRight from '@lucide/svelte/icons/chevrons-right';
	import X from '@lucide/svelte/icons/x';
	import { formatDateForDisplay } from '$lib/domain/shared/date-input.js';
	import { i18n, t } from '$lib/i18n/index.js';

	type DateParts = { year: number; month: number; day: number };
	type CalendarDay = { key: string; day: number | null; iso: string | null; disabled: boolean };

	let {
		value = $bindable(''),
		min = '1900-01-01',
		max = '2100-12-31',
		ariaLabel = t('common.date'),
		onChange
	}: { value?: string; min?: string; max?: string; ariaLabel?: string; onChange?: (value: string) => void } = $props();

	let root: HTMLDivElement | null = null;
	let panel = $state<HTMLDivElement | null>(null);
	let open = $state(false);
	let viewYear = $state(new Date().getFullYear());
	let viewMonth = $state(new Date().getMonth());

	const weekStart = $derived(i18n.locale === 'en-US' ? 0 : 1);
	const weekdays = $derived(
		Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(i18n.locale, { weekday: 'short' }).format(new Date(2026, 1, 1 + ((weekStart + index) % 7))).replace('.', ''))
	);
	const displayValue = $derived(formatDateForDisplay(value, i18n.locale) || t('common.notInformed'));
	const monthTitle = $derived(new Intl.DateTimeFormat(i18n.locale, { month: 'long' }).format(new Date(viewYear, viewMonth, 1)));
	const minDate = $derived(parseIsoDate(min) ?? { year: 1900, month: 0, day: 1 });
	const maxDate = $derived(parseIsoDate(max) ?? { year: 2100, month: 11, day: 31 });

	function parseIsoDate(input: string): DateParts | null {
		const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (!match) return null;

		const year = Number(match[1]);
		const month = Number(match[2]) - 1;
		const day = Number(match[3]);
		const date = new Date(year, month, day);

		if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
		return { year, month, day };
	}

	function padded(number: number): string {
		return String(number).padStart(2, '0');
	}

	function toIsoDate(year: number, month: number, day: number): string {
		return `${year}-${padded(month + 1)}-${padded(day)}`;
	}

	function getInitialView(): DateParts {
		const selected = parseIsoDate(value);
		if (selected) return selected;

		const today = new Date();
		return { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() };
	}

	function syncView() {
		const initial = getInitialView();
		viewYear = initial.year;
		viewMonth = initial.month;
	}

	function openField() {
		if (!open) syncView();
		open = true;
	}

	function close() {
		open = false;
	}

	function shiftMonth(offset: number) {
		const next = new Date(viewYear, viewMonth + offset, 1);
		viewYear = next.getFullYear();
		viewMonth = next.getMonth();
	}

	function canShiftMonth(offset: number): boolean {
		const target = new Date(viewYear, viewMonth + offset, 1);
		const year = target.getFullYear();
		const month = target.getMonth();
		const start = toIsoDate(year, month, 1);
		const end = toIsoDate(year, month, new Date(year, month + 1, 0).getDate());

		return end >= min && start <= max;
	}

	function clampMonthToRange(year: number, month: number): number {
		if (year === minDate.year && month < minDate.month) return minDate.month;
		if (year === maxDate.year && month > maxDate.month) return maxDate.month;
		return month;
	}

	function shiftYear(offset: number) {
		const nextYear = viewYear + offset;
		viewYear = nextYear;
		viewMonth = clampMonthToRange(nextYear, viewMonth);
	}

	function canShiftYear(offset: number): boolean {
		const nextYear = viewYear + offset;
		const month = clampMonthToRange(nextYear, viewMonth);
		const start = toIsoDate(nextYear, month, 1);
		const end = toIsoDate(nextYear, month, new Date(nextYear, month + 1, 0).getDate());

		return nextYear >= minDate.year && nextYear <= maxDate.year && end >= min && start <= max;
	}

	function calendarDays(): CalendarDay[] {
		const firstWeekday = (new Date(viewYear, viewMonth, 1).getDay() - weekStart + 7) % 7;
		const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
		const days: CalendarDay[] = [];

		for (let index = 0; index < firstWeekday; index += 1) {
			days.push({ key: `blank-${index}`, day: null, iso: null, disabled: true });
		}

		for (let day = 1; day <= daysInMonth; day += 1) {
			const iso = toIsoDate(viewYear, viewMonth, day);
			days.push({ key: iso, day, iso, disabled: iso < min || iso > max });
		}

		return days;
	}

	function selectDate(day: CalendarDay) {
		if (!day.iso || day.disabled) return;
		value = day.iso;
		onChange?.(value);
		close();
	}

	function clearDate() {
		value = '';
		onChange?.(value);
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
</script>

<div class="relative" bind:this={root}>
	<div class="flex h-10 w-full rounded-md border border-input bg-background shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30">
		<button type="button" aria-label={`${ariaLabel}: ${displayValue}`} aria-haspopup="dialog" aria-expanded={open} class="flex min-w-0 flex-1 items-center gap-2 rounded-l-md px-3 text-left text-sm outline-none" onclick={openField}>
			<CalendarDays class="size-4 shrink-0 text-muted-foreground" />
			<span class="truncate {value ? 'text-foreground' : 'text-muted-foreground'}">{displayValue}</span>
		</button>

		{#if value}
			<button type="button" aria-label={t('date.clear')} title={t('date.clear')} class="flex w-9 shrink-0 items-center justify-center rounded-r-md text-muted-foreground hover:bg-accent hover:text-foreground" onclick={clearDate}>
				<X class="size-4" />
			</button>
		{/if}
	</div>

	{#if open}
		<div bind:this={panel} role="dialog" aria-label={t('date.calendar')} class="absolute left-0 top-full z-50 mt-2 w-72 rounded-md border border-border bg-card p-3 shadow-lg">
			<div class="flex items-center justify-between gap-2">
				<button type="button" aria-label={t('date.previousYear')} title={t('date.previousYear')} class="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40" disabled={!canShiftYear(-1)} onclick={() => shiftYear(-1)}>
					<ChevronsLeft class="size-4" />
				</button>

				<p class="min-w-0 truncate text-sm font-semibold">{viewYear}</p>

				<button type="button" aria-label={t('date.nextYear')} title={t('date.nextYear')} class="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40" disabled={!canShiftYear(1)} onclick={() => shiftYear(1)}>
					<ChevronsRight class="size-4" />
				</button>
			</div>

			<div class="mt-2 flex items-center justify-between gap-2">
				<button type="button" aria-label={t('date.previousMonth')} title={t('date.previousMonth')} class="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40" disabled={!canShiftMonth(-1)} onclick={() => shiftMonth(-1)}>
					<ChevronLeft class="size-4" />
				</button>

				<p class="min-w-0 truncate text-sm font-semibold capitalize">{monthTitle}</p>

				<button type="button" aria-label={t('date.nextMonth')} title={t('date.nextMonth')} class="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40" disabled={!canShiftMonth(1)} onclick={() => shiftMonth(1)}>
					<ChevronRight class="size-4" />
				</button>
			</div>

			<div class="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
				{#each weekdays as weekday}
					<span class="flex h-7 items-center justify-center capitalize">{weekday}</span>
				{/each}
			</div>

			<div class="mt-1 grid grid-cols-7 gap-1">
				{#each calendarDays() as day (day.key)}
					{#if day.iso}
						<button type="button" aria-label={formatDateForDisplay(day.iso, i18n.locale)} class="flex h-8 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:text-muted-foreground/40 {day.iso === value ? 'bg-primary text-primary-foreground hover:bg-primary' : 'text-foreground'}" disabled={day.disabled} onclick={() => selectDate(day)}>
							{day.day}
						</button>
					{:else}
						<span class="h-8"></span>
					{/if}
				{/each}
			</div>
		</div>
	{/if}
</div>