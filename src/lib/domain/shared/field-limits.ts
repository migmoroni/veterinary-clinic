export const FIELD_LIMITS = {
	ownerName: 120,
	ownerStreet: 160,
	ownerStreetNumber: 32,
	ownerAddressComplement: 80,
	ownerNeighborhood: 120,
	ownerCity: 120,
	ownerState: 80,
	ownerCountry: 3,
	ownerPostalCode: 32,
	ownerAdditionalInformation: 2000,
	ownerContactLabel: 64,
	ownerContactPhoneValue: 32,
	ownerContactEmailValue: 254,
	ownerContactOtherValue: 120,
	ownerAdditionalResponsibleName: 120,
	veterinarianName: 120,
	veterinarianProfessionalRegistration: 80,
	workplaceName: 160,
	workplaceServicesDescription: 6000,
	imageCollectionEntityType: 80,
	imageDescription: 2000,
	petName: 80,
	petBirthDate: 10,
	petSpecies: 80,
	petBreed: 80,
	petSex: 1,
	breedReferenceId: 80,
	breedReferenceLabelKey: 120,
	breedReferenceOriginId: 80,
	breedReferenceOriginCountryCode: 2,
	breedReferenceRangeJson: 256,
	breedReferenceExtensionJson: 24000,
	medicalRecordTitle: 160,
	medicalRecordDescription: 36000,
	isoDate: 10,
	settingKey: 80,
	settingValue: 4096,
	backupPath: 2048,
	backupKind: 32,
	treatmentName: 80,
	treatmentNormalizedName: 80,
	treatmentDose: 120,
	treatmentValidityDays: 3650,
	treatmentValidityMonths: 120,
	treatmentValidityYears: 10,
	treatmentObservation: 2000,
	medicationManufacturer: 120,
	medicationSpeciesJson: 256,
	medicationRegionsJson: 1024,
	medicationAlias: 80,
	medicationAliasesJson: 1000,
	medicationExtensionJson: 64000,
	medicationProtocolName: 120,
	medicationProtocolNormalizedName: 120,
	searchQuery: 160
} as const;

export type FieldLimitKey = keyof typeof FIELD_LIMITS;

export function textLength(value: string | null | undefined): number {
	return Array.from(value ?? '').length;
}

export function truncateText(value: string, maxLength: number): string {
	const characters = Array.from(value);
	return characters.length <= maxLength ? value : characters.slice(0, maxLength).join('');
}

export function assertTextLimit(value: string | null | undefined, maxLength: number, error = 'field_limit_exceeded'): void {
	if (textLength(value) > maxLength) throw new Error(error);
}

export function requireLimitedText(value: string | null | undefined, maxLength: number, requiredError = 'field_required'): string {
	const trimmed = value?.trim() ?? '';
	if (!trimmed) throw new Error(requiredError);
	assertTextLimit(trimmed, maxLength);
	return trimmed;
}

export function nullableLimitedText(value: string | null | undefined, maxLength: number): string | null {
	const trimmed = value?.trim() ?? '';
	if (!trimmed) return null;
	assertTextLimit(trimmed, maxLength);
	return trimmed;
}

export function nullableMultilineText(value: string | null | undefined, maxLength: number): string | null {
	const raw = value ?? '';
	if (!raw.trim()) return null;
	assertTextLimit(raw, maxLength);
	return raw;
}
