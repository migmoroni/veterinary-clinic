import { invoke } from '@tauri-apps/api/core';

export interface BackupReplicationStatus {
	enabled: boolean;
	targetPath: string | null;
	effectivePath: string | null;
	usingFallback: boolean;
	destinationAvailable: boolean;
	pendingMicro: number;
	pendingC1: number;
	pendingC2: number;
	pendingC3: number;
	pendingTotal: number;
	lastError: string | null;
}

export type ReplicationStorageDomain = 'userData' | 'userMedia' | 'userLogs';

export interface CasMediaPayload {
	hashHex: string;
	bytes: number[];
}

export interface PatchEnvelope {
	sequenceId: number;
	domain: ReplicationStorageDomain;
	deviceId: string;
	createdAt: number;
	patchBytes: number[];
	mediaFiles: CasMediaPayload[];
}

export async function setBackupTargetPath(path: string): Promise<BackupReplicationStatus> {
	return invoke<BackupReplicationStatus>('set_backup_target_path', { path });
}

export async function getBackupReplicationStatus(): Promise<BackupReplicationStatus> {
	return invoke<BackupReplicationStatus>('get_backup_status');
}

export async function applyInboundPatch(envelope: PatchEnvelope): Promise<void> {
	await invoke('apply_inbound_patch', { envelope });
}
