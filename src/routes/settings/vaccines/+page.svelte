<script lang="ts">
	import { onMount } from 'svelte';
	import type { VaccinePreset } from '$lib/domain/vaccine/vaccine.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import { loadUsedPresetIds, loadVaccinePresets, removePreset, savePreset } from '$lib/services/vaccine.service.js';
	import Plus from '@lucide/svelte/icons/plus';
	import Save from '@lucide/svelte/icons/save';
	import Syringe from '@lucide/svelte/icons/syringe';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let presets = $state<VaccinePreset[]>([]);
	let newName = $state('');
	let newValidityMonths = $state(12);
	let loading = $state(true);
	let saving = $state(false);
	let usedPresetIds = $state<Set<number>>(new Set());
	let statusKey = $state<TranslationKey | null>(null);
	let errorKey = $state<TranslationKey | null>(null);

	function isPresetInUse(presetId: number): boolean {
		return usedPresetIds.has(presetId);
	}

	function upsertPreset(preset: VaccinePreset) {
		const next = presets.filter((item) => item.id !== preset.id && item.normalizedName !== preset.normalizedName);
		presets = [...next, preset].sort((first, second) => first.name.localeCompare(second.name));
	}

	function setFailure(exception: unknown) {
		errorKey = exception instanceof Error && exception.message === 'vaccine_validity_required' ? 'vaccine.validityRequired' : 'vaccine.saveFailed';
	}

	async function load() {
		loading = true;
		errorKey = null;

		try {
			const [loadedPresets, loadedUsedIds] = await Promise.all([loadVaccinePresets(), loadUsedPresetIds()]);
			presets = loadedPresets;
			usedPresetIds = new Set(loadedUsedIds);
		} catch (exception) {
			errorKey = exception instanceof Error && exception.message === 'vaccine_preset_in_use' ? 'vaccine.presetInUse' : 'vaccine.saveFailed';
		} finally {
			loading = false;
		}
	}

	async function submitNew(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const preset = await savePreset({ name: newName, validityMonths: Number(newValidityMonths) });
			upsertPreset(preset);
			newName = '';
			newValidityMonths = 12;
			statusKey = 'vaccine.presetSaved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function submitExisting(event: SubmitEvent, preset: VaccinePreset) {
		event.preventDefault();
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await savePreset({ name: preset.name, validityMonths: Number(preset.validityMonths) }, preset.id);
			upsertPreset(saved);
			statusKey = 'vaccine.presetSaved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function deletePreset(preset: VaccinePreset) {
		if (isPresetInUse(preset.id)) {
			errorKey = 'vaccine.presetInUse';
			statusKey = null;
			return;
		}

		if (!window.confirm(t('vaccine.presetDeleteConfirm'))) return;
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			await removePreset(preset.id);
			presets = presets.filter((item) => item.id !== preset.id);
			usedPresetIds = new Set([...usedPresetIds].filter((presetId) => presetId !== preset.id));
			statusKey = 'status.deleted';
		} catch (exception) {
			errorKey = exception instanceof Error && exception.message === 'vaccine_preset_in_use' ? 'vaccine.presetInUse' : 'vaccine.saveFailed';
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>{t('settings.vaccines.title')} · {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
	<header class="border-b border-border pb-5">
		<p class="text-sm font-medium text-muted-foreground">{t('settings.title')}</p>
		<h2 class="mt-1 text-2xl font-semibold sm:text-3xl">{t('settings.vaccines.title')}</h2>
		<p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('settings.vaccines.description')}</p>
	</header>

	{#if errorKey}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{t(errorKey)}</p>
	{/if}

	{#if statusKey}
		<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)}</p>
	{/if}

	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
		<div class="flex items-start gap-3">
			<span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
				<Syringe class="size-5" />
			</span>
			<div class="min-w-0 flex-1">
				<h3 class="text-base font-semibold">{t('vaccine.newPresetTitle')}</h3>
				<form class="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto] md:items-end" onsubmit={submitNew}>
					<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
						<span>{t('vaccine.name')}</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={newName} required />
					</label>
					<label class="flex flex-col gap-1 text-sm font-medium">
						<span>{t('vaccine.validityMonths')}</span>
						<input type="number" min="1" class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={newValidityMonths} />
					</label>
					<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
						<Plus class="size-4" />
						{t('vaccine.savePreset')}
					</button>
				</form>
			</div>
		</div>
	</section>

	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
		<h3 class="text-base font-semibold">{t('vaccine.presetsTitle')}</h3>
		<div class="mt-4 flex flex-col gap-3">
			{#if loading}
				<div class="h-28 animate-pulse rounded-md bg-muted"></div>
			{:else}
				{#each presets as preset (preset.id)}
					<form class="grid gap-3 rounded-md border border-border bg-background p-3 md:grid-cols-[minmax(0,1fr)_12rem_auto_auto] md:items-end" onsubmit={(event) => submitExisting(event, preset)}>
						<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<span>{t('vaccine.name')}</span>
							<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={preset.name} required />
						</label>
						<label class="flex flex-col gap-1 text-sm font-medium">
							<span>{t('vaccine.validityMonths')}</span>
							<input type="number" min="1" class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={preset.validityMonths} />
						</label>
						<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving}>
							<Save class="size-4" />
							{t('actions.save')}
						</button>
						<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-background px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={saving || isPresetInUse(preset.id)} title={isPresetInUse(preset.id) ? t('vaccine.presetInUse') : t('actions.delete')} onclick={() => void deletePreset(preset)}>
							<Trash2 class="size-4" />
							{t('actions.delete')}
						</button>
					</form>
				{:else}
					<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('vaccine.emptyPresets')}</p>
				{/each}
			{/if}
		</div>
	</section>
</section>