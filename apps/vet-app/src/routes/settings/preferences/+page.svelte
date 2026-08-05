<script lang="ts">
	import { onMount } from 'svelte';
	import Select from '@vet/ui/components/ui/Select.svelte';
	import {
		DEFAULT_UI_ZOOM,
		DEFAULT_TYPOGRAPHY_PREFERENCES,
		UI_ZOOM_MAX,
		UI_ZOOM_MIN,
		bundledFontOptions,
		getBundledFontOption,
		getTypographyFontFamily,
		getTypographyUiZoom,
		normalizeTypographyPreferences,
		normalizeUiZoom,
		sanitizeSystemFontDirectory,
		sanitizeSystemFontFamily,
		stepUiZoom,
		uiZoomOptions,
		type BundledFontId,
		type FontSource,
		type TypographyPreferences
	} from '@vet/types/domain/preferences/typography.js';
	import { getLocale, localeOptions, setLocale, t, type Locale, type TranslationKey } from '@vet/core-local/i18n/index.js';
	import { listSystemFonts } from '@vet/core-local/native/system-fonts.js';
	import {
		loadLocalePreference,
		loadTypographyPreference,
		saveLocalePreference,
		saveTypographyPreference,
		TYPOGRAPHY_PREFERENCE_CHANGED_EVENT
	} from '@vet/core-local/services/preferences.service.js';
	import { open } from '@tauri-apps/plugin-dialog';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import FolderPlus from '@lucide/svelte/icons/folder-plus';
	import Languages from '@lucide/svelte/icons/languages';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import TypeIcon from '@lucide/svelte/icons/type';
	import X from '@lucide/svelte/icons/x';

	type ReadingPreferenceKey = 'uppercaseText' | 'highContrast' | 'enhancedFocus' | 'reduceMotion';

	let selectedLocale = $state<Locale>(getLocale());
	let typography = $state<TypographyPreferences>({ ...DEFAULT_TYPOGRAPHY_PREFERENCES });
	let systemFontOptions = $state<string[]>([]);
	let saving = $state(false);
	let loadingSystemFonts = $state(false);
	let statusKey = $state<TranslationKey | null>(null);
	let error = $state<string | null>(null);
	let previewStyle = $derived(`font-family: ${getTypographyFontFamily(typography)};`);
	let currentUiZoom = $derived(getTypographyUiZoom(typography));
	let currentUiZoomPercent = $derived(Math.round(currentUiZoom * 100));
	let activeUiZoomPresetId = $derived(uiZoomOptions.find((option) => option.zoom === currentUiZoom)?.id ?? null);
	let systemFontChoices = $derived.by(() => {
		const values = new Set(systemFontOptions);
		if (typography.systemFontFamily) values.add(typography.systemFontFamily);

		const collator = new Intl.Collator(selectedLocale, {
			usage: 'sort',
			sensitivity: 'base',
			ignorePunctuation: true
		});

		return Array.from(values).sort((left, right) => collator.compare(left, right));
	});

	async function load() {
		try {
			selectedLocale = await loadLocalePreference();
			typography = await loadTypographyPreference();
			if (typography.fontSource === 'system') await loadAvailableSystemFonts(false);
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		}
	}

	async function changeLocale(localeStr: string) {
		const locale = localeStr as Locale;
		selectedLocale = locale;
		setLocale(locale);
		saving = true;
		statusKey = null;
		error = null;

		try {
			await saveLocalePreference(locale);
			statusKey = 'status.preferencesSaved';
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			saving = false;
		}
	}

	async function saveTypography() {
		saving = true;
		statusKey = null;
		error = null;

		try {
			typography = await saveTypographyPreference(typography);
			statusKey = 'status.preferencesSaved';
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			saving = false;
		}
	}

	async function changeUiZoom(value: number) {
		typography.uiZoom = normalizeUiZoom(value);
		await saveTypography();
	}

	async function nudgeUiZoom(step: -1 | 1) {
		await changeUiZoom(stepUiZoom(typography.uiZoom, step));
	}

	async function resetUiZoom() {
		await changeUiZoom(DEFAULT_UI_ZOOM);
	}

	async function changeReadingPreference(key: ReadingPreferenceKey, event: Event) {
		typography[key] = (event.currentTarget as HTMLInputElement).checked;
		await saveTypography();
	}

	async function changeFontSource(fontSource: FontSource) {
		typography.fontSource = fontSource;
		await saveTypography();
		if (fontSource === 'system' && systemFontOptions.length === 0) {
			await loadAvailableSystemFonts();
		}
	}

	async function changeBundledFont(value: string) {
		typography.bundledFont = value as BundledFontId;
		typography.fontSource = 'bundled';
		await saveTypography();
	}

	async function changeSystemFont(value: string) {
		typography.systemFontFamily = sanitizeSystemFontFamily(value);
		typography.fontSource = 'system';
		await saveTypography();
	}

	async function loadAvailableSystemFonts(showStatus = true) {
		loadingSystemFonts = true;
		if (showStatus) statusKey = null;
		error = null;

		try {
			systemFontOptions = await listSystemFonts(
				typography.systemFontDirectory ? [typography.systemFontDirectory] : []
			);
			if (showStatus) {
				statusKey = systemFontOptions.length
					? 'status.systemFontsLoaded'
					: 'status.systemFontsUnavailable';
			}
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			loadingSystemFonts = false;
		}
	}

	async function addSystemFontDirectory() {
		const selected = await open({
			directory: true,
			multiple: false,
			title: t('preferences.systemFontDirectoryDialogTitle')
		});
		const directory = Array.isArray(selected) ? selected[0] : selected;
		if (typeof directory !== 'string' || !directory) return;

		typography.systemFontDirectory = sanitizeSystemFontDirectory(directory);
		typography.fontSource = 'system';
		await saveTypography();
		await loadAvailableSystemFonts();
	}

	async function clearSystemFontDirectory() {
		typography.systemFontDirectory = '';
		await saveTypography();
		await loadAvailableSystemFonts();
	}

	function syncExternalTypographyChange(event: Event) {
		if (!(event instanceof CustomEvent)) return;
		typography = normalizeTypographyPreferences(event.detail);
	}

	onMount(() => {
		void load();
		window.addEventListener(TYPOGRAPHY_PREFERENCE_CHANGED_EVENT, syncExternalTypographyChange);

		return () => {
			window.removeEventListener(TYPOGRAPHY_PREFERENCE_CHANGED_EVENT, syncExternalTypographyChange);
		};
	});
