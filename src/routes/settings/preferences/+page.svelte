<script lang="ts">
	import { onMount } from 'svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import {
		CUSTOM_FONT_SIZE_ID,
		CUSTOM_FONT_SIZE_MAX_PX,
		CUSTOM_FONT_SIZE_MIN_PX,
		CUSTOM_FONT_SIZE_STEP_PX,
		DEFAULT_TYPOGRAPHY_PREFERENCES,
		bundledFontOptions,
		fontSizeOptions,
		getFontSizeOption,
		getBundledFontOption,
		getTypographyFontFamily,
		normalizeCustomRootSizePx,
		sanitizeSystemFontDirectory,
		sanitizeSystemFontFamily,
		type BundledFontId,
		type FontSizeId,
		type FontSource,
		type TypographyPreferences
	} from '$lib/domain/preferences/typography.js';
	import { getLocale, localeOptions, setLocale, t, type Locale, type TranslationKey } from '$lib/i18n/index.js';
	import { listSystemFonts } from '$lib/native/system-fonts.js';
	import {
		applyTypographyPreference,
		loadLocalePreference,
		loadTypographyPreference,
		saveLocalePreference,
		saveTypographyPreference
	} from '$lib/services/preferences.service.js';
	import { open } from '@tauri-apps/plugin-dialog';
	import Languages from '@lucide/svelte/icons/languages';
	import FolderPlus from '@lucide/svelte/icons/folder-plus';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import X from '@lucide/svelte/icons/x';
	import TypeIcon from '@lucide/svelte/icons/type';

	let selectedLocale = $state<Locale>(getLocale());
	let typography = $state<TypographyPreferences>({ ...DEFAULT_TYPOGRAPHY_PREFERENCES });
	let systemFontOptions = $state<string[]>([]);
	let saving = $state(false);
	let loadingSystemFonts = $state(false);
	let statusKey = $state<TranslationKey | null>(null);
	let error = $state<string | null>(null);
	let previewStyle = $derived(`font-family: ${getTypographyFontFamily(typography)};`);
	let currentRootSizePx = $derived.by(() => {
		if (typography.fontSize === CUSTOM_FONT_SIZE_ID) {
			return normalizeCustomRootSizePx(typography.customRootSizePx);
		}

		return normalizeCustomRootSizePx(Number.parseFloat(getFontSizeOption(typography.fontSize).rootSize));
	});
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

	async function changeFontSize(fontSize: FontSizeId) {
		const rootSizeBeforeChange = currentRootSizePx;
		typography.fontSize = fontSize;
		if (fontSize === CUSTOM_FONT_SIZE_ID) {
			typography.customRootSizePx = rootSizeBeforeChange;
		} else {
			typography.customRootSizePx = normalizeCustomRootSizePx(
				Number.parseFloat(getFontSizeOption(fontSize).rootSize)
			);
		}
		await saveTypography();
	}

	function updateCustomFontSize(value: string): void {
		typography.customRootSizePx = normalizeCustomRootSizePx(value);
		typography.fontSize = CUSTOM_FONT_SIZE_ID;
	}

	function previewCustomFontSize(event: Event): void {
		updateCustomFontSize((event.currentTarget as HTMLInputElement).value);
		applyTypographyPreference(typography);
	}

	async function saveCustomFontSize(event: Event) {
		updateCustomFontSize((event.currentTarget as HTMLInputElement).value);
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

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>{t('settings.preferences.title')} · {t('app.name')}</title>
</svelte:head>

<section class="flex w-full flex-col gap-5">
	<header class="border-b border-border pb-5">
		<p class="text-sm font-medium text-muted-foreground">{t('settings.title')}</p>
		<h2 class="mt-1 text-2xl font-semibold sm:text-3xl">{t('settings.preferences.title')}</h2>
		<p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('settings.preferences.description')}</p>
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
			<div class="min-w-0 flex-1">
				<h3 class="text-base font-semibold">{t('preferences.languageTitle')}</h3>
				<p class="mt-1 text-sm leading-6 text-muted-foreground">{t('preferences.languageDescription')}</p>

				<label class="mt-4 flex max-w-sm flex-col gap-1 text-sm font-medium">
					<span>{t('preferences.languageLabel')}</span>
					<Select bind:value={selectedLocale} disabled={saving} options={localeOptions.map((opt) => ({ value: opt.value, label: t(opt.labelKey) }))} onchange={changeLocale} />
				</label>

				<p class="mt-3 text-sm text-muted-foreground">{t('preferences.currentLanguage')}: {t(`locale.${selectedLocale}` as TranslationKey)}</p>
			</div>
		</div>
	</section>

	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
		<div class="flex items-start gap-3">
			<span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
				<TypeIcon class="size-5" />
			</span>
			<div class="min-w-0 flex-1">
				<h3 class="text-base font-semibold">{t('preferences.typographyTitle')}</h3>
				<p class="mt-1 text-sm leading-6 text-muted-foreground">{t('preferences.typographyDescription')}</p>

				<div class="mt-5">
					<p class="text-sm font-medium">{t('preferences.fontSizeLabel')}</p>
					<div class="mt-2 grid gap-2 sm:grid-cols-6">
						{#each fontSizeOptions as option}
							<button
								type="button"
								class="min-h-10 rounded-md border px-3 py-2 text-sm font-medium transition-colors {typography.fontSize === option.id
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-border bg-background text-foreground hover:bg-accent'}"
								aria-pressed={typography.fontSize === option.id}
								disabled={saving}
								onclick={() => void changeFontSize(option.id)}
							>
								{t(option.labelKey)}
							</button>
						{/each}
						<button
							type="button"
							class="min-h-10 rounded-md border px-3 py-2 text-sm font-medium transition-colors {typography.fontSize === CUSTOM_FONT_SIZE_ID
								? 'border-primary bg-primary text-primary-foreground'
								: 'border-border bg-background text-foreground hover:bg-accent'}"
							aria-pressed={typography.fontSize === CUSTOM_FONT_SIZE_ID}
							disabled={saving}
							onclick={() => void changeFontSize(CUSTOM_FONT_SIZE_ID)}
						>
							{t('preferences.fontSize.custom')}
						</button>
					</div>

					<div class="mt-3 rounded-md border border-border bg-background p-3">
						<div class="flex flex-wrap items-center justify-between gap-2 text-sm">
							<label for="custom-font-size" class="font-medium">{t('preferences.customFontSizeLabel')}</label>
							<p class="font-semibold">{currentRootSizePx}px</p>
						</div>
						<input
							id="custom-font-size"
							type="range"
							class="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary disabled:opacity-60"
							min={String(CUSTOM_FONT_SIZE_MIN_PX)}
							max={String(CUSTOM_FONT_SIZE_MAX_PX)}
							step={String(CUSTOM_FONT_SIZE_STEP_PX)}
							value={String(currentRootSizePx)}
							disabled={saving}
							oninput={previewCustomFontSize}
							onchange={saveCustomFontSize}
						/>
						<div class="mt-2 flex items-center justify-between text-xs text-muted-foreground">
							<span>{CUSTOM_FONT_SIZE_MIN_PX}px</span>
							<span>{CUSTOM_FONT_SIZE_MAX_PX}px</span>
						</div>
						<p class="mt-2 text-xs leading-5 text-muted-foreground">{t('preferences.customFontSizeHelp')}</p>
					</div>
				</div>

				<div class="mt-5">
					<fieldset class="min-w-0">
						<legend class="text-sm font-medium">{t('preferences.fontSourceLabel')}</legend>
						<div class="mt-2 grid gap-2 sm:grid-cols-2">
							<label class="flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
								<input
									type="radio"
									name="font-source"
									checked={typography.fontSource === 'bundled'}
									disabled={saving}
									onchange={() => void changeFontSource('bundled')}
								/>
								<span>{t('preferences.fontSourceBundled')}</span>
							</label>
							<label class="flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
								<input
									type="radio"
									name="font-source"
									checked={typography.fontSource === 'system'}
									disabled={saving}
									onchange={() => void changeFontSource('system')}
								/>
								<span>{t('preferences.fontSourceSystem')}</span>
							</label>
						</div>
					</fieldset>
				</div>

				<div class="mt-5 border-t border-border pt-4" style={previewStyle}>
					<p class="text-xs font-semibold uppercase text-muted-foreground">{t('preferences.fontPreviewTitle')}</p>
					<p class="mt-2 text-lg font-semibold">{t('preferences.fontPreviewText')}</p>
					<p class="mt-1 text-sm leading-6 text-muted-foreground">{t('preferences.fontPreviewDetail')}</p>
				</div>

				{#if typography.fontSource === 'bundled'}
					<div class="mt-5 max-w-xl">
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
					<div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
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
						</label>

						<div class="flex items-end gap-2">
						<button
							type="button"
							class="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent disabled:opacity-60"
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

					<div class="mt-4 rounded-md border border-border bg-background p-3">
						<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div class="min-w-0">
								<p class="text-sm font-medium">{t('preferences.systemFontDirectoryLabel')}</p>
								<p class="mt-1 truncate text-xs leading-5 text-muted-foreground">
									{typography.systemFontDirectory || t('preferences.systemFontDirectoryEmpty')}
								</p>
							</div>
							<div class="flex shrink-0 gap-2">
								<button
									type="button"
									class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent disabled:opacity-60"
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
						<p class="mt-2 text-xs leading-5 text-muted-foreground">{t('preferences.systemFontDirectoryHelp')}</p>
					</div>
					<p class="mt-2 text-xs leading-5 text-muted-foreground">{t('preferences.systemFontHelp')}</p>
				{/if}

				
			</div>
		</div>
	</section>
</section>