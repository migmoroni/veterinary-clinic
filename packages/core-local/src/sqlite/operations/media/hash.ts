export function bytesToSqlLiteral(value: Uint8Array): string {
	if (value.length === 0) throw new Error('media_required');
	const hex = Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
	return `X'${hex}'`;
}

export function nullableBytesToSqlLiteral(value: Uint8Array | null | undefined): string {
	return value && value.length > 0 ? bytesToSqlLiteral(value) : 'NULL';
}

export function normalizeMediaHash(value: unknown): Uint8Array | null {
	if (value == null) return null;
	if (value instanceof Uint8Array) return value.length === 32 ? value : null;
	if (value instanceof ArrayBuffer) return value.byteLength === 32 ? new Uint8Array(value) : null;
	if (Array.isArray(value)) {
		const bytes = value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item) && item >= 0 && item <= 255);
		return bytes.length === 32 ? Uint8Array.from(bytes.map((item) => item & 0xff)) : null;
	}
	if (typeof value === 'object' && value && 'data' in value) {
		const data = (value as { data?: unknown }).data;
		if (Array.isArray(data)) return normalizeMediaHash(data);
	}
	if (typeof value === 'string') return hexToMediaHash(value);
	return null;
}

export function mediaHashToHex(hash: Uint8Array): string {
	if (hash.length !== 32) throw new Error('media_hash_invalid');
	return Array.from(hash, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function hexToMediaHash(value: string): Uint8Array | null {
	const normalized = value.trim().toLowerCase();
	if (!/^[0-9a-f]{64}$/.test(normalized)) return null;
	const bytes = new Uint8Array(32);
	for (let index = 0; index < bytes.length; index += 1) {
		bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
	}
	return bytes;
}

export function mediaHashToSqlLiteral(hash: Uint8Array): string {
	return bytesToSqlLiteral(hash);
}

export function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	const buffer = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(buffer).set(bytes);
	return buffer;
}

export async function sha256Digest(bytes: Uint8Array): Promise<Uint8Array> {
	if (!globalThis.crypto?.subtle) throw new Error('media_hash_unavailable');
	return new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytesToArrayBuffer(bytes)));
}

export function normalizeMediaBytes(value: unknown): Uint8Array | null {
	if (value == null) return null;
	if (value instanceof Uint8Array) return value;
	if (value instanceof ArrayBuffer) return new Uint8Array(value);
	if (Array.isArray(value)) {
		const bytes = value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item) && item >= 0 && item <= 255);
		return Uint8Array.from(bytes.map((item) => item & 0xff));
	}
	if (typeof value === 'object' && value && 'data' in value) {
		const data = (value as { data?: unknown }).data;
		if (Array.isArray(data)) return normalizeMediaBytes(data);
	}
	return null;
}

export function uniqueMediaHashes(hashes: readonly Uint8Array[]): Uint8Array[] {
	const byHex = new Map<string, Uint8Array>();
	for (const hash of hashes) {
		if (hash.length !== 32) continue;
		byHex.set(mediaHashToHex(hash), hash);
	}
	return [...byHex.values()];
}

