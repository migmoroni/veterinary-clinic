<script lang="ts">
	import { textLength } from '@vet/types/domain/shared/field-limits.js';
	import { t } from '@vet/core-local/i18n/index.js';

	let { value = '', max, threshold = 0.85 }: { value?: string | null; max: number; threshold?: number } = $props();

	const count = $derived(textLength(value));
	const visible = $derived(max > 0 && count >= Math.floor(max * threshold));

	function message(): string {
		const key = count >= max ? 'form.limitReached' : 'form.limitCounter';
		return t(key).replace('{count}', String(count)).replace('{max}', String(max));
	}
</script>

{#if visible}
	<span class="shrink-0 text-xs font-medium text-muted-foreground" aria-live="polite">{message()}</span>
{/if}
