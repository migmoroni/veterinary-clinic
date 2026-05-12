export function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	const buffer = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(buffer).set(bytes);
	return buffer;
}


export function normalizeByteArray(value: unknown): Uint8Array | null {
	if (value == null) return null;

	if (value instanceof Uint8Array) return value;
	if (value instanceof ArrayBuffer) return new Uint8Array(value);

	if (Array.isArray(value)) {
		const bytes = value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item) && item >= 0 && item <= 255);
		return Uint8Array.from(bytes.map((item) => item & 0xff));
	}

	if (typeof value === 'object' && value && 'data' in value) {
		const data = (value as { data?: unknown }).data;
		if (Array.isArray(data)) {
			const bytes = data.filter((item): item is number => typeof item === 'number' && Number.isFinite(item) && item >= 0 && item <= 255);
			return Uint8Array.from(bytes.map((item) => item & 0xff));
		}
	}

	return null;
}