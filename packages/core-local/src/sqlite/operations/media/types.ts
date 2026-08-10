export type MediaSyncStatus = 'pending' | 'synced' | 'error';
export type MediaStoreSource = 'user' | 'system';

export interface MediaBlobInsertOptions {
	mimeType?: string | null;
	thumbnail?: Uint8Array | null;
	width?: number | null;
	height?: number | null;
}

export interface MediaGalleryRow {
	hash: Uint8Array;
	thumbnail: Uint8Array | null;
	width: number | null;
	height: number | null;
	mime_type: string;
}

