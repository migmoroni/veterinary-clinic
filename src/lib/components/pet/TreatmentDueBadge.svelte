<script lang="ts">
	import { formatDateForDisplay } from '$lib/domain/shared/date-input.js';
	import type { TreatmentDueStatus, TreatmentKind } from '$lib/domain/treatment/treatment.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';

	const labelKeys = {
		validityIgnored: 'treatment.validityIgnored',
		validityUnknown: 'treatment.validityUnknown',
		expiredOn: 'treatment.expiredOn',
		expiresToday: 'treatment.expiresToday',
		validUntil: 'treatment.validUntil',
		expiresIn: 'treatment.expiresIn'
	} satisfies Record<string, TranslationKey>;

	let { status, className = '' }: { kind: TreatmentKind; status: TreatmentDueStatus; className?: string } = $props();

	const label = $derived.by(() => {
		if (status.validityIgnored) return t(labelKeys.validityIgnored);
		if (!status.dueAt || status.daysUntilDue === null) return t(labelKeys.validityUnknown);

		const formattedDueAt = formatDateForDisplay(status.dueAt, i18n.locale);
		if (status.expired) return `${t(labelKeys.expiredOn)} ${formattedDueAt}`;
		if (status.daysUntilDue === 0) return `${t(labelKeys.expiresToday)} ${formattedDueAt}`;

		const dayKey = status.daysUntilDue === 1 ? 'pet.ageDaySingular' : 'pet.ageDayPlural';
		return `${t(labelKeys.validUntil)} ${formattedDueAt} · ${t(labelKeys.expiresIn)} ${status.daysUntilDue} ${t(dayKey)}`;
	});

	const badgeClass = $derived(
		status.validityIgnored
			? 'border-border bg-muted text-muted-foreground'
			: status.expired
				? 'border-destructive/30 bg-destructive/10 text-destructive'
				: status.daysUntilDue !== null && status.daysUntilDue <= 30
					? 'border-amber-300 bg-amber-50 text-amber-800'
					: 'border-primary/20 bg-primary/10 text-primary'
	);
</script>

<span class={`inline-flex max-w-full items-center rounded-md border px-2 py-1 text-xs font-semibold leading-5 shadow-sm ${badgeClass} ${className}`}>
	<span class="truncate">{label}</span>
</span>
