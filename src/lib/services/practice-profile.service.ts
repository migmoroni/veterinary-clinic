import type {
	PracticeIdentity,
	PracticeProfiles,
	VeterinarianProfile,
	VeterinarianProfileInput,
	Workplace,
	WorkplaceInput
} from '$lib/domain/practice-profile/practice-profile.js';
import {
	getPracticeIdentity,
	getPracticeProfiles,
	saveVeterinarianProfile,
	saveWorkplace
} from '$lib/persistence/repositories/practice-profile.repository.js';

export const PRACTICE_IDENTITY_CHANGED_EVENT = 'practice-identity-changed';

export async function loadPracticeProfiles(): Promise<PracticeProfiles> {
	return getPracticeProfiles();
}

export async function loadPracticeIdentity(): Promise<PracticeIdentity> {
	return getPracticeIdentity();
}

function notifyPracticeIdentityChanged(identity?: PracticeIdentity): void {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent<PracticeIdentity | undefined>(PRACTICE_IDENTITY_CHANGED_EVENT, { detail: identity }));
}

export function requestPracticeIdentityRefresh(): void {
	notifyPracticeIdentityChanged();
}

export async function saveVeterinarianSettings(input: VeterinarianProfileInput): Promise<VeterinarianProfile> {
	const profile = await saveVeterinarianProfile(input);
	notifyPracticeIdentityChanged(await getPracticeIdentity());
	return profile;
}

export async function saveWorkplaceSettings(input: WorkplaceInput): Promise<Workplace> {
	const workplace = await saveWorkplace(input);
	notifyPracticeIdentityChanged(await getPracticeIdentity());
	return workplace;
}