</script>

<svelte:head>
	<title>{t('settings.preferences.title')} · {t('app.name')}</title>
</svelte:head>

<section class="flex w-full flex-col gap-5">
	<header class="border-b border-border pb-5">
		<h2 class="text-2xl font-semibold sm:text-3xl">{t('settings.preferences.title')}</h2>
	</header>

	{#if error}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</p>
	{/if}

	{#if statusKey}
		<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)}</p>
	{/if}

	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
		<div class="flex items-start gap-3">
			<span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
				<Languages class="size-5" />
			</span>
			<div class="min-w-0">
				<h3 class="text-base font-semibold">{t('preferences.languageTitle')}</h3>
				<p class="mt-1 text-sm leading-6 text-muted-foreground">{t('preferences.languageDescription')}</p>
			</div>
		</div>

		<label class="mt-4 flex w-full flex-col gap-1 text-sm font-medium sm:max-w-sm">
			<span>{t('preferences.languageLabel')}</span>
			<Select bind:value={selectedLocale} disabled={saving} options={localeOptions.map((opt) => ({ value: opt.value, label: t(opt.labelKey) }))} onchange={changeLocale} />
		</label>
	</section>

	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
		<div class="flex items-start gap-3">
			<span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
				<TypeIcon class="size-5" />
			</span>
			<div class="min-w-0">
				<h3 class="text-base font-semibold">{t('preferences.typographyTitle')}</h3>
				<p class="mt-1 text-sm leading-6 text-muted-foreground">{t('preferences.typographyDescription')}</p>
			</div>
		</div>

		<div class="mt-5">
			<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
				<div class="min-w-0">
					<p class="text-sm font-medium">{t('preferences.uiZoomLabel')}</p>
					<p class="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{t('preferences.uiZoomDescription')}</p>
				</div>

				<div class="flex shrink-0 items-center gap-2">
					<div class="inline-flex h-10 items-center rounded-md border border-border bg-background p-1 shadow-sm">
						<button
							type="button"
							class="inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
							aria-label={t('preferences.uiZoomDecrease')}
							title={t('preferences.uiZoomDecrease')}
							disabled={saving || currentUiZoom <= UI_ZOOM_MIN}
							onclick={() => void nudgeUiZoom(-1)}
						>
							<Minus class="size-4" />
						</button>
						<output class="w-16 text-center text-sm font-semibold tabular-nums" aria-live="polite">
							{currentUiZoomPercent}%
						</output>
						<button
							type="button"
							class="inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
							aria-label={t('preferences.uiZoomIncrease')}
							title={t('preferences.uiZoomIncrease')}
							disabled={saving || currentUiZoom >= UI_ZOOM_MAX}
							onclick={() => void nudgeUiZoom(1)}
						>
							<Plus class="size-4" />
						</button>
					</div>

					<button
						type="button"
						class="inline-flex size-10 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
						aria-label={t('preferences.uiZoomReset')}
						title={t('preferences.uiZoomReset')}
						disabled={saving || currentUiZoom === DEFAULT_UI_ZOOM}
						onclick={() => void resetUiZoom()}
					>
						<RotateCcw class="size-4" />
					</button>
				</div>
			</div>

			<div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
				{#each uiZoomOptions as option}
					<button
						type="button"
						class="min-h-10 rounded-md border px-3 py-2 text-sm font-medium transition-colors {activeUiZoomPresetId === option.id
							? 'border-primary bg-primary text-primary-foreground'
							: 'border-border bg-background text-foreground hover:bg-accent'}"
						aria-pressed={activeUiZoomPresetId === option.id}
						disabled={saving}
						onclick={() => void changeUiZoom(option.zoom)}
					>
						{t(option.labelKey)}
					</button>
				{/each}
			</div>
		</div>

		<div class="mt-6 border-t border-border pt-5">
			<p class="text-sm font-medium">{t('preferences.fontTitle')}</p>
			<p class="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{t('preferences.fontDescription')}</p>

			<fieldset class="mt-4 min-w-0">
				<legend class="text-sm font-medium">{t('preferences.fontSourceLabel')}</legend>
				<div class="mt-2 grid gap-2 sm:grid-cols-2">
					<label class="flex min-h-11 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
						<input
							type="radio"
							name="font-source"
							checked={typography.fontSource === 'bundled'}
							disabled={saving}
							onchange={() => void changeFontSource('bundled')}
						/>
						<span class="leading-5">{t('preferences.fontSourceBundled')}</span>
					</label>
					<label class="flex min-h-11 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
						<input
							type="radio"
							name="font-source"
							checked={typography.fontSource === 'system'}
							disabled={saving}
							onchange={() => void changeFontSource('system')}
						/>
						<span class="leading-5">{t('preferences.fontSourceSystem')}</span>
					</label>
				</div>
			</fieldset>

			{#if typography.fontSource === 'bundled'}
				<div class="mt-4 max-w-xl">
					<label class="min-w-0 text-sm font-medium">
						<span>{t('preferences.bundledFontLabel')}</span>
						<Select
							class="mt-1"
							bind:value={typography.bundledFont}
							disabled={saving}
							options={bundledFontOptions.map((opt) => ({ value: opt.id, label: t(opt.labelKey) }))}
							onchange={changeBundledFont}
						/>
						<p class="mt-2 text-xs leading-5 text-muted-foreground">
							{t('preferences.fontLicenseLabel')}: {getBundledFontOption(typography.bundledFont).license}
						</p>
					</label>
				</div>
			{:else}
				<div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
					<label class="min-w-0 text-sm font-medium" for="system-font-family">
						<span>{t('preferences.systemFontLabel')}</span>
						<Select
							id="system-font-family"
							class="mt-1"
							bind:value={typography.systemFontFamily}
							disabled={saving || loadingSystemFonts}
							options={[
								{ value: '', label: t('preferences.systemFontDefault') },
								...systemFontChoices.map((font) => ({ value: font, label: font }))
							]}
							onchange={changeSystemFont}
						/>
						<p class="mt-2 text-xs leading-5 text-muted-foreground">{t('preferences.systemFontHelp')}</p>
					</label>

					<div class="flex items-end gap-2">
						<button
							type="button"
							class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent disabled:opacity-60 lg:w-auto"
							aria-label={t('preferences.loadSystemFonts')}
							title={t('preferences.loadSystemFonts')}
							disabled={saving || loadingSystemFonts}
							onclick={() => void loadAvailableSystemFonts()}
						>
							<RefreshCw class="size-4 {loadingSystemFonts ? 'animate-spin' : ''}" />
							<span>{t('preferences.loadSystemFonts')}</span>
						</button>
					</div>
				</div>

				<div class="mt-4 border-t border-border pt-4">
					<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div class="min-w-0">
							<p class="text-sm font-medium">{t('preferences.systemFontDirectoryLabel')}</p>
							<p class="mt-1 truncate text-xs leading-5 text-muted-foreground">
								{typography.systemFontDirectory || t('preferences.systemFontDirectoryEmpty')}
							</p>
							<p class="mt-1 text-xs leading-5 text-muted-foreground">{t('preferences.systemFontDirectoryHelp')}</p>
						</div>
						<div class="flex shrink-0 gap-2">
							<button
								type="button"
								class="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent disabled:opacity-60 sm:flex-none"
								aria-label={t('preferences.addSystemFontDirectory')}
								title={t('preferences.addSystemFontDirectory')}
								disabled={saving || loadingSystemFonts}
								onclick={() => void addSystemFontDirectory()}
							>
								<FolderPlus class="size-4" />
								<span>{t('preferences.addSystemFontDirectory')}</span>
							</button>
							{#if typography.systemFontDirectory}
								<button
									type="button"
									class="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground disabled:opacity-60"
									aria-label={t('preferences.clearSystemFontDirectory')}
									title={t('preferences.clearSystemFontDirectory')}
									disabled={saving || loadingSystemFonts}
									onclick={() => void clearSystemFontDirectory()}
								>
									<X class="size-4" />
								</button>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>

		<div class="mt-6 border-t border-border pt-5">
			<p class="text-sm font-medium">{t('preferences.accessibilityTitle')}</p>
			<p class="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{t('preferences.accessibilityDescription')}</p>

			<div class="mt-4 grid gap-3 sm:grid-cols-2">
				<label class="flex min-w-0 items-start gap-3 rounded-md border border-border bg-background p-3 text-sm">
					<input
						type="checkbox"
						class="mt-1 size-4 rounded border-border text-primary"
						checked={typography.highContrast}
						disabled={saving}
						onchange={(event) => void changeReadingPreference('highContrast', event)}
					/>
					<span class="min-w-0">
						<span class="block font-medium">{t('preferences.highContrastLabel')}</span>
						<span class="mt-1 block leading-6 text-muted-foreground">{t('preferences.highContrastHelp')}</span>
					</span>
				</label>

				<label class="flex min-w-0 items-start gap-3 rounded-md border border-border bg-background p-3 text-sm">
					<input
						type="checkbox"
						class="mt-1 size-4 rounded border-border text-primary"
						checked={typography.enhancedFocus}
						disabled={saving}
						onchange={(event) => void changeReadingPreference('enhancedFocus', event)}
					/>
					<span class="min-w-0">
						<span class="block font-medium">{t('preferences.enhancedFocusLabel')}</span>
						<span class="mt-1 block leading-6 text-muted-foreground">{t('preferences.enhancedFocusHelp')}</span>
					</span>
				</label>

				<label class="flex min-w-0 items-start gap-3 rounded-md border border-border bg-background p-3 text-sm">
					<input
						type="checkbox"
						class="mt-1 size-4 rounded border-border text-primary"
						checked={typography.reduceMotion}
						disabled={saving}
						onchange={(event) => void changeReadingPreference('reduceMotion', event)}
					/>
					<span class="min-w-0">
						<span class="block font-medium">{t('preferences.reduceMotionLabel')}</span>
						<span class="mt-1 block leading-6 text-muted-foreground">{t('preferences.reduceMotionHelp')}</span>
					</span>
				</label>

				<label class="flex min-w-0 items-start gap-3 rounded-md border border-border bg-background p-3 text-sm">
					<input
						type="checkbox"
						class="mt-1 size-4 rounded border-border text-primary"
						checked={typography.uppercaseText}
						disabled={saving}
						onchange={(event) => void changeReadingPreference('uppercaseText', event)}
					/>
					<span class="min-w-0">
						<span class="block font-medium">{t('preferences.uppercaseTextLabel')}</span>
						<span class="mt-1 block leading-6 text-muted-foreground">{t('preferences.uppercaseTextHelp')}</span>
					</span>
				</label>
			</div>
		</div>

		<div class="mt-6 border-t border-border pt-5" style={previewStyle}>
			<p class="text-xs font-semibold uppercase text-muted-foreground">{t('preferences.fontPreviewTitle')}</p>
			<p class="mt-2 text-lg font-semibold">{t('preferences.fontPreviewText')}</p>
			<p class="mt-1 text-sm leading-6 text-muted-foreground">{t('preferences.fontPreviewDetail')}</p>
			<div class="mt-3 flex flex-wrap gap-2">
				<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
					<CheckCircle2 class="size-4" />
					{t('actions.save')}
				</button>
				<button type="button" class="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium">
					{t('actions.cancel')}
				</button>
			</div>
		</div>
	</section>
</section>
