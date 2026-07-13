<script lang="ts">
	import { onMount } from "svelte";
	import BinaryImage from "$lib/components/shared/BinaryImage.svelte";
	import ReferenceExplorer from "$lib/components/reference/ReferenceExplorer.svelte";
	import { type ReferenceFilterBarSelect } from "$lib/components/reference/ReferenceFilterBar.svelte";
	import { type ReferenceGridCard } from "$lib/components/reference/ReferenceCardGrid.svelte";
	import ReferenceSummarySidebar, {
		type ReferenceSummaryField,
	} from "$lib/components/reference/ReferenceSummarySidebar.svelte";
	import {
		catalogOriginLabel,
		catalogRegionLabel,
		catalogRegionSummary,
	} from "$lib/components/catalog/catalog-detail-utils.js";
	import {
		readReferenceRouteState,
		replaceReferenceRouteState,
	} from "$lib/components/reference/reference-route-state.js";
	import {
		normalizeReferenceSearch,
		referenceSpeciesLabel,
		referenceSpeciesOptions,
		resolveReferenceSelection,
	} from "$lib/components/reference/reference-utils.js";
	import {
		ACTIVE_INGREDIENT_TYPES,
		activeIngredientTypeSubtype,
		type ActiveIngredientCatalogItem,
	} from "$lib/domain/active-ingredient/catalog.js";
	import {
		CONDITION_TYPES,
		conditionTypeSubtype,
		stringifyConditionType,
		type ConditionCatalogItem,
	} from "$lib/domain/condition/catalog.js";
	import { type ManufacturerCatalogItem } from "$lib/domain/manufacturer/catalog.js";
	import {
		PRODUCT_TYPES,
		productLeafletSectionIds,
		productTypeMain,
		productTypeSubtype,
		stringifyProductType,
		type ProductCatalogItem,
		type ProductCatalogOrigin,
		type ProductSpecies,
		type ProductType,
	} from "$lib/domain/product/catalog.js";
	import { productTypeLabel } from "$lib/domain/product/type-labels.js";
	import { i18n, t, type TranslationKey } from "$lib/i18n/index.js";
	import {
		loadCatalogActiveIngredients,
		loadCatalogConditions,
		loadCatalogManufacturers,
		loadCatalogProducts,
		type CatalogEntityKind,
	} from "$lib/services/catalog.service.js";
	import Activity from "@lucide/svelte/icons/activity";
	import Building2 from "@lucide/svelte/icons/building-2";
	import FlaskConical from "@lucide/svelte/icons/flask-conical";
	import Info from "@lucide/svelte/icons/info";
	import Pill from "@lucide/svelte/icons/pill";
	import Syringe from "@lucide/svelte/icons/syringe";

	type TypeFilter = "all" | string;
	type SpeciesFilter = "all" | ProductSpecies;
	type OriginFilter = "all" | ProductCatalogOrigin;
	type CatalogItem =
		| (ProductCatalogItem & { kind: "product" })
		| (ManufacturerCatalogItem & { kind: "manufacturer" })
		| (ActiveIngredientCatalogItem & { kind: "activeIngredient" })
		| (ConditionCatalogItem & { kind: "condition" });

	let products = $state<(ProductCatalogItem & { kind: "product" })[]>([]);
	let manufacturers = $state<
		(ManufacturerCatalogItem & { kind: "manufacturer" })[]
	>([]);
	let activeIngredients = $state<
		(ActiveIngredientCatalogItem & { kind: "activeIngredient" })[]
	>([]);
	let conditions = $state<(ConditionCatalogItem & { kind: "condition" })[]>(
		[],
	);
	let loading = $state(true);
	let errorKey = $state<TranslationKey | null>(null);
	let searchTerm = $state("");
	type CatalogKind = "all" | CatalogEntityKind;
	let catalogKind = $state<CatalogKind>("all");
	let typeFilter = $state<TypeFilter>("all");
	let speciesFilter = $state<SpeciesFilter>("all");
	let originFilter = $state<OriginFilter>("all");
	let manufacturerFilter = $state("");
	let regionFilter = $state("");
	let selectedItemKey = $state<string | null>(null);
	let routeStateReady = $state(false);

	const routeStateKeys = [
		"q",
		"catalog",
		"type",
		"species",
		"origin",
		"manufacturer",
		"region",
		"selected",
	] as const;
	const routeStateDefaults = {
		q: "",
		catalog: "all",
		type: "all",
		species: "all",
		origin: "all",
		manufacturer: "",
		region: "",
		selected: "",
	};

	const catalogKinds: CatalogEntityKind[] = [
		"product",
		"manufacturer",
		"activeIngredient",
		"condition",
	];
	const currentItems = $derived.by<CatalogItem[]>(() => {
		const items =
			catalogKind === "all"
				? [...products, ...manufacturers, ...activeIngredients, ...conditions]
				: catalogKind === "product"
					? products
					: catalogKind === "manufacturer"
						? manufacturers
						: catalogKind === "activeIngredient"
							? activeIngredients
							: conditions;
		return [...items].sort((a, b) =>
			a.name.localeCompare(b.name, i18n.locale),
		);
	});
	const filteredItems = $derived.by<CatalogItem[]>(() => {
		const search = normalizeReferenceSearch(searchTerm);

		return currentItems.filter((item) => {
			if (originFilter !== "all" && item.origin !== originFilter)
				return false;
			if (regionFilter && !item.regions.includes(regionFilter))
				return false;

			if (item.kind === "product") {
				const product = item as ProductCatalogItem;
				if (
					typeFilter !== "all" &&
					stringifyProductType(product.type) !== typeFilter
				)
					return false;
				if (
					speciesFilter !== "all" &&
					!product.species.includes(speciesFilter)
				)
					return false;
				if (
					manufacturerFilter &&
					product.manufacturerName !== manufacturerFilter
				)
					return false;
			}

			if (item.kind === "activeIngredient" && typeFilter !== "all") {
				const activeIngredient = item as ActiveIngredientCatalogItem;
				if (JSON.stringify(activeIngredient.type) !== typeFilter)
					return false;
			}

			if (item.kind === "condition" && typeFilter !== "all") {
				const condition = item as ConditionCatalogItem;
				if (stringifyConditionType(condition.type) !== typeFilter)
					return false;
			}

			if (!search) return true;
			return normalizeReferenceSearch(searchableText(item)).includes(
				search,
			);
		});
	});
	const selectedItem = $derived(
		filteredItems.find((item) => item.id === selectedItemKey) ??
			filteredItems[0] ??
			null,
	);
	const cards = $derived<ReferenceGridCard[]>(filteredItems.map(cardForItem));
	const selectedSummaryFields = $derived<ReferenceSummaryField[]>(
		selectedItem ? summaryFields(selectedItem) : [],
	);
	const manufacturerOptions = $derived([
		{ value: "", label: t("formulary.allManufacturers") },
		...[
			...new Set(
				products
					.map((item) => item.manufacturerName)
					.filter((value): value is string => Boolean(value)),
			),
		]
			.sort((left, right) => left.localeCompare(right, i18n.locale))
			.map((manufacturer) => ({
				value: manufacturer,
				label: manufacturer,
			})),
	]);
	const regionOptions = $derived([
		{ value: "", label: t("formulary.allRegions") },
		...[...new Set(currentItems.flatMap((item) => item.regions))]
			.sort((left, right) =>
				catalogRegionLabel(left).localeCompare(
					catalogRegionLabel(right),
					i18n.locale,
				),
			)
			.map((region) => ({ value: region, label: catalogRegionLabel(region) })),
	]);
	const filterControls = $derived.by<ReferenceFilterBarSelect[]>(() => {
		const controls: ReferenceFilterBarSelect[] = [
			{
				id: "formulary-origin-filter",
				label: t("formulary.originFilter"),
				value: originFilter,
				options: [
					{ value: "all", label: t("formulary.allOrigins") },
					{ value: "system", label: t("formulary.origin.system") },
					{ value: "user", label: t("formulary.origin.user") },
				],
				onchange: (value) => (originFilter = value as OriginFilter),
			},
			{
				id: "formulary-region-filter",
				label: t("formulary.regionFilter"),
				value: regionFilter,
				options: regionOptions,
				onchange: (value) => (regionFilter = value),
			},
		];

		if (catalogKind === "product") {
			return [
				{
					id: "formulary-kind-filter",
					label: t("formulary.kindFilter"),
					value: typeFilter,
					options: [
						{ value: "all", label: t("formulary.allKinds") },
						...PRODUCT_TYPES.map((type) => ({
							value: typeFilterValue(type),
							label: productTypeLabel(type, t),
						})),
					],
					onchange: (value) => (typeFilter = value as TypeFilter),
				},
				{
					id: "formulary-species-filter",
					label: t("formulary.speciesFilter"),
					value: speciesFilter,
					options: referenceSpeciesOptions(
						t("breedReference.allSpecies"),
						t("pet.speciesCanine"),
						t("pet.speciesFeline"),
					),
					onchange: (value) =>
						(speciesFilter = value as SpeciesFilter),
				},
				{
					id: "formulary-manufacturer-filter",
					label: t("formulary.manufacturerFilter"),
					value: manufacturerFilter,
					options: manufacturerOptions,
					onchange: (value) => (manufacturerFilter = value),
				},
				...controls,
			];
		}

		if (catalogKind === "activeIngredient") {
			return [
				{
					id: "formulary-active-ingredient-type-filter",
					label: t("formulary.kindFilter"),
					value: typeFilter,
					options: [
						{ value: "all", label: t("formulary.allKinds") },
						...ACTIVE_INGREDIENT_TYPES.map((type) => ({
							value: JSON.stringify(type),
							label: activeIngredientTypeLabel(
								type as ActiveIngredientCatalogItem["type"],
							),
						})),
					],
					onchange: (value) => (typeFilter = value as TypeFilter),
				},
				...controls,
			];
		}

		if (catalogKind === "condition") {
			return [
				{
					id: "formulary-condition-type-filter",
					label: t("formulary.kindFilter"),
					value: typeFilter,
					options: [
						{ value: "all", label: t("formulary.allKinds") },
						...CONDITION_TYPES.map((type) => ({
							value: stringifyConditionType(type),
							label: conditionTypeLabel(type as ConditionCatalogItem["type"]),
						})),
					],
					onchange: (value) => (typeFilter = value as TypeFilter),
				},
				...controls,
			];
		}

		return controls;
	});

	function itemKindLabel(kind: CatalogEntityKind): string {
		if (kind === "manufacturer") return t("catalog.manufacturers");
		if (kind === "activeIngredient") return t("catalog.activeIngredients");
		if (kind === "condition") return t("catalog.conditions");
		return t("catalog.products");
	}

	function asProduct(item: CatalogItem): ProductCatalogItem {
		return item as ProductCatalogItem;
	}

	function cardForItem(item: CatalogItem): ReferenceGridCard {
		if (item.kind === "product") {
			const product = item as ProductCatalogItem;
			const metaParts = [productTypeLabel(product.type, t)];
			if (product.origin === "user") {
				metaParts.push(catalogOriginLabel(product.origin));
			}
			return {
				id: product.id,
				title: product.name,
				subtitle: product.manufacturerName ?? t("common.notInformed"),
				detail: speciesSummary(product.species),
				meta: metaParts.join(" · "),
				imageBytes: product.primaryImage?.imageBytes ?? null,
				imageAlt: product.name,
				fallbackIcon: productFallbackIcon(product),
			};
		}

		if (item.kind === "manufacturer") {
			return {
				id: item.id,
				title: item.name,
				subtitle: t("catalog.manufacturer"),
				detail: catalogRegionSummary(item.regions),
				meta: item.origin === "user" ? catalogOriginLabel(item.origin) : "",
				imageBytes: item.primaryImage?.imageBytes ?? null,
				imageAlt: item.name,
				fallbackIcon: Building2,
			};
		}

		if (item.kind === "condition") {
			const condition = item as ConditionCatalogItem;
			return {
				id: condition.id,
				title: condition.name,
				subtitle: conditionTypeLabel(condition.type),
				detail: condition.extension.classification ?? null,
				meta:
					condition.origin === "user"
						? catalogOriginLabel(condition.origin)
						: "",
				imageBytes: condition.primaryImage?.imageBytes ?? null,
				imageAlt: condition.name,
				fallbackIcon: Activity,
			};
		}

		const activeIngredient = item as ActiveIngredientCatalogItem;
		return {
			id: activeIngredient.id,
			title: activeIngredient.name,
			subtitle: activeIngredientTypeLabel(activeIngredient.type),
			detail: activeIngredient.extension.classification ?? null,
			meta:
				activeIngredient.origin === "user"
					? catalogOriginLabel(activeIngredient.origin)
					: "",
			imageBytes: activeIngredient.primaryImage?.imageBytes ?? null,
			imageAlt: activeIngredient.name,
			fallbackIcon: FlaskConical,
		};
	}

	function summaryFields(item: CatalogItem): ReferenceSummaryField[] {
		if (item.kind === "product") {
			const product = item as ProductCatalogItem;
			return [
				{
					label: t("formulary.kind"),
					value: productTypeLabel(product.type, t),
				},
				{
					label: t("formulary.classification"),
					value:
						product.extension.classification ??
						t("common.notInformed"),
				},
				{
					label: t("product.species"),
					value: speciesSummary(product.species),
				},
				{
					label: t("catalog.activeIngredients"),
					value: activeIngredientSummary(product),
				},
				{
					label: t("product.regions"),
					value: catalogRegionSummary(product.regions),
				},
			];
		}

		if (item.kind === "activeIngredient") {
			const activeIngredient = item as ActiveIngredientCatalogItem;
			return [
				{
					label: t("formulary.kind"),
					value: activeIngredientTypeLabel(activeIngredient.type),
				},
				{
					label: t("formulary.classification"),
					value:
						activeIngredient.extension.classification ??
						t("common.notInformed"),
				},
				{
					label: t("product.regions"),
					value: catalogRegionSummary(activeIngredient.regions),
				},
			];
		}

		if (item.kind === "condition") {
			const condition = item as ConditionCatalogItem;
			return [
				{
					label: t("formulary.kind"),
					value: conditionTypeLabel(condition.type),
				},
				{
					label: t("formulary.classification"),
					value:
						condition.extension.classification ??
						t("common.notInformed"),
				},
				{
					label: t("product.regions"),
					value: catalogRegionSummary(condition.regions),
				},
			];
		}

		return [
			{
				label: t("formulary.originFilter"),
				value: catalogOriginLabel(item.origin),
			},
			{ label: t("product.regions"), value: catalogRegionSummary(item.regions) },
		];
	}

	function itemDetailHref(item: CatalogItem): string {
		if (item.kind === "manufacturer")
			return `/formulary/manufacturers/${item.id}`;
		if (item.kind === "activeIngredient")
			return `/formulary/active-ingredients/${item.id}`;
		if (item.kind === "condition")
			return `/formulary/conditions/${item.id}`;
		return `/formulary/products/${item.id}`;
	}

	function searchableText(item: CatalogItem): string {
		if (item.kind === "product") {
			const product = item as ProductCatalogItem;
			return [
				product.name,
				product.manufacturerName,
				activeIngredientSummary(product),
				productTypeLabel(product.type, t),
				catalogOriginLabel(product.origin),
				speciesSummary(product.species),
				catalogRegionSummary(product.regions),
				product.aliases.join(" "),
				product.extension.classification,
				product.extension.commercialLine,
				...productLeafletSectionIds.map(
					(sectionId) =>
						product.extension.sections[sectionId]?.trim() ?? "",
				),
			]
				.filter(Boolean)
				.join(" ");
		}

		return [
			item.name,
			item.aliases.join(" "),
			item.kind === "condition"
				? conditionTypeLabel((item as ConditionCatalogItem).type)
				: "",
			item.kind === "condition"
				? ((item as ConditionCatalogItem).extension.classification ?? "")
				: "",
			catalogOriginLabel(item.origin),
			catalogRegionSummary(item.regions),
			...Object.values(item.extension.sections ?? {}),
		]
			.filter(Boolean)
			.join(" ");
	}

	function typeFilterValue(type: ProductType): string {
		return stringifyProductType(type);
	}

	function activeIngredientTypeLabel(
		type: ActiveIngredientCatalogItem["type"],
	): string {
		return activeIngredientTypeSubtype(type) === "combination"
			? t("catalog.activeIngredient.type.combination")
			: t("catalog.activeIngredient.type.substance");
	}

	function conditionTypeLabel(type: ConditionCatalogItem["type"]): string {
		const subtype = conditionTypeSubtype(type);
		if (subtype === "syndrome") return t("catalog.condition.type.syndrome");
		if (subtype === "disorder") return t("catalog.condition.type.disorder");
		if (subtype === "injury") return t("catalog.condition.type.injury");
		return t("catalog.condition.type.disease");
	}

	function speciesLabel(species: ProductSpecies): string {
		return referenceSpeciesLabel(
			species,
			t("pet.speciesCanine"),
			t("pet.speciesFeline"),
		);
	}

	function speciesSummary(species: readonly ProductSpecies[]): string {
		return species.map(speciesLabel).join(", ");
	}

	function activeIngredientSummary(item: ProductCatalogItem): string {
		if (item.activeIngredients.length > 0)
			return item.activeIngredients
				.map((ingredient) => ingredient.name)
				.join(", ");
		return t("common.notInformed");
	}

	function productFallbackIcon(item: ProductCatalogItem) {
		if (productTypeMain(item.type) !== "medication") return Info;
		return productTypeSubtype(item.type) === "vaccine" ? Syringe : Pill;
	}

	function validCatalogKind(value: string | undefined): CatalogKind {
		if (
			value === "product" ||
			value === "manufacturer" ||
			value === "activeIngredient" ||
			value === "condition"
		)
			return value;
		return "all";
	}

	function validSpeciesFilter(value: string | undefined): SpeciesFilter {
		return value === "canine" || value === "feline" ? value : "all";
	}

	function validOriginFilter(value: string | undefined): OriginFilter {
		return value === "system" || value === "user" ? value : "all";
	}

	function restoreRouteState(): void {
		const state = readReferenceRouteState(routeStateKeys);
		searchTerm = state.q ?? "";
		catalogKind = validCatalogKind(state.catalog);
		typeFilter = state.type ?? "all";
		speciesFilter = validSpeciesFilter(state.species);
		originFilter = validOriginFilter(state.origin);
		manufacturerFilter = state.manufacturer ?? "";
		regionFilter = state.region ?? "";
		selectedItemKey = state.selected || null;
	}

	function syncRouteState(): void {
		if (!routeStateReady) return;
		replaceReferenceRouteState(
			{
				q: searchTerm,
				catalog: catalogKind,
				type: typeFilter,
				species: speciesFilter,
				origin: originFilter,
				manufacturer: manufacturerFilter,
				region: regionFilter,
				selected: selectedItemKey,
			},
			routeStateDefaults,
		);
	}

	function getKindIcon(kind: CatalogEntityKind) {
		if (kind === "manufacturer") return Building2;
		if (kind === "activeIngredient") return FlaskConical;
		if (kind === "condition") return Activity;
		return Pill;
	}

	function catalogFallbackIcon(item: CatalogItem) {
		if (item.kind === "manufacturer") return Building2;
		if (item.kind === "activeIngredient") return FlaskConical;
		if (item.kind === "condition") return Activity;
		return productFallbackIcon(item as ProductCatalogItem);
	}

	function selectCatalogKind(kind: CatalogEntityKind) {
		if (catalogKind === kind) {
			catalogKind = "all";
		} else {
			catalogKind = kind;
		}
		typeFilter = "all";
		speciesFilter = "all";
		manufacturerFilter = "";
		regionFilter = "";
		selectedItemKey = null;
	}

	function selectItem(id: string): void {
		selectedItemKey = id;
		syncRouteState();
	}

	function openSelectedItem(): void {
		if (selectedItem) selectedItemKey = selectedItem.id;
		syncRouteState();
	}

	async function loadItems() {
		loading = true;
		errorKey = null;
		try {
			const [
				loadedProducts,
				loadedManufacturers,
				loadedActiveIngredients,
				loadedConditions,
			] = await Promise.all([
				loadCatalogProducts(true, true),
				loadCatalogManufacturers(true, true),
				loadCatalogActiveIngredients(true, true),
				loadCatalogConditions(true, true),
			]);
			products = loadedProducts.map((p) => ({
				...p,
				kind: "product" as const,
			}));
			manufacturers = loadedManufacturers.map((m) => ({
				...m,
				kind: "manufacturer" as const,
			}));
			activeIngredients = loadedActiveIngredients.map((a) => ({
				...a,
				kind: "activeIngredient" as const,
			}));
			conditions = loadedConditions.map((condition) => ({
				...condition,
				kind: "condition" as const,
			}));
		} catch {
			errorKey = "formulary.loadFailed";
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		restoreRouteState();
		routeStateReady = true;
		void loadItems();
	});

	$effect(() => {
		if (loading) return;
		selectedItemKey = resolveReferenceSelection(
			filteredItems,
			selectedItemKey,
			(item) => item.id,
		);
	});

	$effect(() => {
		syncRouteState();
	});
