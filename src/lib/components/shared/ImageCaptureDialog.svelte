<!--
@component
Reusable image selection and camera dialog with three processing policies:

- Default: crops and compresses a display image; both callback values are identical.
- `preserveOriginal`: returns the cropped display image plus a lightly processed,
  uncropped source that can be edited again.
- `editMode="rotate"`: keeps the complete image and allows only 90-degree
  rotations, returning one full-resolution encoded image in both callback positions.
- `preserveOriginalUnprocessed`: bypasses crop, resizing, format conversion, and
  byte limits; the exact acquired bytes are returned in both callback positions.

`onApply` receives `(imageBytes, originalImageBytes)`. Camera preview constraints
favor compatibility; higher capture constraints are requested only when taking
the photo so the live preview remains responsive.
-->
<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import X from '@lucide/svelte/icons/x';
	import Select from '$lib/components/ui/Select.svelte';

	const DEFAULT_FRAME_SIZE = 720;
	const DEFAULT_MAX_BYTES = 1_000_000;
	const DEFAULT_PREVIEW_SIZE = 320;
	const DEFAULT_MIN_EXPORT_SIZE = 256;
	type CameraDevice = { deviceId: string; label: string };
	type VideoFrameCallbackMetadata = { width?: number; height?: number; presentedFrames?: number };
	type VideoFrameCallback = (now: number, metadata: VideoFrameCallbackMetadata) => void;
	type VideoFrameElement = HTMLVideoElement & {
		requestVideoFrameCallback?: (callback: VideoFrameCallback) => number;
		cancelVideoFrameCallback?: (handle: number) => void;
	};
	type CameraImageCapture = {
		takePhoto: () => Promise<Blob>;
	};
	type CameraImageCaptureConstructor = new (track: MediaStreamTrack) => CameraImageCapture;
	type ImageEditMode = 'crop' | 'rotate';
	type ImageRotation = 0 | 90 | 180 | 270;
	type ImageFrameOption = {
		id: string;
		label: TranslationKey;
		frameWidth: number;
		frameHeight: number;
		previewWidth: number;
		previewHeight: number;
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
		frameOption?: TranslationKey;
		rotateLeft?: TranslationKey;
		rotateRight?: TranslationKey;
	};

	type ImageCaptureDialogProps = {
		/** Previously saved display image, used when no editable source is available. */
		initialImageBytes?: Uint8Array | null;
		/** Previously saved editable source. It is preferred when reopening the dialog. */
		initialOriginalImageBytes?: Uint8Array | null;
		canRemove?: boolean;
		/** Fallback square export size when no frame option is configured. */
		frameSize?: number;
		/** Maximum byte size for the cropped display image. */
		maxBytes?: number;
		previewSize?: number;
		/** Smallest export side allowed while reducing an oversized display image. */
		minExportSize?: number;
		outputMimeType?: string;
		outputQuality?: number;
		/** Optional output and preview dimensions, such as portrait and landscape. */
		frameOptions?: readonly ImageFrameOption[];
		initialFrameOptionId?: string;
		frameClass?: string;
		previewContainerClass?: string;
		/** Selects crop controls or full-image rotation controls. */
		editMode?: ImageEditMode;
		/** Keeps an uncropped, lightly processed source for later editing. */
		preserveOriginal?: boolean;
		/**
		 * Keeps the exact selected or captured blob and disables all crop/export
		 * processing. This policy takes precedence over `preserveOriginal`.
		 */
		preserveOriginalUnprocessed?: boolean;
		/** Encoding quality used only for the processed editable source. */
		originalOutputQuality?: number;
		/**
		 * Limits used only when generating a processed editable source. `null`
		 * preserves the source dimensions or disables the byte limit.
		 */
		originalMaxBytes?: number | null;
		originalMaxDimension?: number | null;
		originalMinDimension?: number;
		/** Preferred camera resolution requested at capture time, not during preview. */
		cameraIdealWidth?: number;
		cameraIdealHeight?: number;
		labels: ImageCaptureDialogLabels;
		/** Receives the display bytes first and the editable source second. */
		onApply: (bytes: Uint8Array, originalBytes: Uint8Array) => void;
		onRemove?: () => void;
		onClose: () => void;
	};

	let {
		initialImageBytes = null,
		initialOriginalImageBytes = null,
		canRemove = false,
		frameSize = DEFAULT_FRAME_SIZE,
		maxBytes = DEFAULT_MAX_BYTES,
		previewSize = DEFAULT_PREVIEW_SIZE,
		minExportSize = DEFAULT_MIN_EXPORT_SIZE,
		outputMimeType = 'image/png',
		outputQuality = undefined,
		frameOptions = [],
		initialFrameOptionId = '',
		frameClass = 'rounded-full',
		previewContainerClass = 'max-w-88',
		editMode = 'crop',
		preserveOriginal = false,
		preserveOriginalUnprocessed = false,
		originalOutputQuality = outputQuality,
		originalMaxBytes = 15_000_000,
		originalMaxDimension = 3200,
		originalMinDimension = 1400,
		cameraIdealWidth = 1280,
		cameraIdealHeight = 720,
		labels,
		onApply,
		onRemove,
		onClose
	}: ImageCaptureDialogProps = $props();

	let fileInput = $state<HTMLInputElement | null>(null);
	let previewCanvas = $state<HTMLCanvasElement | null>(null);
	let cameraVideo = $state<HTMLVideoElement | null>(null);

	let sourceImage = $state<HTMLImageElement | null>(null);
	let sourceWidth = $state(0);
	let sourceHeight = $state(0);
	let sourceObjectUrl = $state<string | null>(null);
	let preservedOriginalBytes = $state<Uint8Array | null>(null);

	let zoom = $state(1);
	let offsetX = $state(0);
	let offsetY = $state(0);
	let rotation = $state<ImageRotation>(0);

	let cameraBusy = $state(false);
	let cameraOpen = $state(false);
	let cameraStream = $state<MediaStream | null>(null);
	let cameraDevices = $state<CameraDevice[]>([]);
	let selectedCameraDeviceId = $state('');
	let processing = $state(false);
	let errorKey = $state<TranslationKey | null>(null);
	let selectedFrameOptionId = $state('');
	let frameOptionWasSelected = $state(false);

	let dragPointerId = $state<number | null>(null);
	let dragStartX = 0;
	let dragStartY = 0;
	let dragStartOffsetX = 0;
	let dragStartOffsetY = 0;

	const hasImage = $derived(Boolean(sourceImage && sourceWidth > 0 && sourceHeight > 0));
	const hasRemoveAction = $derived(Boolean(canRemove && onRemove));
	const selectedFrameOption = $derived(frameOptions.find((option) => option.id === selectedFrameOptionId) ?? frameOptions[0] ?? null);
	const effectiveFrameWidth = $derived(selectedFrameOption?.frameWidth ?? frameSize);
	const effectiveFrameHeight = $derived(selectedFrameOption?.frameHeight ?? frameSize);
	const rotatedSourceWidth = $derived(rotation % 180 === 0 ? sourceWidth : sourceHeight);
	const rotatedSourceHeight = $derived(rotation % 180 === 0 ? sourceHeight : sourceWidth);
	const rotatedPreviewScale = $derived(
		rotatedSourceWidth > 0 && rotatedSourceHeight > 0
			? previewSize / Math.max(rotatedSourceWidth, rotatedSourceHeight)
			: 1
	);
	const effectivePreviewWidth = $derived(
		editMode === 'rotate' && !preserveOriginalUnprocessed
			? Math.max(1, Math.round((rotatedSourceWidth || previewSize) * rotatedPreviewScale))
			: (selectedFrameOption?.previewWidth ?? previewSize)
	);
	const effectivePreviewHeight = $derived(
		editMode === 'rotate' && !preserveOriginalUnprocessed
			? Math.max(1, Math.round((rotatedSourceHeight || previewSize) * rotatedPreviewScale))
			: (selectedFrameOption?.previewHeight ?? previewSize)
	);
	const shouldPreserveOriginal = $derived(preserveOriginal || preserveOriginalUnprocessed);

	function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
		const buffer = new ArrayBuffer(bytes.byteLength);
		new Uint8Array(buffer).set(bytes);
		return buffer;
	}

	function clamp(value: number, min: number, max: number): number {
		return Math.max(min, Math.min(max, value));
	}

	function normalizedRotation(value: number): ImageRotation {
		return ((value % 360) + 360) % 360 as ImageRotation;
	}

	function rotateImage(direction: -1 | 1) {
		rotation = normalizedRotation(rotation + direction * 90);
	}

	function cameraConstraintsCandidates(): MediaStreamConstraints[] {
		const desktopCandidates: MediaStreamConstraints[] = [{ audio: false, video: true }];

		if (typeof navigator === 'undefined' || !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return desktopCandidates;

		return [
			{ audio: false, video: { facingMode: { ideal: 'environment' } } },
			{ audio: false, video: { facingMode: { ideal: 'user' } } },
			...desktopCandidates
		];
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

	async function improveCameraResolution(stream: MediaStream): Promise<void> {
		const videoTrack = stream.getVideoTracks()[0];
		if (!videoTrack?.applyConstraints) return;

		await videoTrack
			.applyConstraints({
				width: { ideal: cameraIdealWidth },
				height: { ideal: cameraIdealHeight }
			})
			.catch(() => undefined);
	}

	function computeDrawMetrics(currentFrameWidth: number, currentFrameHeight: number) {
		if (!sourceImage || sourceWidth <= 0 || sourceHeight <= 0) return null;

		const baseScale = Math.max(currentFrameWidth / sourceWidth, currentFrameHeight / sourceHeight);
		const drawWidth = sourceWidth * baseScale * zoom;
		const drawHeight = sourceHeight * baseScale * zoom;
		const maxOffsetX = Math.max(0, (drawWidth - currentFrameWidth) / 2);
		const maxOffsetY = Math.max(0, (drawHeight - currentFrameHeight) / 2);

		return { drawWidth, drawHeight, maxOffsetX, maxOffsetY };
	}

	function clampOffsets(currentFrameWidth: number, currentFrameHeight: number, nextOffsetX: number, nextOffsetY: number) {
		const metrics = computeDrawMetrics(currentFrameWidth, currentFrameHeight);
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

		context.clearRect(0, 0, effectivePreviewWidth, effectivePreviewHeight);
		if (!sourceImage) return;

		if (preserveOriginalUnprocessed) {
			const scale = Math.min(effectivePreviewWidth / sourceWidth, effectivePreviewHeight / sourceHeight);
			const drawWidth = sourceWidth * scale;
			const drawHeight = sourceHeight * scale;
			const left = (effectivePreviewWidth - drawWidth) / 2;
			const top = (effectivePreviewHeight - drawHeight) / 2;

			context.imageSmoothingEnabled = true;
			context.imageSmoothingQuality = 'high';
			context.drawImage(sourceImage, left, top, drawWidth, drawHeight);
			return;
		}

		if (editMode === 'rotate') {
			const scale = Math.min(effectivePreviewWidth / rotatedSourceWidth, effectivePreviewHeight / rotatedSourceHeight);

			context.save();
			context.translate(effectivePreviewWidth / 2, effectivePreviewHeight / 2);
			context.rotate((rotation * Math.PI) / 180);
			context.imageSmoothingEnabled = true;
			context.imageSmoothingQuality = 'high';
			context.drawImage(
				sourceImage,
				-(sourceWidth * scale) / 2,
				-(sourceHeight * scale) / 2,
				sourceWidth * scale,
				sourceHeight * scale
			);
			context.restore();
			return;
		}

		const metrics = computeDrawMetrics(effectivePreviewWidth, effectivePreviewHeight);
		if (!metrics) return;

		const clampedOffsets = clampOffsets(effectivePreviewWidth, effectivePreviewHeight, offsetX, offsetY);
		const left = (effectivePreviewWidth - metrics.drawWidth) / 2 + clampedOffsets.x;
		const top = (effectivePreviewHeight - metrics.drawHeight) / 2 + clampedOffsets.y;

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
		rotation;
		effectivePreviewWidth;
		effectivePreviewHeight;
		renderPreview();
	});

	function selectClosestFrameOption(width: number, height: number) {
		if (frameOptionWasSelected || frameOptions.length === 0 || width <= 0 || height <= 0) return;

		const sourceRatio = width / height;
		const closest = frameOptions.reduce((best, option) => {
			const difference = Math.abs(option.frameWidth / option.frameHeight - sourceRatio);
			const bestDifference = Math.abs(best.frameWidth / best.frameHeight - sourceRatio);
			return difference < bestDifference ? option : best;
		});
		selectedFrameOptionId = closest.id;
	}

	function selectFrameOption(id: string) {
		selectedFrameOptionId = id;
		frameOptionWasSelected = true;
		zoom = 1;
		offsetX = 0;
		offsetY = 0;
	}

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

	/**
	 * Loads a selected or captured blob as the editing source. In unprocessed mode,
	 * the blob bytes are retained before any browser canvas operation can alter them.
	 */
	async function setSourceFromBlob(blob: Blob, originalBytesToPreserve: Uint8Array | null = null): Promise<void> {
		if (typeof URL === 'undefined') throw new Error('image_url_unavailable');

		const nextUrl = URL.createObjectURL(blob);

		try {
			const image = await loadImage(nextUrl);
			const originalBytes =
				originalBytesToPreserve ??
				(preserveOriginalUnprocessed ? new Uint8Array(await blob.arrayBuffer()) : null);
			revokeSourceObjectUrl();
			sourceObjectUrl = nextUrl;
			sourceImage = image;
			sourceWidth = image.naturalWidth;
			sourceHeight = image.naturalHeight;
			preservedOriginalBytes = originalBytes;
			selectClosestFrameOption(sourceWidth, sourceHeight);
			zoom = 1;
			offsetX = 0;
			offsetY = 0;
			rotation = 0;
			errorKey = null;
		} catch (error) {
			URL.revokeObjectURL(nextUrl);
			throw error;
		}
	}

	async function loadSourceFromBytes(bytes: Uint8Array, preserveAsOriginal = false): Promise<void> {
		if (typeof Blob === 'undefined') return;
		await setSourceFromBlob(new Blob([bytesToArrayBuffer(bytes)], { type: outputMimeType }), preserveAsOriginal ? bytes : null);
	}

	async function selectInitialFrameFromBytes(bytes: Uint8Array): Promise<void> {
		if (frameOptions.length === 0 || typeof Blob === 'undefined' || typeof URL === 'undefined') return;

		const url = URL.createObjectURL(new Blob([bytesToArrayBuffer(bytes)], { type: outputMimeType }));
		try {
			const image = await loadImage(url);
			selectClosestFrameOption(image.naturalWidth, image.naturalHeight);
			frameOptionWasSelected = true;
		} finally {
			URL.revokeObjectURL(url);
		}
	}

	async function loadInitialImage(): Promise<void> {
		const originalBytes = initialOriginalImageBytes?.length ? initialOriginalImageBytes : null;
		const croppedBytes = initialImageBytes?.length ? initialImageBytes : null;
		if (!originalBytes && !croppedBytes) return;

		if (originalBytes && croppedBytes) await selectInitialFrameFromBytes(croppedBytes);
		await loadSourceFromBytes(originalBytes ?? croppedBytes!, Boolean(originalBytes));
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

	/**
	 * Uses the browser ImageCapture API when available to obtain the camera's native
	 * encoded photo instead of copying the current video preview frame.
	 */
	async function takeNativeCameraPhoto(): Promise<Blob | null> {
		const videoTrack = cameraStream?.getVideoTracks()[0];
		if (!videoTrack) return null;

		const ImageCaptureApi = (globalThis as typeof globalThis & { ImageCapture?: CameraImageCaptureConstructor }).ImageCapture;
		if (!ImageCaptureApi) return null;

		try {
			const blob = await new ImageCaptureApi(videoTrack).takePhoto();
			return blob.size > 0 ? blob : null;
		} catch {
			return null;
		}
	}

	/**
	 * Fallback for browsers without ImageCapture. Capture constraints are improved
	 * only here to avoid freezing or replacing the live camera preview.
	 */
	async function captureCurrentVideoFrame(): Promise<Blob> {
		if (!cameraVideo || !cameraStream) throw new Error('camera_unavailable');

		await improveCameraResolution(cameraStream);
		await cameraVideo.play().catch(() => undefined);
		await waitForCameraVideo(cameraVideo, 2000);

		const width = cameraVideo.videoWidth;
		const height = cameraVideo.videoHeight;
		if (width <= 0 || height <= 0) throw new Error('camera_unavailable');

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		const context = canvas.getContext('2d');
		if (!context) throw new Error('image_context_failed');

		context.imageSmoothingEnabled = true;
		context.imageSmoothingQuality = 'high';
		context.drawImage(cameraVideo, 0, 0, width, height);

		// Keep the camera frame lossless until the final crop and original are encoded.
		return canvasToBlob(canvas, 'image/png');
	}

	async function captureCamera() {
		if (!cameraVideo || !cameraStream) {
			errorKey = labels.cameraUnavailable;
			return;
		}

		cameraBusy = true;
		try {
			const blob = (await takeNativeCameraPhoto()) ?? (await captureCurrentVideoFrame());
			await setSourceFromBlob(blob);
			stopCamera();
		} catch {
			errorKey = labels.processingError;
		} finally {
			cameraBusy = false;
		}
	}

	function startDrag(event: PointerEvent) {
		if (!hasImage || processing || preserveOriginalUnprocessed || editMode !== 'crop') return;
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
		const nextOffsets = clampOffsets(effectivePreviewWidth, effectivePreviewHeight, dragStartOffsetX + deltaX, dragStartOffsetY + deltaY);
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
		const nextOffsets = clampOffsets(effectivePreviewWidth, effectivePreviewHeight, offsetX, offsetY);
		offsetX = nextOffsets.x;
		offsetY = nextOffsets.y;
	}

	async function renderImageBlob(exportWidth: number, exportHeight: number): Promise<Blob> {
		if (!sourceImage) throw new Error('image_source_missing');

		const previewMetrics = computeDrawMetrics(effectivePreviewWidth, effectivePreviewHeight);
		const exportMetrics = computeDrawMetrics(exportWidth, exportHeight);
		if (!previewMetrics || !exportMetrics) throw new Error('image_metrics_missing');

		const clamped = clampOffsets(effectivePreviewWidth, effectivePreviewHeight, offsetX, offsetY);
		const normalizedOffsetX = previewMetrics.maxOffsetX > 0 ? clamped.x / previewMetrics.maxOffsetX : 0;
		const normalizedOffsetY = previewMetrics.maxOffsetY > 0 ? clamped.y / previewMetrics.maxOffsetY : 0;

		const canvas = document.createElement('canvas');
		canvas.width = exportWidth;
		canvas.height = exportHeight;

		const context = canvas.getContext('2d');
		if (!context) throw new Error('image_context_failed');

		context.imageSmoothingEnabled = true;
		context.imageSmoothingQuality = 'high';

		const left = (exportWidth - exportMetrics.drawWidth) / 2 + normalizedOffsetX * exportMetrics.maxOffsetX;
		const top = (exportHeight - exportMetrics.drawHeight) / 2 + normalizedOffsetY * exportMetrics.maxOffsetY;

		context.drawImage(sourceImage, left, top, exportMetrics.drawWidth, exportMetrics.drawHeight);
		return canvasToBlob(canvas, outputMimeType, outputQuality);
	}

	async function renderOriginalImageBlob(exportWidth: number, exportHeight: number): Promise<Blob> {
		if (!sourceImage) throw new Error('image_source_missing');

		const canvas = document.createElement('canvas');
		canvas.width = exportWidth;
		canvas.height = exportHeight;

		const context = canvas.getContext('2d');
		if (!context) throw new Error('image_context_failed');

		context.imageSmoothingEnabled = true;
		context.imageSmoothingQuality = 'high';
		context.drawImage(sourceImage, 0, 0, exportWidth, exportHeight);
		return canvasToBlob(canvas, outputMimeType, originalOutputQuality);
	}

	/**
	 * Encodes the complete source at its original pixel dimensions after applying
	 * the selected right-angle rotation. No crop or resize is performed.
	 */
	async function buildRotatedImageBytes(): Promise<Uint8Array> {
		if (!sourceImage || sourceWidth <= 0 || sourceHeight <= 0) throw new Error('image_source_missing');

		const canvas = document.createElement('canvas');
		canvas.width = rotatedSourceWidth;
		canvas.height = rotatedSourceHeight;

		const context = canvas.getContext('2d');
		if (!context) throw new Error('image_context_failed');

		context.save();
		context.translate(canvas.width / 2, canvas.height / 2);
		context.rotate((rotation * Math.PI) / 180);
		context.imageSmoothingEnabled = true;
		context.imageSmoothingQuality = 'high';
		context.drawImage(sourceImage, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
		context.restore();

		const blob = await canvasToBlob(canvas, outputMimeType, originalOutputQuality);
		return new Uint8Array(await blob.arrayBuffer());
	}

	async function buildImageBytes(): Promise<Uint8Array> {
		let exportWidth = effectiveFrameWidth;
		let exportHeight = effectiveFrameHeight;

		for (let attempt = 0; attempt < 12; attempt += 1) {
			const blob = await renderImageBlob(exportWidth, exportHeight);
			if (blob.size <= maxBytes) {
				return new Uint8Array(await blob.arrayBuffer());
			}

			const shortestSide = Math.min(exportWidth, exportHeight);
			if (shortestSide <= minExportSize) break;

			const scale = Math.max(0.85, minExportSize / shortestSide);
			exportWidth = Math.max(1, Math.floor(exportWidth * scale));
			exportHeight = Math.max(1, Math.floor(exportHeight * scale));
		}

		throw new Error('image_too_large');
	}

	/**
	 * Builds the uncropped editable source used by the medium-compression policy.
	 * Dimensions and bytes are reduced progressively without changing aspect ratio.
	 */
	async function buildOriginalImageBytes(): Promise<Uint8Array> {
		if (!sourceImage || sourceWidth <= 0 || sourceHeight <= 0) throw new Error('image_source_missing');

		const initialScale =
			originalMaxDimension === null
				? 1
				: Math.min(1, originalMaxDimension / Math.max(sourceWidth, sourceHeight));
		let exportWidth = Math.max(1, Math.round(sourceWidth * initialScale));
		let exportHeight = Math.max(1, Math.round(sourceHeight * initialScale));
		const minimumLongestSide = Math.min(originalMinDimension, Math.max(exportWidth, exportHeight));

		for (let attempt = 0; attempt < 12; attempt += 1) {
			const blob = await renderOriginalImageBlob(exportWidth, exportHeight);
			if (originalMaxBytes === null || blob.size <= originalMaxBytes) {
				return new Uint8Array(await blob.arrayBuffer());
			}

			const longestSide = Math.max(exportWidth, exportHeight);
			if (longestSide <= minimumLongestSide) break;

			const scale = Math.max(0.85, minimumLongestSide / longestSide);
			exportWidth = Math.max(1, Math.floor(exportWidth * scale));
			exportHeight = Math.max(1, Math.floor(exportHeight * scale));
		}

		throw new Error('image_too_large');
	}

	/**
	 * Applies the active policy and preserves the callback contract:
	 * display-ready bytes first, editable source bytes second.
	 */
	async function applyImage() {
		if (!hasImage) {
			errorKey = labels.fileInvalid;
			return;
		}

		processing = true;
		errorKey = null;

		try {
			if (preserveOriginalUnprocessed) {
				if (!preservedOriginalBytes) throw new Error('image_original_missing');
				onApply(preservedOriginalBytes, preservedOriginalBytes);
				closeDialog();
				return;
			}

			if (editMode === 'rotate') {
				const rotatedBytes = await buildRotatedImageBytes();
				onApply(rotatedBytes, rotatedBytes);
				closeDialog();
				return;
			}

			const bytes = await buildImageBytes();
			const originalBytes = shouldPreserveOriginal ? preservedOriginalBytes ?? (await buildOriginalImageBytes()) : bytes;
			onApply(bytes, originalBytes);
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
		selectedFrameOptionId = initialFrameOptionId || frameOptions[0]?.id || '';
		void refreshCameraDevices();

		if (initialOriginalImageBytes?.length || initialImageBytes?.length) {
			void loadInitialImage().catch(() => {
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
				<div class={`mx-auto w-full ${previewContainerClass}`}>
					<div
						class={`relative mx-auto overflow-hidden border-2 border-primary/50 bg-muted shadow-inner ${frameClass}`}
						style:aspect-ratio={`${effectivePreviewWidth} / ${effectivePreviewHeight}`}
						style:max-width={`${effectivePreviewWidth}px`}
					>
						<canvas
							bind:this={previewCanvas}
							class="h-full w-full touch-none select-none {hasImage && editMode === 'crop' && !preserveOriginalUnprocessed ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}"
							width={effectivePreviewWidth}
							height={effectivePreviewHeight}
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

				{#if editMode === 'crop' && !preserveOriginalUnprocessed}
					<label class="flex flex-col gap-1 text-sm font-medium">
						<span>{t(labels.zoom)}</span>
						<input type="range" min="1" max="4" step="0.01" value={zoom} class="accent-primary" disabled={!hasImage || processing} oninput={onZoomChange} />
					</label>

					<p class="text-xs text-muted-foreground">{t(labels.moveHint)}</p>
				{/if}

				{#if editMode === 'rotate' && !preserveOriginalUnprocessed && labels.rotateLeft && labels.rotateRight}
					<div class="flex justify-center gap-2">
						<button
							type="button"
							class="flex size-10 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
							disabled={!hasImage || processing}
							aria-label={t(labels.rotateLeft)}
							title={t(labels.rotateLeft)}
							onclick={() => rotateImage(-1)}
						>
							<RotateCcw class="size-4" />
						</button>
						<button
							type="button"
							class="flex size-10 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
							disabled={!hasImage || processing}
							aria-label={t(labels.rotateRight)}
							title={t(labels.rotateRight)}
							onclick={() => rotateImage(1)}
						>
							<RotateCw class="size-4" />
						</button>
					</div>
				{/if}

				{#if errorKey}
					<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{t(errorKey)}</p>
				{/if}
			</section>

			<aside class="space-y-3">
				{#if editMode === 'crop' && !preserveOriginalUnprocessed && frameOptions.length > 1 && labels.frameOption}
					<fieldset class="space-y-2">
						<legend class="text-sm font-medium">{t(labels.frameOption)}</legend>
						<div class="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted p-1">
							{#each frameOptions as option (option.id)}
								<button
									type="button"
									class="min-h-9 rounded-md px-3 py-2 text-sm font-medium transition-colors {selectedFrameOptionId === option.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
									aria-pressed={selectedFrameOptionId === option.id}
									disabled={processing}
									onclick={() => selectFrameOption(option.id)}
								>
									{t(option.label)}
								</button>
							{/each}
						</div>
					</fieldset>
				{/if}

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
							<button type="button" class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={cameraBusy || processing} onclick={() => void captureCamera()}>
								{cameraBusy ? t('common.loading') : t(labels.capture)}
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
