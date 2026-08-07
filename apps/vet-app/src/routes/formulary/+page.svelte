<script lang="ts">
	import { onMount } from "svelte";
	import BinaryImage from "@vet/ui/components/shared/BinaryImage.svelte";
	import { ReferenceExplorer } from '@vet/modules/knowledge';
	import { type ReferenceFilterBarSelect } from "@vet/modules/knowledge";
	import { type ReferenceGridCard } from "@vet/modules/knowledge";
	import {
		ReferenceSummarySidebar,
		type ReferenceSummaryField,
	} from "@vet/modules/knowledge";
	import { activeIngredientSummaryClassificationGroups } from "@vet/modules/knowledge/active_ingredients";
	import { productClassificationLabel, productSummaryClassificationGroups } from "@vet/types/domain/product/classification.js";
	import {
		catalogRegionLabel,
		catalogRegionSummary,
	} from "@vet/modules/knowledge";
	import {
		conditionClassificationLabel,
		conditionClassificationGroups,
		manufacturerClassificationLabel,
		manufacturerClassificationGroups,
	} from "@vet/types/domain/catalog/classification-labels.js";
	import { catalogPathTypeLabel } from "@vet/types/domain/catalog/type-labels.js";
	import { activeIngredientClassificationLabel } from "@vet/types/domain/active-ingredient/classification.js";
	import {
		readReferenceRouteState,
		replaceReferenceRouteState,
	} from "@vet/modules/knowledge";
	import {
		referenceSpeciesLabel,
		referenceSpeciesOptions,
		resolveReferenceSelection,
	} from "@vet/modules/knowledge";
	import { filterCatalogSearchItems, type CatalogSearchItem } from "@vet/app-services/search";
	import {
		ACTIVE_INGREDIENT_TYPES,
		stringifyActiveIngredientType,
		type ActiveIngredientCatalogItem,
	} from "@vet/types/domain/active-ingredient/catalog.js";
	import {
		CONDITION_CLASSIFICATION_AXES,
		CONDITION_TYPES,
		stringifyConditionType,
		type ConditionCatalogItem,
	} from "@vet/types/domain/condition/catalog.js";
	import { type ManufacturerCatalogItem } from "@vet/types/domain/manufacturer/catalog.js";
	import {
		PRODUCT_TYPES,
		productTreatmentKind,
		productTypeMain,
		type ProductCatalogItem,
		type ProductSpecies,
	} from "@vet/types/domain/product/catalog.js";
	import {
		productTypeHierarchicalFilterOptions,
		productTypeLabel,
	} from "@vet/types/domain/product/type-labels.js";
	import { MANUFACTURER_CLASSIFICATION_AXES } from "@vet/types/domain/manufacturer/catalog.js";
	import { i18n, t, type TranslationKey } from "@vet/core-local/i18n/index.js";
	import {
		loadCatalogActiveIngredients,
		loadCatalogConditions,
		loadCatalogManufacturers,
		loadCatalogProducts,
		type CatalogEntityKind,
	} from "@vet/modules/knowledge";
	import Activity from "@lucide/svelte/icons/activity";
	import Building2 from "@lucide/svelte/icons/building-2";
	import FlaskConical from "@lucide/svelte/icons/flask-conical";
	import Info from "@lucide/svelte/icons/info";
	import Pill from "@lucide/svelte/icons/pill";
	import Syringe from "@lucide/svelte/icons/syringe";

	type TypeFilter = "all" | string;
	type SpeciesFilter = "all" | ProductSpecies;
	type CatalogItem = CatalogSearchItem;

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
	let manufacturerFilter = $state("");
	let regionFilter = $state("");
	let selectedItemKey = $state<string | null>(null);
	let routeStateReady = $state(false);
	let initialSelectionResolved = $state(false);

	const routeStateKeys = [
		"q",
		"catalog",
		"type",
		"species",
		"manufacturer",
		"region",
		"selected",
	] as const;
	const routeStateDefaults = {
		q: "",
		catalog: "all",
		type: "all",
		species: "all",
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
		return filterCatalogSearchItems({
			query: searchTerm,
			items: currentItems,
			filters: {
				type: catalogKind === "product" || catalogKind === "activeIngredient" || catalogKind === "condition" ? typeFilter : "all",
				species: catalogKind === "product" ? speciesFilter : "all",
				manufacturer: catalogKind === "product" ? manufacturerFilter : "",
				region: regionFilter,
			},
			locale: i18n.locale,
		});
	});
	const selectedItem = $derived(
		filteredItems.find((item) => item.id === selectedItemKey) ?? null,
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
						...productTypeHierarchicalFilterOptions(
							PRODUCT_TYPES,
							t,
							t("formulary.allKinds"),
						).slice(1),
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
							value: stringifyActiveIngredientType(type),
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
				detail: manufacturerClassificationSummary(item),
				meta: "",
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
				detail: conditionClassificationSummary(condition),
				meta: "",
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
			detail: activeIngredientClassificationSummary(activeIngredient),
			meta: "",
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
					rowGroups: productSummaryClassificationGroups(
						product,
						t,
						t("common.notInformed"),
					),
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
					rowGroups: activeIngredientSummaryClassificationGroups(
						activeIngredient,
						t,
						i18n.locale,
						t("common.notInformed"),
					),
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
					rowGroups: conditionClassificationGroups(
						condition.extension.classification,
						CONDITION_CLASSIFICATION_AXES,
						t,
						t("common.notInformed"),
					),
				},
				{
					label: t("product.regions"),
					value: catalogRegionSummary(condition.regions),
				},
			];
		}

		return [
			{
				label: t("formulary.kind"),
				value: t("catalog.manufacturer"),
			},
			{
				label: t("formulary.classification"),
				rowGroups: manufacturerClassificationGroups(
					(item as ManufacturerCatalogItem).extension.classification,
					MANUFACTURER_CLASSIFICATION_AXES,
					t,
					t("common.notInformed"),
				),
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

	function productClassificationSummary(product: ProductCatalogItem): string {
		return productClassificationLabel(product, t) ?? t("common.notInformed");
	}

	function manufacturerClassificationSummary(
		manufacturer: ManufacturerCatalogItem,
	): string {
		return (
			manufacturerClassificationLabel(
				manufacturer.extension.classification,
				MANUFACTURER_CLASSIFICATION_AXES,
				t,
			) ?? t("common.notInformed")
		);
	}

	function activeIngredientClassificationSummary(
		activeIngredient: ActiveIngredientCatalogItem,
	): string {
		return (
			activeIngredientClassificationLabel(
				activeIngredient.extension.classification,
				t,
				i18n.locale,
			) ?? t("common.notInformed")
		);
	}

	function conditionClassificationSummary(
		condition: ConditionCatalogItem,
	): string {
		return (
			conditionClassificationLabel(
				condition.extension.classification,
				CONDITION_CLASSIFICATION_AXES,
				t,
			) ?? t("common.notInformed")
		);
	}

	function activeIngredientTypeLabel(
		type: ActiveIngredientCatalogItem["type"],
	): string {
		return catalogPathTypeLabel("catalog.activeIngredient.type", type, t);
	}

	function conditionTypeLabel(type: ConditionCatalogItem["type"]): string {
		return catalogPathTypeLabel("catalog.condition.type", type, t);
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
		return productTreatmentKind(item.type) === "vaccine" ? Syringe : Pill;
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

	function restoreRouteState(): void {
		const state = readReferenceRouteState(routeStateKeys);
		searchTerm = state.q ?? "";
		catalogKind = validCatalogKind(state.catalog);
		typeFilter = state.type ?? "all";
		speciesFilter = validSpeciesFilter(state.species);
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
			{ fallbackToFirst: !initialSelectionResolved },
		);
		initialSelectionResolved = true;
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
						: itemKindLabel(selectedItem.kind)}
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
								className="h-[18vh] min-h-22.5 max-h-42.5 w-full rounded-b-none border-0 bg-muted/60"
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
								className="h-[18vh] min-h-22.5 max-h-42.5 w-full rounded-b-none border-0 bg-muted/60"
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
