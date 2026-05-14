<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import X from '@lucide/svelte/icons/x';
	import Select from '$lib/components/ui/Select.svelte';

	const DEFAULT_FRAME_SIZE = 720;
	const DEFAULT_MAX_BYTES = 1_000_000;
	const DEFAULT_PREVIEW_SIZE = 320;
	const DEFAULT_MIN_EXPORT_SIZE = 256;
	const DESKTOP_CAMERA_CONSTRAINTS_CANDIDATES: MediaStreamConstraints[] = [{ audio: false, video: true }];
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

	type CameraDevice = { deviceId: string; label: string };
	type VideoFrameCallbackMetadata = { width?: number; height?: number; presentedFrames?: number };
	type VideoFrameCallback = (now: number, metadata: VideoFrameCallbackMetadata) => void;
	type VideoFrameElement = HTMLVideoElement & {
		requestVideoFrameCallback?: (callback: VideoFrameCallback) => number;
		cancelVideoFrameCallback?: (handle: number) => void;
	};
	type ImageCaptureDialogLabels = {
		title: TranslationKey;
		description: TranslationKey;
		noImage: TranslationKey;
		selectFile: TranslationKey;
		useCamera: TranslationKey;
		cameraSelect: TranslationKey;
		cameraAuto: TranslationKey;
		cameraFallback: TranslationKey;
		capture: TranslationKey;
		stopCamera: TranslationKey;
		zoom: TranslationKey;
		moveHint: TranslationKey;
		hint: TranslationKey;
		apply: TranslationKey;
		remove: TranslationKey;
		cameraUnavailable: TranslationKey;
		cameraDenied: TranslationKey;
		fileInvalid: TranslationKey;
		processingError: TranslationKey;
		tooLarge: TranslationKey;
		saving: TranslationKey;
		cancel: TranslationKey;
	};

	let {
		initialImageBytes = null,
		canRemove = false,
		frameSize = DEFAULT_FRAME_SIZE,
		maxBytes = DEFAULT_MAX_BYTES,
		previewSize = DEFAULT_PREVIEW_SIZE,
		minExportSize = DEFAULT_MIN_EXPORT_SIZE,
		outputMimeType = 'image/png',
		outputQuality = undefined,
		labels,
		onApply,
		onRemove,
		onClose
	}: {
		initialImageBytes?: Uint8Array | null;
		canRemove?: boolean;
		frameSize?: number;
		maxBytes?: number;
		previewSize?: number;
		minExportSize?: number;
		outputMimeType?: string;
		outputQuality?: number;
		labels: ImageCaptureDialogLabels;
		onApply: (bytes: Uint8Array) => void;
		onRemove?: () => void;
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
	let cameraDevices = $state<CameraDevice[]>([]);
	let selectedCameraDeviceId = $state('');
	let processing = $state(false);
	let errorKey = $state<TranslationKey | null>(null);

	let dragPointerId = $state<number | null>(null);
	let dragStartX = 0;
	let dragStartY = 0;
	let dragStartOffsetX = 0;
	let dragStartOffsetY = 0;

	const hasImage = $derived(Boolean(sourceImage && sourceWidth > 0 && sourceHeight > 0));
	const hasRemoveAction = $derived(Boolean(canRemove && onRemove));

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

	function cameraDeviceConstraint(deviceId: string): MediaStreamConstraints {
		return {
			audio: false,
			video: {
				deviceId: { exact: deviceId }
			}
		};
	}

	async function listCameraDevices(): Promise<CameraDevice[]> {
		if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return [];

		const devices = await navigator.mediaDevices.enumerateDevices().catch((): MediaDeviceInfo[] => []);
		const seen = new Set<string>();
		const cameras: CameraDevice[] = [];

		for (const device of devices) {
			if (device.kind !== 'videoinput' || !device.deviceId || seen.has(device.deviceId)) continue;

			seen.add(device.deviceId);
			cameras.push({
				deviceId: device.deviceId,
				label: device.label.trim()
			});
		}

		return cameras;
	}

	function syncSelectedCameraDevice(devices: CameraDevice[]) {
		if (devices.length > 0 && selectedCameraDeviceId && !devices.some((device) => device.deviceId === selectedCameraDeviceId)) {
			selectedCameraDeviceId = '';
		}
	}

	async function refreshCameraDevices(): Promise<CameraDevice[]> {
		const devices = await listCameraDevices();
		cameraDevices = devices;
		syncSelectedCameraDevice(devices);
		return devices;
	}

	async function appendVideoInputConstraints(queue: MediaStreamConstraints[], seen: Set<string>, devices: CameraDevice[] | null = null): Promise<void> {
		const videoDevices = devices ?? (cameraDevices.length > 0 ? cameraDevices : await refreshCameraDevices());

		for (const device of videoDevices) {
			addCameraConstraintCandidate(queue, seen, cameraDeviceConstraint(device.deviceId));
		}
	}

	async function buildCameraConstraintQueue(): Promise<{ queue: MediaStreamConstraints[]; seen: Set<string> }> {
		const queue: MediaStreamConstraints[] = [];
		const seen = new Set<string>();
		const devices = await refreshCameraDevices();

		if (selectedCameraDeviceId) {
			addCameraConstraintCandidate(queue, seen, cameraDeviceConstraint(selectedCameraDeviceId));
			return { queue, seen };
		}

		for (const constraints of cameraConstraintsCandidates()) {
			addCameraConstraintCandidate(queue, seen, constraints);
		}

		await appendVideoInputConstraints(queue, seen, devices);

		return { queue, seen };
	}

	function cameraOptionLabel(device: CameraDevice, index: number): string {
		return device.label || `${t(labels.cameraFallback)} ${index + 1}`;
	}

	async function onCameraDeviceChange(value: string) {
		selectedCameraDeviceId = value;

		if (cameraOpen && !cameraBusy && !processing) {
			await startCamera();
		}
	}

	function hasDecodedCameraFrame(video: HTMLVideoElement): boolean {
		return video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0;
	}

	function waitForCameraVideo(video: HTMLVideoElement, timeoutMs = 5000): Promise<boolean> {
		if (hasDecodedCameraFrame(video)) return Promise.resolve(true);

		return new Promise((resolve) => {
			const frameVideo = video as VideoFrameElement;
			let settled = false;
			let timeoutId: number;
			let animationFrameId: number | null = null;
			let videoFrameCallbackId: number | null = null;

			const cleanup = () => {
				video.removeEventListener('loadedmetadata', onReady);
				video.removeEventListener('loadeddata', onReady);
				video.removeEventListener('canplay', onReady);
				video.removeEventListener('playing', onReady);
				if (videoFrameCallbackId !== null) frameVideo.cancelVideoFrameCallback?.(videoFrameCallbackId);
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
				if (hasDecodedCameraFrame(video)) finish(true);
			};

			const onVideoFrame: VideoFrameCallback = () => finish(hasDecodedCameraFrame(video));

			const checkFrameMetadata = () => {
				if (hasDecodedCameraFrame(video)) {
					finish(true);
					return;
				}

				animationFrameId = window.requestAnimationFrame(checkFrameMetadata);
			};

			video.addEventListener('loadedmetadata', onReady);
			video.addEventListener('loadeddata', onReady);
			video.addEventListener('canplay', onReady);
			video.addEventListener('playing', onReady);

			if (frameVideo.requestVideoFrameCallback) {
				videoFrameCallbackId = frameVideo.requestVideoFrameCallback(onVideoFrame);
			} else {
				animationFrameId = window.requestAnimationFrame(checkFrameMetadata);
			}

			timeoutId = window.setTimeout(() => finish(hasDecodedCameraFrame(video)), timeoutMs);
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

	function computeDrawMetrics(currentFrameSize: number) {
		if (!sourceImage || sourceWidth <= 0 || sourceHeight <= 0) return null;

		const baseScale = Math.max(currentFrameSize / sourceWidth, currentFrameSize / sourceHeight);
		const drawWidth = sourceWidth * baseScale * zoom;
		const drawHeight = sourceHeight * baseScale * zoom;
		const maxOffsetX = Math.max(0, (drawWidth - currentFrameSize) / 2);
		const maxOffsetY = Math.max(0, (drawHeight - currentFrameSize) / 2);

		return { drawWidth, drawHeight, maxOffsetX, maxOffsetY };
	}

	function clampOffsets(currentFrameSize: number, nextOffsetX: number, nextOffsetY: number) {
		const metrics = computeDrawMetrics(currentFrameSize);
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

		context.clearRect(0, 0, previewSize, previewSize);
		if (!sourceImage) return;

		const metrics = computeDrawMetrics(previewSize);
		if (!metrics) return;

		const clampedOffsets = clampOffsets(previewSize, offsetX, offsetY);
		const left = (previewSize - metrics.drawWidth) / 2 + clampedOffsets.x;
		const top = (previewSize - metrics.drawHeight) / 2 + clampedOffsets.y;

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
		previewSize;
		renderPreview();
	});

	async function loadImage(url: string): Promise<HTMLImageElement> {
		const image = new Image();
		image.src = url;

		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(new Error('image_load_failed'));
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
		if (typeof URL === 'undefined') throw new Error('image_url_unavailable');

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
		await setSourceFromBlob(new Blob([bytesToArrayBuffer(bytes)], { type: outputMimeType }));
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
			errorKey = labels.fileInvalid;
			return;
		}

		try {
			await setSourceFromBlob(file);
		} catch {
			errorKey = labels.fileInvalid;
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
			errorKey = labels.cameraUnavailable;
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
						await refreshCameraDevices();
						break;
					}

					stopCamera();
					if (!selectedCameraDeviceId) await appendVideoInputConstraints(queue, seen);
				} catch (error) {
					if (error instanceof DOMException && error.name === 'NotAllowedError') {
						denied = true;
						break;
					}

					if (!selectedCameraDeviceId) await appendVideoInputConstraints(queue, seen);
				}
			}

			if (denied) {
				errorKey = labels.cameraDenied;
				stopCamera();
				return;
			}

			if (!cameraReady) {
				errorKey = labels.cameraUnavailable;
				stopCamera();
			}
		} catch (error) {
			if (error instanceof DOMException && error.name === 'NotAllowedError') {
				errorKey = labels.cameraDenied;
			} else {
				errorKey = labels.cameraUnavailable;
			}
			stopCamera();
		} finally {
			cameraBusy = false;
		}
	}

	function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
		return new Promise((resolve, reject) => {
			canvas.toBlob(
				(blob) => {
					if (blob) {
						resolve(blob);
						return;
					}
					reject(new Error('image_blob_failed'));
				},
				type,
				quality
			);
		});
	}

	async function captureCamera() {
		if (!cameraVideo) {
			errorKey = labels.cameraUnavailable;
			return;
		}

		const width = cameraVideo.videoWidth;
		const height = cameraVideo.videoHeight;
		if (width <= 0 || height <= 0) {
			errorKey = labels.cameraUnavailable;
			return;
		}

		try {
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;

			const context = canvas.getContext('2d');
			if (!context) throw new Error('image_context_failed');

			context.imageSmoothingEnabled = true;
			context.imageSmoothingQuality = 'high';
			context.drawImage(cameraVideo, 0, 0, width, height);

			const blob = await canvasToBlob(canvas, outputMimeType, outputQuality);
			await setSourceFromBlob(blob);
			stopCamera();
		} catch {
			errorKey = labels.processingError;
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
		const nextOffsets = clampOffsets(previewSize, dragStartOffsetX + deltaX, dragStartOffsetY + deltaY);
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
		const nextOffsets = clampOffsets(previewSize, offsetX, offsetY);
		offsetX = nextOffsets.x;
		offsetY = nextOffsets.y;
	}

	async function renderImageBlob(exportSize: number): Promise<Blob> {
		if (!sourceImage) throw new Error('image_source_missing');

		const metrics = computeDrawMetrics(previewSize);
		if (!metrics) throw new Error('image_metrics_missing');

		const clamped = clampOffsets(previewSize, offsetX, offsetY);
		const scale = exportSize / previewSize;

		const canvas = document.createElement('canvas');
		canvas.width = exportSize;
		canvas.height = exportSize;

		const context = canvas.getContext('2d');
		if (!context) throw new Error('image_context_failed');

		context.imageSmoothingEnabled = true;
		context.imageSmoothingQuality = 'high';

		const drawWidth = metrics.drawWidth * scale;
		const drawHeight = metrics.drawHeight * scale;
		const left = ((previewSize - metrics.drawWidth) / 2 + clamped.x) * scale;
		const top = ((previewSize - metrics.drawHeight) / 2 + clamped.y) * scale;

		context.drawImage(sourceImage, left, top, drawWidth, drawHeight);
		return canvasToBlob(canvas, outputMimeType, outputQuality);
	}

	async function buildImageBytes(): Promise<Uint8Array> {
		let exportSize = frameSize;

		for (let attempt = 0; attempt < 12; attempt += 1) {
			const blob = await renderImageBlob(exportSize);
			if (blob.size <= maxBytes) {
				return new Uint8Array(await blob.arrayBuffer());
			}

			if (exportSize <= minExportSize) break;
			exportSize = Math.max(minExportSize, Math.floor(exportSize * 0.85));
		}

		throw new Error('image_too_large');
	}

	async function applyImage() {
		if (!hasImage) {
			errorKey = labels.fileInvalid;
			return;
		}

		processing = true;
		errorKey = null;

		try {
			const bytes = await buildImageBytes();
			onApply(bytes);
			closeDialog();
		} catch (error) {
			errorKey = error instanceof Error && error.message === 'image_too_large' ? labels.tooLarge : labels.processingError;
		} finally {
			processing = false;
		}
	}

	function removeImage() {
		onRemove?.();
		closeDialog();
	}

	onMount(() => {
		void refreshCameraDevices();

		if (initialImageBytes && initialImageBytes.length > 0) {
			void loadSourceFromBytes(initialImageBytes).catch(() => {
				errorKey = labels.processingError;
			});
		}
	});

	onDestroy(() => {
		stopCamera();
		revokeSourceObjectUrl();
	});
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="presentation" onpointerdown={closeIfBackdrop}>
	<div class="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col rounded-md border border-border bg-card shadow-xl" role="dialog" aria-modal="true" aria-label={t(labels.title)}>
		<header class="flex items-start justify-between gap-3 border-b border-border p-4">
			<div class="min-w-0">
				<h3 class="truncate text-base font-semibold">{t(labels.title)}</h3>
				<p class="mt-1 text-sm text-muted-foreground">{t(labels.description)}</p>
			</div>

			<button type="button" class="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50" aria-label={t(labels.cancel)} title={t(labels.cancel)} disabled={processing} onclick={cancelIfIdle}>
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
							width={previewSize}
							height={previewSize}
							onpointerdown={startDrag}
							onpointermove={onDrag}
							onpointerup={endDrag}
							onpointercancel={endDrag}
						></canvas>
						{#if !hasImage}
							<div class="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted-foreground">{t(labels.noImage)}</div>
						{/if}
					</div>
				</div>

				<label class="flex flex-col gap-1 text-sm font-medium">
					<span>{t(labels.zoom)}</span>
					<input type="range" min="1" max="4" step="0.01" value={zoom} class="accent-primary" disabled={!hasImage || processing} oninput={onZoomChange} />
				</label>

				<p class="text-xs text-muted-foreground">{t(labels.moveHint)}</p>

				{#if errorKey}
					<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{t(errorKey)}</p>
				{/if}
			</section>

			<aside class="space-y-3">
				<div class="grid gap-2">
					<button type="button" class="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={processing} onclick={pickFile}>
						{t(labels.selectFile)}
					</button>

					{#if cameraDevices.length > 1}
						<div class="flex flex-col gap-1 text-sm font-medium">
							<label for="camera-select">{t(labels.cameraSelect)}</label>
							<Select 
								id="camera-select"
								value={selectedCameraDeviceId} 
								disabled={cameraBusy || processing} 
								options={[
									{ value: '', label: t(labels.cameraAuto) },
									...cameraDevices.map((device, index) => ({
										value: device.deviceId,
										label: cameraOptionLabel(device, index)
									}))
								]}
								onchange={(val) => void onCameraDeviceChange(val as string)}
							/>
						</div>
					{/if}

					<button type="button" class="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={cameraBusy || processing} onclick={() => void startCamera()}>
						{cameraBusy ? t('common.loading') : t(labels.useCamera)}
					</button>
				</div>

				<input bind:this={fileInput} type="file" class="hidden" accept="image/*" onchange={onFileChange} />

				{#if cameraOpen}
					<div class="rounded-md border border-border bg-background p-2">
						<video bind:this={cameraVideo} class="aspect-video w-full rounded-md bg-black" autoplay playsinline muted></video>
						<div class="mt-2 grid gap-2 sm:grid-cols-2">
							<button type="button" class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={processing} onclick={() => void captureCamera()}>
								{t(labels.capture)}
							</button>
							<button type="button" class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={processing} onclick={stopCamera}>
								{t(labels.stopCamera)}
							</button>
						</div>
					</div>
				{/if}

				<p class="rounded-md bg-muted p-3 text-xs text-muted-foreground">{t(labels.hint)}</p>
			</aside>
		</div>

		<footer class="grid gap-2 border-t border-border p-4 sm:grid-cols-[1fr_auto_auto] sm:justify-end">
			<button type="button" class="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={processing} onclick={cancelIfIdle}>
				{t(labels.cancel)}
			</button>

			{#if hasRemoveAction}
				<button type="button" class="inline-flex h-10 items-center justify-center rounded-md border border-destructive/40 bg-background px-4 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={processing} onclick={removeImage}>
					{t(labels.remove)}
				</button>
			{/if}

			<button type="button" class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={processing || !hasImage} onclick={() => void applyImage()}>
				{processing ? t(labels.saving) : t(labels.apply)}
			</button>
		</footer>
	</div>
</div>
