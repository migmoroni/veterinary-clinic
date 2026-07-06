import type { MedicationProtocol, MedicationProtocolDoseInput, MedicationProtocolInput, MedicationProtocolKind } from '$lib/domain/medication/protocol.js';
import { deleteMedicationProtocol, deleteMedicationProtocolDose, listMedicationProtocols, saveMedicationProtocol, saveMedicationProtocolDose, setMedicationProtocolHidden } from '$lib/persistence/repositories/medication-protocol.repository.js';

export async function loadMedicationProtocols(kind?: MedicationProtocolKind, includeHidden = false): Promise<MedicationProtocol[]> {
	return listMedicationProtocols(kind, includeHidden);
}

export async function saveProtocol(input: MedicationProtocolInput, id?: number): Promise<MedicationProtocol> {
	return saveMedicationProtocol(input, id);
}

export async function setProtocolHidden(id: number, hidden: boolean): Promise<MedicationProtocol> {
	return setMedicationProtocolHidden(id, hidden);
}

export async function removeProtocol(id: number): Promise<void> {
	await deleteMedicationProtocol(id);
}

export async function saveProtocolDose(protocolId: number, input: MedicationProtocolDoseInput, id?: number): Promise<MedicationProtocol> {
	return saveMedicationProtocolDose(protocolId, input, id);
}

export async function removeProtocolDose(protocolId: number, doseId: number): Promise<MedicationProtocol> {
	return deleteMedicationProtocolDose(protocolId, doseId);
}