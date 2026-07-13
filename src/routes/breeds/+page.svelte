<script lang="ts">
	import { onMount } from "svelte";
	import BinaryImage from "$lib/components/shared/BinaryImage.svelte";
	import { type ReferenceGridCard } from "$lib/components/reference/ReferenceCardGrid.svelte";
	import ReferenceExplorer from "$lib/components/reference/ReferenceExplorer.svelte";
	import { type ReferenceFilterBarSelect } from "$lib/components/reference/ReferenceFilterBar.svelte";
	import ReferenceSummarySidebar, {
		type ReferenceSummaryField,
	} from "$lib/components/reference/ReferenceSummarySidebar.svelte";
	import {
		normalizeReferenceSearch,
		referenceRangeRows,
		referenceSpeciesLabel,
		referenceSpeciesOptions,
		resolveReferenceSelection,
	} from "$lib/components/reference/reference-utils.js";
	import {
		getBreedOriginMapPosition,
		type BreedReferenceOrigin,
		type BreedReferenceProfile,
		type BreedSizeCategory,
	} from "$lib/domain/pet/breed-reference.js";
	import { i18n, t, type TranslationKey } from "$lib/i18n/index.js";
	import { loadBreedReferenceProfiles } from "$lib/services/breed-reference.service.js";
	import MapPin from "@lucide/svelte/icons/map-pin";
	import PawPrint from "@lucide/svelte/icons/paw-print";
	import Ruler from "@lucide/svelte/icons/ruler";
	import Scale from "@lucide/svelte/icons/scale";

	type SpeciesFilter = "all" | "canine" | "feline";
	type MapZoomLevel = "world" | "detail";
	type MapFocus = { left: number; top: number };
	type OriginPoint = {
		origin: BreedReferenceOrigin;
		label: string;
		count: number;
		left: number;
		top: number;
	};
	type OriginMapPoint = OriginPoint & { kind: "origin" };
	type ClusterMapPoint = {
		kind: "cluster";
		id: string;
		label: string;
		count: number;
		left: number;
		top: number;
		originIds: string[];
	};
	type MapPoint = OriginMapPoint | ClusterMapPoint;
	type MapDragState = {
		pointerId: number;
		startX: number;
		startY: number;
		startFocus: MapFocus;
		moved: boolean;
	};

	let profiles = $state<BreedReferenceProfile[]>([]);
	let loading = $state(true);
	let loadFailed = $state(false);
	let searchTerm = $state("");
	let speciesFilter = $state<SpeciesFilter>("all");
	let sizeFilter = $state("");
	let originFilter = $state("");
	let selectedBreedId = $state<string | null>(null);
	let mapZoom = $state<MapZoomLevel>("world");
	let mapFocus = $state<MapFocus>({ left: 52.5, top: 25 });
	let mapDragState = $state<MapDragState | null>(null);
	let activeTab = $state<"list" | "map">("list");

	const filteredProfiles = $derived.by(() => {
		const search = normalizeReferenceSearch(searchTerm);

		return profiles.filter((profile) => {
			if (speciesFilter !== "all" && profile.species !== speciesFilter)
				return false;
			if (sizeFilter && profile.sizeCategory !== sizeFilter) return false;
			if (originFilter && profile.origin.id !== originFilter)
				return false;
			if (!search) return true;

			return normalizeReferenceSearch(
				[
					breedName(profile),
					speciesLabel(profile),
					originLabel(profile.origin),
					sizeLabel(profile.sizeCategory),
				].join(" "),
			).includes(search);
		});
	});
	const selectedProfile = $derived(
		filteredProfiles.find(
			(profile) => profile.breedId === selectedBreedId,
		) ??
			filteredProfiles[0] ??
			null,
	);
	const breedCards = $derived<ReferenceGridCard[]>(
		filteredProfiles.map((profile) => ({
			id: profile.breedId,
			title: breedName(profile),
			subtitle: originLabel(profile.origin),
			meta: `${sizeLabel(profile.sizeCategory)} · ${speciesLabel(profile)}`,
			imageBytes: profile.primaryImage?.imageBytes ?? null,
			fallbackIcon: PawPrint,
			imageAlt: "",
		})),
	);
	const selectedSummaryFields = $derived<ReferenceSummaryField[]>(
		selectedProfile
			? [
					{
						label: t("breedReference.origin"),
						value: originLabel(selectedProfile.origin),
					},
					{
						label: t("breedReference.size"),
						value: sizeLabel(selectedProfile.sizeCategory),
					},
					{
						label: t("breedReference.averageWeight"),
						icon: Scale,
						rows: sexRangeRows(
							selectedProfile.averageWeightKg,
							"breedReference.unit.kg",
						),
					},
					{
						label: t("breedReference.averageHeight"),
						icon: Ruler,
						rows: sexRangeRows(
							selectedProfile.averageHeightCm,
							"breedReference.unit.cm",
						),
					},
				]
			: [],
	);
	const filterControls = $derived.by<ReferenceFilterBarSelect[]>(() => [
		{
			id: "breed-reference-species",
			label: t("breedReference.speciesFilter"),
			value: speciesFilter,
			options: speciesOptions(),
			onchange: (value) => (speciesFilter = value as SpeciesFilter),
		},
		{
			id: "breed-reference-size",
			label: t("breedReference.sizeFilter"),
			value: sizeFilter,
			options: sizeOptions(),
			onchange: (value) => (sizeFilter = value),
		},
		{
			id: "breed-reference-origin",
			label: t("breedReference.originFilter"),
			value: originFilter,
			options: originOptions(),
			onchange: (value) => (originFilter = value),
		},
	]);
	const originPoints = $derived(buildOriginPoints(filteredProfiles));
	const mapPoints = $derived(
		mapZoom === "detail"
			? originPoints.map((point) => ({
					...point,
					kind: "origin" as const,
				}))
			: buildWorldMapPoints(originPoints),
	);
	const mapLayerTransform = $derived(
		mapZoom === "detail"
			? `translate(${mapZoomTranslate(mapFocus.left)}%, ${mapZoomTranslate(mapFocus.top)}%) scale(4)`
			: "translate(0%, 0%) scale(1)",
	);
	const mapPointScale = $derived(mapZoom === "detail" ? 0.25 : 1);

	function breedName(profile: BreedReferenceProfile): string {
		return t(profile.labelKey);
	}

	function speciesLabel(profile: BreedReferenceProfile): string {
		return referenceSpeciesLabel(
			profile.species,
			t("pet.speciesCanine"),
			t("pet.speciesFeline"),
		);
	}

	function sizeLabel(size: BreedSizeCategory): string {
		return t(`breedReference.size.${size}` as TranslationKey);
	}

	function originLabel(origin: BreedReferenceOrigin): string {
		if (origin.labelKey) return t(origin.labelKey);
		if (!origin.countryCode) return t("common.notInformed");

		return (
			new Intl.DisplayNames([i18n.locale], { type: "region" }).of(
				origin.countryCode,
			) ?? origin.countryCode
		);
	}

	function numberLabel(value: number): string {
		return new Intl.NumberFormat(i18n.locale, {
			maximumFractionDigits: 1,
		}).format(value);
	}

	function sexRangeRows(
		range: {
			male: readonly [number, number];
			female: readonly [number, number];
		},
		unitKey: TranslationKey,
	) {
		return referenceRangeRows(
			range,
			{
				male: t("breedReference.male"),
				female: t("breedReference.female"),
				unit: t(unitKey),
			},
			numberLabel,
		);
	}

	function speciesOptions() {
		return referenceSpeciesOptions(
			t("breedReference.allSpecies"),
			t("pet.speciesCanine"),
			t("pet.speciesFeline"),
		);
	}

	function sizeOptions() {
		return [
			{ value: "", label: t("breedReference.allSizes") },
			{ value: "small", label: sizeLabel("small") },
			{ value: "medium", label: sizeLabel("medium") },
			{ value: "large", label: sizeLabel("large") },
			{ value: "giant", label: sizeLabel("giant") },
		];
	}

	function originOptions() {
		const options = new Map<string, string>();
		for (const profile of profiles) {
			options.set(profile.origin.id, originLabel(profile.origin));
		}

		return [
			{ value: "", label: t("breedReference.allOrigins") },
			...[...options.entries()]
				.sort((left, right) =>
					left[1].localeCompare(right[1], i18n.locale),
				)
				.map(([value, label]) => ({ value, label })),
		];
	}

	function buildOriginPoints(
		profiles: BreedReferenceProfile[],
	): OriginPoint[] {
		const buckets = new Map<
			string,
			{ origin: BreedReferenceOrigin; count: number }
		>();

		for (const profile of profiles) {
			const position = getBreedOriginMapPosition(profile.origin);
			if (!position) continue;

			const bucket = buckets.get(profile.origin.id);
			if (bucket) {
				bucket.count += 1;
				continue;
			}

			buckets.set(profile.origin.id, {
				origin: profile.origin,
				count: 1,
			});
		}

		return [...buckets.values()]
			.map((bucket) => {
				const position = getBreedOriginMapPosition(bucket.origin);
				return position
					? {
							origin: bucket.origin,
							label: originLabel(bucket.origin),
							count: bucket.count,
							...position,
						}
					: null;
			})
			.filter((point): point is OriginPoint => point !== null)
			.sort(
				(left, right) =>
					right.count - left.count ||
					left.label.localeCompare(right.label, i18n.locale),
			);
	}

	function buildWorldMapPoints(points: OriginPoint[]): MapPoint[] {
		const clusters: {
			left: number;
			top: number;
			count: number;
			points: OriginPoint[];
		}[] = [];

		for (const point of points) {
			const cluster = clusters.find(
				(item) => distanceBetweenMapPoints(item, point) <= 8,
			);
			if (!cluster) {
				clusters.push({
					left: point.left,
					top: point.top,
					count: point.count,
					points: [point],
				});
				continue;
			}

			const nextLength = cluster.points.length + 1;
			cluster.left =
				(cluster.left * cluster.points.length + point.left) /
				nextLength;
			cluster.top =
				(cluster.top * cluster.points.length + point.top) / nextLength;
			cluster.count += point.count;
			cluster.points.push(point);
		}

		return clusters.map((cluster) => {
			if (cluster.points.length === 1)
				return { ...cluster.points[0], kind: "origin" as const };

			return {
				kind: "cluster" as const,
				id: cluster.points.map((point) => point.origin.id).join(":"),
				label: cluster.points.map((point) => point.label).join(", "),
				count: cluster.count,
				left: cluster.left,
				top: cluster.top,
				originIds: cluster.points.map((point) => point.origin.id),
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

	function selectBreedId(id: string): void {
		selectedBreedId = id;
	}

	function selectOrigin(origin: BreedReferenceOrigin): void {
		originFilter = originFilter === origin.id ? "" : origin.id;
	}

	function breedDetailHref(profile: BreedReferenceProfile): string {
		return `/breeds/${profile.breedId}`;
	}

	async function loadProfiles() {
		loading = true;
		loadFailed = false;
		try {
			profiles = await loadBreedReferenceProfiles();
		} catch {
			loadFailed = true;
		} finally {
			loading = false;
		}
	}

	function selectMapPoint(point: MapPoint): void {
		if (point.kind === "cluster") {
			mapZoom = "detail";
			mapFocus = { left: point.left, top: point.top };
			return;
		}

		mapZoom = "detail";
		mapFocus = { left: point.left, top: point.top };
		selectOrigin(point.origin);
	}

	function setMapZoom(nextZoom: MapZoomLevel): void {
		mapZoom = nextZoom;
		mapDragState = null;

		if (nextZoom === "detail") {
			const selectedOriginPoint = originFilter
				? originPoints.find((point) => point.origin.id === originFilter)
				: null;
			if (selectedOriginPoint)
				mapFocus = {
					left: selectedOriginPoint.left,
					top: selectedOriginPoint.top,
				};
		}
	}

	function startMapPan(event: PointerEvent): void {
		if (mapZoom !== "detail") return;
		if (event.target !== event.currentTarget) return;

		const target = event.currentTarget as HTMLElement | null;
		target?.setPointerCapture(event.pointerId);
		mapDragState = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			startFocus: mapFocus,
			moved: false,
		};
	}

	function panMap(event: PointerEvent): void {
		if (
			mapZoom !== "detail" ||
			!mapDragState ||
			event.pointerId !== mapDragState.pointerId
		)
			return;

		const target = event.currentTarget as HTMLElement | null;
		const rect = target?.getBoundingClientRect();
		if (!rect || rect.width <= 0 || rect.height <= 0) return;

		const deltaX = event.clientX - mapDragState.startX;
		const deltaY = event.clientY - mapDragState.startY;
		const nextFocus = {
			left: clampMapFocus(
				mapDragState.startFocus.left - (deltaX / rect.width) * 25,
			),
			top: clampMapFocus(
				mapDragState.startFocus.top - (deltaY / rect.height) * 25,
			),
		};

		mapFocus = nextFocus;
		mapDragState = {
			...mapDragState,
			moved: mapDragState.moved || Math.hypot(deltaX, deltaY) > 4,
		};
	}

	function stopMapPan(event: PointerEvent): void {
		if (!mapDragState || event.pointerId !== mapDragState.pointerId) return;

		const target = event.currentTarget as HTMLElement | null;
		if (target?.hasPointerCapture(event.pointerId))
			target.releasePointerCapture(event.pointerId);
		mapDragState = null;
	}

	function mapPointTitle(point: MapPoint): string {
		if (point.kind === "cluster")
			return `${t("breedReference.mapCluster")}: ${point.label} (${point.count})`;
		return `${point.label} (${point.count})`;
	}

	function mapPointAriaLabel(point: MapPoint): string {
		if (point.kind === "cluster")
			return `${t("breedReference.mapCluster")}: ${point.label}`;
		return `${t("breedReference.mapPoint")}: ${point.label}`;
	}

	onMount(() => {
		void loadProfiles();
	});

	$effect(() => {
		selectedBreedId = resolveReferenceSelection(
			filteredProfiles,
			selectedBreedId,
			(profile) => profile.breedId,
		);
	});

	$effect(() => {
		if (!originFilter) return;

		const point = originPoints.find(
			(originPoint) => originPoint.origin.id === originFilter,
		);
		if (!point) return;

		mapZoom = "detail";
		mapFocus = { left: point.left, top: point.top };
	});
</script>

<svelte:head>
	<title>{t("breedReference.title")} | {t("app.name")}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-360 flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
	<header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
		<div>
			<h2 class="text-2xl font-semibold tracking-normal text-foreground">{t("breedReference.title")}</h2>
			<p class="mt-1 text-sm text-muted-foreground">{t("breedReference.description")}</p>
		</div>
		<div class="grid w-full max-w-[20rem] grid-cols-2 gap-1 rounded-md border border-border bg-muted p-1 shrink-0" role="tablist">
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === "list"}
				class="inline-flex h-9 items-center justify-center rounded-sm px-3 text-sm font-medium transition-all select-none {activeTab === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}"
				onclick={() => activeTab = "list"}
			>
				{t("breedReference.listTitle")}
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === "map"}
				class="inline-flex h-9 items-center justify-center rounded-sm px-3 text-sm font-medium transition-all select-none {activeTab === 'map' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}"
				onclick={() => activeTab = "map"}
			>
				{t("breedReference.mapTitle")}
			</button>
		</div>
	</header>

	{#if loadFailed}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
			{t("breedReference.loadFailed")}
		</p>
	{/if}

	{#if activeTab === "map"}
		<section class="rounded-md border border-border bg-card p-3 shadow-sm sm:p-4 animate-fade-in">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div class="min-w-0">
					<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<MapPin class="size-4" />
						{t("breedReference.mapTitle")}
					</div>
					<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
						{t("breedReference.mapDescription")}
					</p>
				</div>
				{#if originFilter}
					<button
						class="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
						type="button"
						onclick={() => (originFilter = "")}
						>{t("breedReference.clearOrigin")}</button
					>
				{/if}
			</div>
			<div
				class="mt-4 grid w-full max-w-xs grid-cols-2 gap-1 rounded-md border border-border bg-muted p-1"
				role="tablist"
				aria-label={t("breedReference.mapZoomLabel")}
			>
				<button
					class="inline-flex h-9 items-center justify-center rounded-sm px-3 text-sm font-medium transition-colors {mapZoom === 'world' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}"
					type="button"
					role="tab"
					aria-selected={mapZoom === "world"}
					onclick={() => setMapZoom("world")}
					>{t("breedReference.mapZoomWorld")}</button
				>
				<button
					class="inline-flex h-9 items-center justify-center rounded-sm px-3 text-sm font-medium transition-colors {mapZoom === 'detail' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}"
					type="button"
					role="tab"
					aria-selected={mapZoom === "detail"}
					onclick={() => setMapZoom("detail")}
					>{t("breedReference.mapZoomDetail")}</button
				>
			</div>

			<div
				class="relative mt-4 aspect-2/1 min-h-56 touch-none overflow-hidden rounded-md border border-border bg-muted/60 sm:min-h-72 {mapZoom === 'detail' ? mapDragState ? 'cursor-grabbing' : 'cursor-grab' : ''}"
				role="region"
				aria-label={t("breedReference.mapPanArea")}
				onpointerdown={startMapPan}
				onpointermove={panMap}
				onpointerup={stopMapPan}
				onpointercancel={stopMapPan}
			>
				<div
					class="pointer-events-none absolute inset-0 transition-transform ease-out {mapDragState ? 'duration-0' : 'duration-300'}"
					style={`transform: ${mapLayerTransform}; transform-origin: top left;`}
				>
					<img
						class="absolute inset-0 h-full w-full object-fill"
						src="/images/Equal-Earth-Physical-No-Type.jpeg"
						alt=""
						aria-hidden="true"
						draggable="false"
					/>
					<div class="absolute inset-0 bg-background/10"></div>
				</div>
				<div
					class="pointer-events-none absolute inset-0 transition-transform ease-out {mapDragState ? 'duration-0' : 'duration-300'}"
					style={`transform: ${mapLayerTransform}; transform-origin: top left;`}
				>
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
	{:else}
		<ReferenceExplorer
			bind:searchTerm
			searchPlaceholder={t("breedReference.searchPlaceholder")}
			filters={filterControls}
			cards={breedCards}
			selectedId={selectedProfile?.breedId ?? null}
			emptyLabel={t("breedReference.noResults")}
			openLabel={t("breedReference.openBreed")}
			{loading}
			onselect={selectBreedId}
			ondismiss={() => (selectedBreedId = null)}
		>
			{#snippet sidebar()}
				{#if selectedProfile}
					<ReferenceSummarySidebar
						title={breedName(selectedProfile)}
						fields={selectedSummaryFields}
						actionHref={breedDetailHref(selectedProfile)}
						actionLabel={t("breedReference.viewMore")}
						ondismiss={() => (selectedBreedId = null)}
					>
						{#snippet image()}
							<BinaryImage
								imageBytes={selectedProfile.primaryImage?.imageBytes ?? null}
								alt={breedName(selectedProfile)}
								className="h-[18vh] min-h-[90px] max-h-[170px] w-full rounded-b-none border-0 bg-muted/60"
								imageClass="h-full w-full object-contain p-3"
								iconClass="size-12 text-muted-foreground"
								fallbackIcon={PawPrint}
							/>
						{/snippet}
					</ReferenceSummarySidebar>
				{/if}
			{/snippet}
		</ReferenceExplorer>
	{/if}
</section>