</script>

<svelte:head>
	<title>{t("formulary.title")} | {t("app.name")}</title>
</svelte:head>

<section
	class="mx-auto flex w-full max-w-360 flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6"
>
	{#if errorKey}
		<p
			class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm"
		>
			{t(errorKey)}
		</p>
	{/if}

	<ReferenceExplorer
		bind:searchTerm
		title={t("formulary.title")}
		searchPlaceholder={t("formulary.searchPlaceholder")}
		filters={filterControls}
		{cards}
		selectedId={selectedItem?.id ?? null}
		emptyLabel={t("formulary.noResults")}
		openLabel={t("formulary.viewMore")}
		{loading}
		onselect={selectItem}
		ondismiss={() => (selectedItemKey = null)}
	>
		{#snippet beforeSearch()}
			<div class="flex items-center">
				<div
					class="flex gap-1 rounded-lg border border-border bg-muted/30 p-1 shrink-0 h-9 items-center"
				>
					{#each catalogKinds as kind}
						{@const Icon = getKindIcon(kind)}
						<button
							type="button"
							title={itemKindLabel(kind)}
							aria-label={itemKindLabel(kind)}
							class="inline-flex h-8 w-10 items-center justify-center rounded-sm transition-all select-none {catalogKind ===
							kind
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground hover:bg-muted'}"
							onclick={() => selectCatalogKind(kind)}
						>
							<Icon class="size-4" />
						</button>
					{/each}
				</div>
			</div>
		{/snippet}

		{#snippet sidebar()}
			{#if selectedItem}
				<ReferenceSummarySidebar
					title={selectedItem.name}
					subtitle={selectedItem.kind === "product"
						? (asProduct(selectedItem).manufacturerName ??
							t("common.notInformed"))
						: catalogOriginLabel(selectedItem.origin)}
					fields={selectedSummaryFields}
					actionHref={itemDetailHref(selectedItem)}
					actionLabel={t("formulary.viewMore")}
					onopen={openSelectedItem}
					ondismiss={() => (selectedItemKey = null)}
				>
					{#snippet image()}
						{#if selectedItem.kind === "product"}
							<BinaryImage
								imageBytes={asProduct(selectedItem).primaryImage
									?.imageBytes ?? null}
								alt={selectedItem.name}
								className="h-[18vh] min-h-[90px] max-h-[170px] w-full rounded-b-none border-0 bg-muted/60"
								imageClass="h-full w-full object-contain p-3"
								iconClass="size-10 text-primary"
								fallbackIcon={productFallbackIcon(
									asProduct(selectedItem),
								)}
							/>
						{:else}
							<BinaryImage
								imageBytes={selectedItem.primaryImage
									?.imageBytes ?? null}
								alt={selectedItem.name}
								className="h-[18vh] min-h-[90px] max-h-[170px] w-full rounded-b-none border-0 bg-muted/60"
								imageClass="h-full w-full object-contain p-3"
								iconClass="size-10 text-primary"
								fallbackIcon={catalogFallbackIcon(selectedItem)}
							/>
						{/if}
					{/snippet}
				</ReferenceSummarySidebar>
			{/if}
		{/snippet}
	</ReferenceExplorer>
</section>
