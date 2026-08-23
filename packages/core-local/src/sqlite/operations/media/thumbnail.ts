import { bytesToArrayBuffer } from './hash.js';

export function inferMimeType(bytes: Uint8Array): string {
	if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
	if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
	if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
	if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
	if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) return 'application/pdf';
	return 'application/octet-stream';
}

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
	return new Uint8Array(await blob.arrayBuffer());
}

async function canvasToWebp(canvas: HTMLCanvasElement): Promise<Uint8Array | null> {
	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.72));
	if (!blob || blob.size === 0) return null;
	return blobToBytes(blob);
}

export async function createImageThumbnail(bytes: Uint8Array, mimeType: string): Promise<{ thumbnail: Uint8Array | null; width: number | null; height: number | null }> {
	if (!mimeType.startsWith('image/')) return { thumbnail: null, width: null, height: null };
	if (typeof Blob === 'undefined' || typeof createImageBitmap !== 'function' || typeof document === 'undefined') return { thumbnail: null, width: null, height: null };

	const blob = new Blob([bytesToArrayBuffer(bytes)], { type: mimeType });
	const bitmap = await createImageBitmap(blob).catch(() => null);
	if (!bitmap) return { thumbnail: null, width: null, height: null };

	try {
		const maxSide = 200;
		const ratio = Math.min(maxSide / bitmap.width, maxSide / bitmap.height, 1);
		const width = Math.max(1, Math.round(bitmap.width * ratio));
		const height = Math.max(1, Math.round(bitmap.height * ratio));
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext('2d');
		if (!context) return { thumbnail: null, width: bitmap.width, height: bitmap.height };
		context.drawImage(bitmap, 0, 0, width, height);
		return { thumbnail: await canvasToWebp(canvas), width: bitmap.width, height: bitmap.height };
	} finally {
		bitmap.close();
	}
}
