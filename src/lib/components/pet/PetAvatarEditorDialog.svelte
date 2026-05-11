<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import X from '@lucide/svelte/icons/x';

	const AVATAR_FRAME_SIZE = 720;
	const AVATAR_MAX_BYTES = 1_000_000;
	const PREVIEW_SIZE = 320;
	const MIN_EXPORT_SIZE = 256;
	const DESKTOP_CAMERA_CONSTRAINTS_CANDIDATES: MediaStreamConstraints[] = [
		{ audio: false, video: true }
	];
	const MOBILE_CAMERA_CONSTRAINTS_CANDIDATES: MediaStreamConstraints[] = [
		{
			audio: false,
			video: {
				width: { ideal: 1280 },
				height: { ideal: 720 },
				facingMode: { exact: 'environment' }
			}
		},
		{
			audio: false,
			video: {
				width: { ideal: 1280 },
				height: { ideal: 720 },
				facingMode: { ideal: 'environment' }
			}
		},
		{
			audio: false,
			video: {
				width: { ideal: 1280 },
				height: { ideal: 720 },
				facingMode: { ideal: 'user' }
			}
		},
		...DESKTOP_CAMERA_CONSTRAINTS_CANDIDATES
	];

	let {
		initialAvatarBytes = null,
		onApply,
		onRemove,
		onClose
	}: {
		initialAvatarBytes?: Uint8Array | null;
		onApply: (bytes: Uint8Array) => void;
		onRemove: () => void;
		onClose: () => void;
	} = $props();

	let fileInput = $state<HTMLInputElement | null>(null);
	let previewCanvas = $state<HTMLCanvasElement | null>(null);
	let cameraVideo = $state<HTMLVideoElement | null>(null);

	let sourceImage = $state<HTMLImageElement | null>(null);
	let sourceWidth = $state(0);
	let sourceHeight = $state(0);
	let sourceObjectUrl = $state<string | null>(null);

	let zoom = $state(1);
	let offsetX = $state(0);
	let offsetY = $state(0);

	let cameraBusy = $state(false);
	let cameraOpen = $state(false);
	let cameraStream = $state<MediaStream | null>(null);
	let processing = $state(false);
	let errorKey = $state<TranslationKey | null>(null);

	let dragPointerId = $state<number | null>(null);
	let dragStartX = 0;
	let dragStartY = 0;
	let dragStartOffsetX = 0;
	let dragStartOffsetY = 0;

	const hasImage = $derived(Boolean(sourceImage && sourceWidth > 0 && sourceHeight > 0));
	const hasInitialAvatar = $derived(Boolean(initialAvatarBytes && initialAvatarBytes.length > 0));

	function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
		const buffer = new ArrayBuffer(bytes.byteLength);
		new Uint8Array(buffer).set(bytes);
		return buffer;
	}

	function clamp(value: number, min: number, max: number): number {
		return Math.max(min, Math.min(max, value));
	}

	function cameraConstraintsCandidates(): MediaStreamConstraints[] {
		if (typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
			return MOBILE_CAMERA_CONSTRAINTS_CANDIDATES;
		}

		return DESKTOP_CAMERA_CONSTRAINTS_CANDIDATES;
	}

	function cameraConstraintKey(constraints: MediaStreamConstraints): string {
		return JSON.stringify(constraints);
	}

	function addCameraConstraintCandidate(queue: MediaStreamConstraints[], seen: Set<string>, constraints: MediaStreamConstraints) {
		const key = cameraConstraintKey(constraints);
		if (seen.has(key)) return;

		seen.add(key);
		queue.push(constraints);
	}

	async function appendVideoInputConstraints(queue: MediaStreamConstraints[], seen: Set<string>): Promise<void> {
		const devices = await navigator.mediaDevices?.enumerateDevices?.().catch(() => []) ?? [];

		for (const device of devices) {
			if (device.kind !== 'videoinput' || !device.deviceId) continue;

			addCameraConstraintCandidate(queue, seen, {
				audio: false,
				video: {
					deviceId: { exact: device.deviceId }
				}
			});
		}
	}

	async function buildCameraConstraintQueue(): Promise<{ queue: MediaStreamConstraints[]; seen: Set<string> }> {
		const queue: MediaStreamConstraints[] = [];
		const seen = new Set<string>();

		for (const constraints of cameraConstraintsCandidates()) {
			addCameraConstraintCandidate(queue, seen, constraints);
		}

		await appendVideoInputConstraints(queue, seen);

		return { queue, seen };
	}

	function hasRenderableCameraFrame(video: HTMLVideoElement): boolean {
		if (video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) return false;

		try {
			const canvas = document.createElement('canvas');
			canvas.width = 32;
			canvas.height = 18;

			const context = canvas.getContext('2d', { willReadFrequently: true });
			if (!context) return true;

			context.drawImage(video, 0, 0, canvas.width, canvas.height);

			const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
			let brightest = 0;
			let darkest = 255;
			let litPixels = 0;

			for (let index = 0; index < pixels.length; index += 4) {
				const brightness = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
				brightest = Math.max(brightest, brightness);
				darkest = Math.min(darkest, brightness);

				if (brightness > 8) {
					litPixels += 1;
				}
			}

			return litPixels > 0 || brightest - darkest > 6;
		} catch {
			return true;
		}
	}

	function waitForCameraVideo(video: HTMLVideoElement, timeoutMs = 5000): Promise<boolean> {
		if (hasRenderableCameraFrame(video)) return Promise.resolve(true);

		return new Promise((resolve) => {
			let settled = false;
			let timeoutId: number;
			let animationFrameId: number | null = null;

			const cleanup = () => {
				video.removeEventListener('loadedmetadata', onReady);
				video.removeEventListener('canplay', onReady);
				if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
				window.clearTimeout(timeoutId);
			};

			const finish = (ready: boolean) => {
				if (settled) return;
				settled = true;
				cleanup();
				resolve(ready);
			};

			const onReady = () => {
				if (hasRenderableCameraFrame(video)) finish(true);
			};

			const checkFrame = () => {
				if (hasRenderableCameraFrame(video)) {
					finish(true);
					return;
				}

				animationFrameId = window.requestAnimationFrame(checkFrame);
			};

			video.addEventListener('loadedmetadata', onReady);
			video.addEventListener('canplay', onReady);
			animationFrameId = window.requestAnimationFrame(checkFrame);
			timeoutId = window.setTimeout(() => finish(hasRenderableCameraFrame(video)), timeoutMs);
		});
	}

	async function attachCameraStream(stream: MediaStream): Promise<boolean> {
		cameraStream = stream;
		cameraOpen = true;

		await tick();
		if (!cameraVideo) return false;

		cameraVideo.srcObject = stream;
		await cameraVideo.play().catch(() => undefined);

		return waitForCameraVideo(cameraVideo);
	}

	function computeDrawMetrics(frameSize: number) {
		if (!sourceImage || sourceWidth <= 0 || sourceHeight <= 0) return null;

		const baseScale = Math.max(frameSize / sourceWidth, frameSize / sourceHeight);
		const drawWidth = sourceWidth * baseScale * zoom;
		const drawHeight = sourceHeight * baseScale * zoom;
		const maxOffsetX = Math.max(0, (drawWidth - frameSize) / 2);
		const maxOffsetY = Math.max(0, (drawHeight - frameSize) / 2);

		return { drawWidth, drawHeight, maxOffsetX, maxOffsetY };
	}

	function clampOffsets(frameSize: number, nextOffsetX: number, nextOffsetY: number) {
		const metrics = computeDrawMetrics(frameSize);
		if (!metrics) return { x: 0, y: 0 };

		return {
			x: clamp(nextOffsetX, -metrics.maxOffsetX, metrics.maxOffsetX),
			y: clamp(nextOffsetY, -metrics.maxOffsetY, metrics.maxOffsetY)
		};
	}

	function renderPreview() {
		const canvas = previewCanvas;
		if (!canvas) return;

		const context = canvas.getContext('2d');
		if (!context) return;

		context.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
		if (!sourceImage) return;

		const metrics = computeDrawMetrics(PREVIEW_SIZE);
		if (!metrics) return;

		const clampedOffsets = clampOffsets(PREVIEW_SIZE, offsetX, offsetY);
		const left = (PREVIEW_SIZE - metrics.drawWidth) / 2 + clampedOffsets.x;
		const top = (PREVIEW_SIZE - metrics.drawHeight) / 2 + clampedOffsets.y;

		context.imageSmoothingEnabled = true;
		context.imageSmoothingQuality = 'high';
		context.drawImage(sourceImage, left, top, metrics.drawWidth, metrics.drawHeight);
	}

	$effect(() => {
		previewCanvas;
		sourceImage;
		sourceWidth;
		sourceHeight;
		zoom;
		offsetX;
		offsetY;
		renderPreview();
	});

	async function loadImage(url: string): Promise<HTMLImageElement> {
		const image = new Image();
		image.src = url;

		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(new Error('avatar_image_load_failed'));
		});

		return image;
	}

	function revokeSourceObjectUrl() {
		if (sourceObjectUrl && typeof URL !== 'undefined') {
			URL.revokeObjectURL(sourceObjectUrl);
		}
		sourceObjectUrl = null;
	}

	async function setSourceFromBlob(blob: Blob): Promise<void> {
		if (typeof URL === 'undefined') throw new Error('avatar_url_unavailable');

		const nextUrl = URL.createObjectURL(blob);

		try {
			const image = await loadImage(nextUrl);
			revokeSourceObjectUrl();
			sourceObjectUrl = nextUrl;
			sourceImage = image;
			sourceWidth = image.naturalWidth;
			sourceHeight = image.naturalHeight;
			zoom = 1;
			offsetX = 0;
			offsetY = 0;
			errorKey = null;
		} catch (error) {
			URL.revokeObjectURL(nextUrl);
			throw error;
		}
	}

	async function loadSourceFromBytes(bytes: Uint8Array): Promise<void> {
		if (typeof Blob === 'undefined') return;
		await setSourceFromBlob(new Blob([bytesToArrayBuffer(bytes)], { type: 'image/png' }));
	}

	function closeDialog() {
		stopCamera();
		onClose();
	}

	function cancelIfIdle() {
		if (!processing) closeDialog();
	}

	function closeIfBackdrop(event: PointerEvent) {
		if (event.currentTarget === event.target) cancelIfIdle();
	}

	function pickFile() {
		fileInput?.click();
	}

	async function onFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		input.value = '';

		if (!file) return;
		if (!file.type.startsWith('image/')) {
			errorKey = 'pet.avatarFileInvalid';
			return;
		}

		try {
			await setSourceFromBlob(file);
		} catch {
			errorKey = 'pet.avatarFileInvalid';
		}
	}

	function stopCamera() {
		if (cameraVideo) cameraVideo.srcObject = null;

		if (cameraStream) {
			for (const track of cameraStream.getTracks()) track.stop();
		}

		cameraStream = null;
		cameraOpen = false;
	}

	async function startCamera() {
		errorKey = null;

		if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
			errorKey = 'pet.avatarCameraUnavailable';
			return;
		}

		cameraBusy = true;
		stopCamera();

		try {
			const { queue, seen } = await buildCameraConstraintQueue();
			let denied = false;
			let cameraReady = false;

			for (let index = 0; index < queue.length; index += 1) {
				try {
					const stream = await navigator.mediaDevices.getUserMedia(queue[index]);
					cameraReady = await attachCameraStream(stream);

					if (cameraReady) {
						break;
					}

					stopCamera();
					await appendVideoInputConstraints(queue, seen);
				} catch (error) {
					if (error instanceof DOMException && error.name === 'NotAllowedError') {
						denied = true;
						break;
					}

					await appendVideoInputConstraints(queue, seen);
				}
			}

			if (denied) {
				errorKey = 'pet.avatarCameraDenied';
				stopCamera();
				return;
			}

			if (!cameraReady) {
				errorKey = 'pet.avatarCameraUnavailable';
				stopCamera();
			}
		} catch (error) {
			if (error instanceof DOMException && error.name === 'NotAllowedError') {
				errorKey = 'pet.avatarCameraDenied';
			} else {
				errorKey = 'pet.avatarCameraUnavailable';
			}
			stopCamera();
		} finally {
			cameraBusy = false;
		}
	}

	function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
		return new Promise((resolve, reject) => {
			canvas.toBlob((blob) => {
				if (blob) {
					resolve(blob);
					return;
				}
				reject(new Error('avatar_blob_failed'));
			}, type);
		});
	}

	async function captureCamera() {
		if (!cameraVideo) {
			errorKey = 'pet.avatarCameraUnavailable';
			return;
		}

		const width = cameraVideo.videoWidth;
		const height = cameraVideo.videoHeight;
		if (width <= 0 || height <= 0) {
			errorKey = 'pet.avatarCameraUnavailable';
			return;
		}

		try {
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;

			const context = canvas.getContext('2d');
			if (!context) throw new Error('avatar_context_failed');

			context.imageSmoothingEnabled = true;
			context.imageSmoothingQuality = 'high';
			context.drawImage(cameraVideo, 0, 0, width, height);

			const blob = await canvasToBlob(canvas, 'image/png');
			await setSourceFromBlob(blob);
			stopCamera();
		} catch {
			errorKey = 'pet.avatarProcessingError';
		}
	}

	function startDrag(event: PointerEvent) {
		if (!hasImage || processing) return;
		const target = event.currentTarget as HTMLCanvasElement | null;
		if (!target) return;

		dragPointerId = event.pointerId;
		dragStartX = event.clientX;
		dragStartY = event.clientY;
		dragStartOffsetX = offsetX;
		dragStartOffsetY = offsetY;
		target.setPointerCapture(event.pointerId);
	}

	function onDrag(event: PointerEvent) {
		if (dragPointerId !== event.pointerId) return;

		const deltaX = event.clientX - dragStartX;
		const deltaY = event.clientY - dragStartY;
		const nextOffsets = clampOffsets(PREVIEW_SIZE, dragStartOffsetX + deltaX, dragStartOffsetY + deltaY);
		offsetX = nextOffsets.x;
		offsetY = nextOffsets.y;
	}

	function endDrag(event: PointerEvent) {
		if (dragPointerId !== event.pointerId) return;
		const target = event.currentTarget as HTMLCanvasElement | null;

		if (target?.hasPointerCapture(event.pointerId)) {
			target.releasePointerCapture(event.pointerId);
		}

		dragPointerId = null;
	}

	function onZoomChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const parsed = Number(input.value);
		if (!Number.isFinite(parsed)) return;

		zoom = clamp(parsed, 1, 4);
		const nextOffsets = clampOffsets(PREVIEW_SIZE, offsetX, offsetY);
		offsetX = nextOffsets.x;
		offsetY = nextOffsets.y;
	}

	async function renderAvatarBlob(exportSize: number): Promise<Blob> {
		if (!sourceImage) throw new Error('avatar_source_missing');

		const metrics = computeDrawMetrics(PREVIEW_SIZE);
		if (!metrics) throw new Error('avatar_metrics_missing');

		const clamped = clampOffsets(PREVIEW_SIZE, offsetX, offsetY);
		const scale = exportSize / PREVIEW_SIZE;

		const canvas = document.createElement('canvas');
		canvas.width = exportSize;
		canvas.height = exportSize;

		const context = canvas.getContext('2d');
		if (!context) throw new Error('avatar_context_failed');

		context.imageSmoothingEnabled = true;
		context.imageSmoothingQuality = 'high';

		const drawWidth = metrics.drawWidth * scale;
		const drawHeight = metrics.drawHeight * scale;
		const left = ((PREVIEW_SIZE - metrics.drawWidth) / 2 + clamped.x) * scale;
		const top = ((PREVIEW_SIZE - metrics.drawHeight) / 2 + clamped.y) * scale;

		context.drawImage(sourceImage, left, top, drawWidth, drawHeight);
		return canvasToBlob(canvas, 'image/png');
	}

	async function buildAvatarBytes(): Promise<Uint8Array> {
		let exportSize = AVATAR_FRAME_SIZE;

		for (let attempt = 0; attempt < 12; attempt += 1) {
			const blob = await renderAvatarBlob(exportSize);
			if (blob.size <= AVATAR_MAX_BYTES) {
				return new Uint8Array(await blob.arrayBuffer());
			}

			if (exportSize <= MIN_EXPORT_SIZE) break;
			exportSize = Math.max(MIN_EXPORT_SIZE, Math.floor(exportSize * 0.85));
		}

		throw new Error('avatar_too_large');
	}

	async function applyAvatar() {
		if (!hasImage) {
			errorKey = 'pet.avatarFileInvalid';
			return;
		}

		processing = true;
		errorKey = null;

		try {
			const bytes = await buildAvatarBytes();
			onApply(bytes);
			closeDialog();
		} catch (error) {
			errorKey = error instanceof Error && error.message === 'avatar_too_large' ? 'pet.avatarTooLarge' : 'pet.avatarProcessingError';
		} finally {
			processing = false;
		}
	}

	function removeAvatar() {
		onRemove();
		closeDialog();
	}

	onMount(() => {
		if (initialAvatarBytes && initialAvatarBytes.length > 0) {
			void loadSourceFromBytes(initialAvatarBytes).catch(() => {
				errorKey = 'pet.avatarProcessingError';
			});
		}
	});

	onDestroy(() => {
		stopCamera();
		revokeSourceObjectUrl();
	});
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="presentation" onpointerdown={closeIfBackdrop}>
	<div class="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col rounded-md border border-border bg-card shadow-xl" role="dialog" aria-modal="true" aria-label={t('pet.avatarDialogTitle')}>
		<header class="flex items-start justify-between gap-3 border-b border-border p-4">
			<div class="min-w-0">
				<h3 class="truncate text-base font-semibold">{t('pet.avatarDialogTitle')}</h3>
				<p class="mt-1 text-sm text-muted-foreground">{t('pet.avatarDialogDescription')}</p>
			</div>

			<button type="button" class="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50" aria-label={t('actions.cancel')} title={t('actions.cancel')} disabled={processing} onclick={cancelIfIdle}>
				<X class="size-4" />
			</button>
		</header>

		<div class="grid gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
			<section class="space-y-3">
				<div class="mx-auto w-full max-w-88">
					<div class="relative aspect-square overflow-hidden rounded-full border-2 border-primary/50 bg-muted shadow-inner">
						<canvas
							bind:this={previewCanvas}
							class="h-full w-full touch-none select-none {hasImage ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}"
							width={PREVIEW_SIZE}
							height={PREVIEW_SIZE}
							onpointerdown={startDrag}
							onpointermove={onDrag}
							onpointerup={endDrag}
							onpointercancel={endDrag}
						></canvas>
						{#if !hasImage}
							<div class="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted-foreground">{t('pet.avatarNoImage')}</div>
						{/if}
					</div>
				</div>

				<label class="flex flex-col gap-1 text-sm font-medium">
					<span>{t('pet.avatarZoom')}</span>
					<input type="range" min="1" max="4" step="0.01" value={zoom} class="accent-primary" disabled={!hasImage || processing} oninput={onZoomChange} />
				</label>

				<p class="text-xs text-muted-foreground">{t('pet.avatarMoveHint')}</p>

				{#if errorKey}
					<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{t(errorKey)}</p>
				{/if}
			</section>

			<aside class="space-y-3">
				<div class="grid gap-2">
					<button type="button" class="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={processing} onclick={pickFile}>
						{t('pet.avatarSelectFile')}
					</button>

					<button type="button" class="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={cameraBusy || processing} onclick={() => void startCamera()}>
						{cameraBusy ? t('common.loading') : t('pet.avatarUseCamera')}
					</button>
				</div>

				<input bind:this={fileInput} type="file" class="hidden" accept="image/*" onchange={onFileChange} />

				{#if cameraOpen}
					<div class="rounded-md border border-border bg-background p-2">
						<video bind:this={cameraVideo} class="aspect-video w-full rounded-md bg-black" autoplay playsinline muted></video>
						<div class="mt-2 grid gap-2 sm:grid-cols-2">
							<button type="button" class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={processing} onclick={() => void captureCamera()}>
								{t('pet.avatarCapture')}
							</button>
							<button type="button" class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={processing} onclick={stopCamera}>
								{t('pet.avatarStopCamera')}
							</button>
						</div>
					</div>
				{/if}

				<p class="rounded-md bg-muted p-3 text-xs text-muted-foreground">{t('pet.avatarHint')}</p>
			</aside>
		</div>

		<footer class="grid gap-2 border-t border-border p-4 sm:grid-cols-[1fr_auto_auto] sm:justify-end">
			<button type="button" class="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={processing} onclick={cancelIfIdle}>
				{t('actions.cancel')}
			</button>

			{#if hasInitialAvatar}
				<button type="button" class="inline-flex h-10 items-center justify-center rounded-md border border-destructive/40 bg-background px-4 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={processing} onclick={removeAvatar}>
					{t('pet.avatarRemove')}
				</button>
			{/if}

			<button type="button" class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={processing || !hasImage} onclick={() => void applyAvatar()}>
				{processing ? t('record.saving') : t('pet.avatarApply')}
			</button>
		</footer>
	</div>
</div>
