<script lang="ts">
	import Select from '$lib/components/ui/Select.svelte';
	import {
		breedReferenceProfiles,
		getBreedOriginMapPosition,
		type BreedReferenceOrigin,
		type BreedReferenceProfile,
		type BreedSizeCategory,
		type BreedSexRange
	} from '$lib/domain/pet/breed-reference.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import PawPrint from '@lucide/svelte/icons/paw-print';
	import Ruler from '@lucide/svelte/icons/ruler';
	import Scale from '@lucide/svelte/icons/scale';
	import Search from '@lucide/svelte/icons/search';

	type SpeciesFilter = 'all' | 'canine' | 'feline';
	type MapZoomLevel = 'world' | 'detail';
	type MapFocus = { left: number; top: number };
	type OriginPoint = { origin: BreedReferenceOrigin; label: string; count: number; left: number; top: number };
	type OriginMapPoint = OriginPoint & { kind: 'origin' };
	type ClusterMapPoint = { kind: 'cluster'; id: string; label: string; count: number; left: number; top: number; originIds: string[] };
	type MapPoint = OriginMapPoint | ClusterMapPoint;
	type MapDragState = { pointerId: number; startX: number; startY: number; startFocus: MapFocus; moved: boolean };

	let searchTerm = $state('');
	let speciesFilter = $state<SpeciesFilter>('all');
	let sizeFilter = $state('');
	let originFilter = $state('');
	let selectedBreedId = $state<string | null>(null);
	let mapZoom = $state<MapZoomLevel>('world');
	let mapFocus = $state<MapFocus>({ left: 52.5, top: 25 });
	let mapDragState = $state<MapDragState | null>(null);

	const filteredProfiles = $derived.by(() => {
		const search = normalizeSearchText(searchTerm);

		return breedReferenceProfiles.filter((profile) => {
			if (speciesFilter !== 'all' && profile.option.species !== speciesFilter) return false;
			if (sizeFilter && profile.sizeCategory !== sizeFilter) return false;
			if (originFilter && profile.origin.id !== originFilter) return false;
			if (!search) return true;

			return normalizeSearchText([breedName(profile), speciesLabel(profile), originLabel(profile.origin), sizeLabel(profile.sizeCategory)].join(' ')).includes(search);
		});
	});
	const selectedProfile = $derived(filteredProfiles.find((profile) => profile.option.id === selectedBreedId) ?? filteredProfiles[0] ?? null);
	const originPoints = $derived(buildOriginPoints(filteredProfiles));
	const mapPoints = $derived(mapZoom === 'detail' ? originPoints.map((point) => ({ ...point, kind: 'origin' as const })) : buildWorldMapPoints(originPoints));
	const mapLayerTransform = $derived(mapZoom === 'detail' ? `translate(${mapZoomTranslate(mapFocus.left)}%, ${mapZoomTranslate(mapFocus.top)}%) scale(4)` : 'translate(0%, 0%) scale(1)');
	const mapPointScale = $derived(mapZoom === 'detail' ? 0.25 : 1);

	function normalizeSearchText(value: string): string {
		return value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, ' ')
			.trim();
	}

	function breedName(profile: BreedReferenceProfile): string {
		return t(profile.option.labelKey);
	}

	function speciesLabel(profile: BreedReferenceProfile): string {
		return profile.option.species === 'canine' ? t('pet.speciesCanine') : t('pet.speciesFeline');
	}

	function sizeLabel(size: BreedSizeCategory): string {
		return t(`breedReference.size.${size}` as TranslationKey);
	}

	function originLabel(origin: BreedReferenceOrigin): string {
		if (origin.labelKey) return t(origin.labelKey);
		if (!origin.countryCode) return t('common.notInformed');

		return new Intl.DisplayNames([i18n.locale], { type: 'region' }).of(origin.countryCode) ?? origin.countryCode;
	}

	function rangeLabel(range: readonly [number, number], unitKey: TranslationKey): string {
		return `${numberLabel(range[0])}-${numberLabel(range[1])} ${t(unitKey)}`;
	}

	function numberLabel(value: number): string {
		return new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 }).format(value);
	}

	function sexRangeRows(range: BreedSexRange, unitKey: TranslationKey) {
		return [
			{ label: t('breedReference.male'), value: rangeLabel(range.male, unitKey) },
			{ label: t('breedReference.female'), value: rangeLabel(range.female, unitKey) }
		];
	}

	function speciesOptions() {
		return [
			{ value: 'all', label: t('breedReference.allSpecies') },
			{ value: 'canine', label: t('pet.speciesCanine') },
			{ value: 'feline', label: t('pet.speciesFeline') }
		];
	}

	function sizeOptions() {
		return [
			{ value: '', label: t('breedReference.allSizes') },
			{ value: 'small', label: sizeLabel('small') },
			{ value: 'medium', label: sizeLabel('medium') },
			{ value: 'large', label: sizeLabel('large') },
			{ value: 'giant', label: sizeLabel('giant') }
		];
	}

	function originOptions() {
		const options = new Map<string, string>();
		for (const profile of breedReferenceProfiles) {
			options.set(profile.origin.id, originLabel(profile.origin));
		}

		return [
			{ value: '', label: t('breedReference.allOrigins') },
			...[...options.entries()].sort((left, right) => left[1].localeCompare(right[1], i18n.locale)).map(([value, label]) => ({ value, label }))
		];
	}

	function buildOriginPoints(profiles: BreedReferenceProfile[]): OriginPoint[] {
		const buckets = new Map<string, { origin: BreedReferenceOrigin; count: number }>();

		for (const profile of profiles) {
			const position = getBreedOriginMapPosition(profile.origin);
			if (!position) continue;

			const bucket = buckets.get(profile.origin.id);
			if (bucket) {
				bucket.count += 1;
				continue;
			}

			buckets.set(profile.origin.id, { origin: profile.origin, count: 1 });
		}

		return [...buckets.values()]
			.map((bucket) => {
				const position = getBreedOriginMapPosition(bucket.origin);
				return position ? { origin: bucket.origin, label: originLabel(bucket.origin), count: bucket.count, ...position } : null;
			})
			.filter((point): point is OriginPoint => point !== null)
			.sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, i18n.locale));
	}

	function buildWorldMapPoints(points: OriginPoint[]): MapPoint[] {
		const clusters: { left: number; top: number; count: number; points: OriginPoint[] }[] = [];

		for (const point of points) {
			const cluster = clusters.find((item) => distanceBetweenMapPoints(item, point) <= 8);
			if (!cluster) {
				clusters.push({ left: point.left, top: point.top, count: point.count, points: [point] });
				continue;
			}

			const nextLength = cluster.points.length + 1;
			cluster.left = (cluster.left * cluster.points.length + point.left) / nextLength;
			cluster.top = (cluster.top * cluster.points.length + point.top) / nextLength;
			cluster.count += point.count;
			cluster.points.push(point);
		}

		return clusters.map((cluster) => {
			if (cluster.points.length === 1) return { ...cluster.points[0], kind: 'origin' as const };

			return {
				kind: 'cluster' as const,
				id: cluster.points.map((point) => point.origin.id).join(':'),
				label: cluster.points.map((point) => point.label).join(', '),
				count: cluster.count,
				left: cluster.left,
				top: cluster.top,
				originIds: cluster.points.map((point) => point.origin.id)
			};
		});
	}

	function distanceBetweenMapPoints(left: MapFocus, right: MapFocus): number {
		return Math.hypot(left.left - right.left, left.top - right.top);
	}

	function mapZoomTranslate(position: number): number {
		return Math.min(0, Math.max(-300, 50 - position * 4));
	}

	function clampMapFocus(value: number): number {
		return Math.min(87.5, Math.max(12.5, value));
	}

	function useFallbackImage(event: Event, fallbackImagePath: string) {
		const image = event.currentTarget as HTMLImageElement | null;
		if (!image || image.dataset.fallbackApplied === 'true') return;

		image.dataset.fallbackApplied = 'true';
		image.src = fallbackImagePath;
	}

	function selectBreed(profile: BreedReferenceProfile): void {
		selectedBreedId = profile.option.id;
	}

	function selectOrigin(origin: BreedReferenceOrigin): void {
		originFilter = originFilter === origin.id ? '' : origin.id;
	}

	function selectMapPoint(point: MapPoint): void {
		if (point.kind === 'cluster') {
			mapZoom = 'detail';
			mapFocus = { left: point.left, top: point.top };
			return;
		}

		mapZoom = 'detail';
		mapFocus = { left: point.left, top: point.top };
		selectOrigin(point.origin);
	}

	function setMapZoom(nextZoom: MapZoomLevel): void {
		mapZoom = nextZoom;
		mapDragState = null;

		if (nextZoom === 'detail') {
			const selectedOriginPoint = originFilter ? originPoints.find((point) => point.origin.id === originFilter) : null;
			if (selectedOriginPoint) mapFocus = { left: selectedOriginPoint.left, top: selectedOriginPoint.top };
		}
	}

	function startMapPan(event: PointerEvent): void {
		if (mapZoom !== 'detail') return;
		if (event.target !== event.currentTarget) return;

		const target = event.currentTarget as HTMLElement | null;
		target?.setPointerCapture(event.pointerId);
		mapDragState = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startFocus: mapFocus, moved: false };
	}

	function panMap(event: PointerEvent): void {
		if (mapZoom !== 'detail' || !mapDragState || event.pointerId !== mapDragState.pointerId) return;

		const target = event.currentTarget as HTMLElement | null;
		const rect = target?.getBoundingClientRect();
		if (!rect || rect.width <= 0 || rect.height <= 0) return;

		const deltaX = event.clientX - mapDragState.startX;
		const deltaY = event.clientY - mapDragState.startY;
		const nextFocus = {
			left: clampMapFocus(mapDragState.startFocus.left - (deltaX / rect.width) * 25),
			top: clampMapFocus(mapDragState.startFocus.top - (deltaY / rect.height) * 25)
		};

		mapFocus = nextFocus;
		mapDragState = { ...mapDragState, moved: mapDragState.moved || Math.hypot(deltaX, deltaY) > 4 };
	}

	function stopMapPan(event: PointerEvent): void {
		if (!mapDragState || event.pointerId !== mapDragState.pointerId) return;

		const target = event.currentTarget as HTMLElement | null;
		if (target?.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
		mapDragState = null;
	}

	function mapPointTitle(point: MapPoint): string {
		if (point.kind === 'cluster') return `${t('breedReference.mapCluster')}: ${point.label} (${point.count})`;
		return `${point.label} (${point.count})`;
	}

	function mapPointAriaLabel(point: MapPoint): string {
		if (point.kind === 'cluster') return `${t('breedReference.mapCluster')}: ${point.label}`;
		return `${t('breedReference.mapPoint')}: ${point.label}`;
	}

	$effect(() => {
		if (filteredProfiles.length === 0) {
			selectedBreedId = null;
			return;
		}

		if (!selectedBreedId || !filteredProfiles.some((profile) => profile.option.id === selectedBreedId)) {
			selectedBreedId = filteredProfiles[0].option.id;
		}
	});

	$effect(() => {
		if (!originFilter) return;

		const point = originPoints.find((originPoint) => originPoint.origin.id === originFilter);
		if (!point) return;

		mapZoom = 'detail';
		mapFocus = { left: point.left, top: point.top };
	});
</script>

<svelte:head>
	<title>{t('breedReference.title')} | {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-360 flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
	<header class="border-b border-border pb-4">
		<p class="text-sm font-medium text-muted-foreground">{t('breedReference.kicker')}</p>
		<h2 class="mt-1 text-2xl font-semibold tracking-normal text-foreground">{t('breedReference.title')}</h2>
		<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('breedReference.description')}</p>
	</header>

	<section class="rounded-md border border-border bg-card p-3 shadow-sm sm:p-4">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<div class="min-w-0">
				<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
					<MapPin class="size-4" />
					{t('breedReference.mapTitle')}
				</div>
				<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('breedReference.mapDescription')}</p>
			</div>
			{#if originFilter}
				<button class="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" type="button" onclick={() => (originFilter = '')}>{t('breedReference.clearOrigin')}</button>
			{/if}
		</div>
		<div class="mt-4 grid w-full max-w-xs grid-cols-2 gap-1 rounded-md border border-border bg-muted p-1" role="tablist" aria-label={t('breedReference.mapZoomLabel')}>
			<button class="inline-flex h-9 items-center justify-center rounded-sm px-3 text-sm font-medium transition-colors {mapZoom === 'world' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}" type="button" role="tab" aria-selected={mapZoom === 'world'} onclick={() => setMapZoom('world')}>{t('breedReference.mapZoomWorld')}</button>
			<button class="inline-flex h-9 items-center justify-center rounded-sm px-3 text-sm font-medium transition-colors {mapZoom === 'detail' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}" type="button" role="tab" aria-selected={mapZoom === 'detail'} onclick={() => setMapZoom('detail')}>{t('breedReference.mapZoomDetail')}</button>
		</div>

		<div
			class="relative mt-4 aspect-2/1 min-h-56 touch-none overflow-hidden rounded-md border border-border bg-muted/60 sm:min-h-72 {mapZoom === 'detail' ? mapDragState ? 'cursor-grabbing' : 'cursor-grab' : ''}"
			role="region"
			aria-label={t('breedReference.mapPanArea')}
			onpointerdown={startMapPan}
			onpointermove={panMap}
			onpointerup={stopMapPan}
			onpointercancel={stopMapPan}
		>
			<div class="pointer-events-none absolute inset-0 transition-transform ease-out {mapDragState ? 'duration-0' : 'duration-300'}" style={`transform: ${mapLayerTransform}; transform-origin: top left;`}>
				<img class="absolute inset-0 h-full w-full object-fill" src="/images/Equal-Earth-Physical-No-Type.jpeg" alt="" aria-hidden="true" draggable="false" />
				<div class="absolute inset-0 bg-background/10"></div>
			</div>
			<div class="pointer-events-none absolute inset-0 transition-transform ease-out {mapDragState ? 'duration-0' : 'duration-300'}" style={`transform: ${mapLayerTransform}; transform-origin: top left;`}>
				{#each mapPoints as point}
					<button
						type="button"
						class="pointer-events-auto absolute inline-flex size-9 items-center justify-center rounded-full border text-xs font-semibold tabular-nums shadow-sm ring-2 ring-background transition-colors {point.kind === 'origin' && originFilter === point.origin.id ? 'border-primary bg-primary text-primary-foreground' : 'border-primary/50 bg-background/95 text-primary hover:bg-primary hover:text-primary-foreground'}"
						style={`left: ${point.left}%; top: ${point.top}%; transform: translate(-50%, -50%) scale(${mapPointScale});`}
						title={mapPointTitle(point)}
						aria-label={mapPointAriaLabel(point)}
						onpointerdown={(event) => event.stopPropagation()}
						onclick={() => selectMapPoint(point)}
					>
						{point.count}
					</button>
				{/each}
			</div>
		</div>
	</section>

	<section class="grid gap-3 rounded-md border border-border bg-card p-3 shadow-sm sm:p-4 lg:grid-cols-[minmax(14rem,1.2fr)_minmax(10rem,0.7fr)_minmax(10rem,0.7fr)_minmax(12rem,0.9fr)]">
		<label class="space-y-1">
			<span class="text-sm font-medium">{t('breedReference.searchLabel')}</span>
			<span class="relative block">
				<Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<input class="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30" bind:value={searchTerm} placeholder={t('breedReference.searchPlaceholder')} />
			</span>
		</label>

		<div class="space-y-1">
			<label class="text-sm font-medium" for="breed-reference-species">{t('breedReference.speciesFilter')}</label>
			<Select id="breed-reference-species" bind:value={speciesFilter} options={speciesOptions()} />
		</div>

		<div class="space-y-1">
			<label class="text-sm font-medium" for="breed-reference-size">{t('breedReference.sizeFilter')}</label>
			<Select id="breed-reference-size" bind:value={sizeFilter} options={sizeOptions()} />
		</div>

		<div class="space-y-1">
			<label class="text-sm font-medium" for="breed-reference-origin">{t('breedReference.originFilter')}</label>
			<Select id="breed-reference-origin" bind:value={originFilter} options={originOptions()} />
		</div>
	</section>

	<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
		<div class="min-w-0 space-y-4">
			<section class="rounded-md border border-border bg-card p-3 shadow-sm sm:p-4">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div class="min-w-0">
						<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
							<PawPrint class="size-4" />
							{t('breedReference.listTitle')}
						</div>
					</div>
					<span class="inline-flex h-8 shrink-0 items-center rounded-md bg-muted px-3 text-sm font-medium tabular-nums text-muted-foreground">{filteredProfiles.length}</span>
				</div>

				<div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
					{#each filteredProfiles as profile}
						<button type="button" class="flex min-h-48 flex-col overflow-hidden rounded-md border text-left transition-colors hover:bg-accent {selectedProfile?.option.id === profile.option.id ? 'border-primary bg-primary/10 ring-2 ring-ring/25' : 'border-border bg-background'}" aria-label={`${t('breedReference.openBreed')}: ${breedName(profile)}`} onclick={() => selectBreed(profile)}>
							<img class="aspect-5/4 w-full bg-muted object-cover" src={profile.option.imagePath} alt="" aria-hidden="true" loading="lazy" onerror={(event) => useFallbackImage(event, profile.option.fallbackImagePath)} />
							<span class="flex min-h-24 flex-1 flex-col p-2.5">
								<span class="wrap-break-word text-sm font-semibold leading-5">{breedName(profile)}</span>
								<span class="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
									<MapPin class="size-3.5 shrink-0" />
									<span class="truncate">{originLabel(profile.origin)}</span>
								</span>
								<span class="mt-auto pt-3 text-xs font-medium uppercase text-muted-foreground">{sizeLabel(profile.sizeCategory)} · {speciesLabel(profile)}</span>
							</span>
						</button>
					{:else}
						<p class="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-4">{t('breedReference.noResults')}</p>
					{/each}
				</div>
			</section>
		</div>

		<aside>
			{#if selectedProfile}
				<section class="rounded-md border border-border bg-card shadow-sm xl:sticky xl:top-5 xl:self-start">
					<img class="aspect-16/10 w-full rounded-t-md bg-muted object-cover" src={selectedProfile.option.imagePath} alt="" aria-hidden="true" loading="lazy" onerror={(event) => useFallbackImage(event, selectedProfile.option.fallbackImagePath)} />
					<div class="p-3 sm:p-4">
						<p class="text-xs font-medium uppercase text-muted-foreground">{t('breedReference.detailsTitle')}</p>
						<h3 class="mt-1 wrap-break-word text-lg font-semibold">{breedName(selectedProfile)}</h3>

						<div class="mt-3 grid gap-2 text-sm">
							<div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
								<div class="rounded-md border border-border bg-background p-2.5">
									<p class="text-xs font-medium uppercase text-muted-foreground">{t('breedReference.origin')}</p>
									<p class="mt-1 font-medium">{originLabel(selectedProfile.origin)}</p>
								</div>

								<div class="rounded-md border border-border bg-background p-2.5">
									<p class="text-xs font-medium uppercase text-muted-foreground">{t('breedReference.size')}</p>
									<p class="mt-1 font-medium">{sizeLabel(selectedProfile.sizeCategory)}</p>
								</div>
							</div>

							<div class="grid grid-cols-2 gap-2">
								<div class="rounded-md border border-border bg-background p-2.5">
									<div class="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
										<Scale class="size-3.5" />
										{t('breedReference.averageWeight')}
									</div>
									<div class="mt-2 grid gap-1.5 text-xs">
										{#each sexRangeRows(selectedProfile.averageWeightKg, 'breedReference.unit.kg') as row}
											<div class="grid gap-0.5"><span class="text-muted-foreground">{row.label}</span><span class="font-medium tabular-nums">{row.value}</span></div>
										{/each}
									</div>
								</div>

								<div class="rounded-md border border-border bg-background p-2.5">
									<div class="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
										<Ruler class="size-3.5" />
										{t('breedReference.averageHeight')}
									</div>
									<div class="mt-2 grid gap-1.5 text-xs">
										{#each sexRangeRows(selectedProfile.averageHeightCm, 'breedReference.unit.cm') as row}
											<div class="grid gap-0.5"><span class="text-muted-foreground">{row.label}</span><span class="font-medium tabular-nums">{row.value}</span></div>
										{/each}
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>
			{/if}
		</aside>
	</div>
</section>
