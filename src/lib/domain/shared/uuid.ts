const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
	return UUID_PATTERN.test(value);
}

export function isUuidV4(value: string): boolean {
	return UUID_V4_PATTERN.test(value);
}

export function createUuidV4(): string {
	const cryptoApi = globalThis.crypto;
	if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
	if (typeof cryptoApi?.getRandomValues !== 'function') throw new Error('uuid_random_unavailable');

	const bytes = new Uint8Array(16);
	cryptoApi.getRandomValues(bytes);
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	return bytesToUuid(bytes);
}

function bytesToUuid(bytes: Uint8Array): string {
	const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
