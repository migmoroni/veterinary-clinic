<script lang="ts">
	import ImageCaptureDialog from '$lib/components/shared/ImageCaptureDialog.svelte';

	const labels = {
		title: 'practiceProfile.imageCaptureTitle',
		description: 'practiceProfile.imageCaptureDescription',
		noImage: 'owner.avatarNoImage',
		selectFile: 'owner.avatarSelectFile',
		useCamera: 'owner.avatarUseCamera',
		cameraSelect: 'owner.avatarCameraSelect',
		cameraAuto: 'owner.avatarCameraAuto',
		cameraFallback: 'owner.avatarCameraFallback',
		capture: 'owner.avatarCapture',
		stopCamera: 'owner.avatarStopCamera',
		zoom: 'owner.avatarZoom',
		moveHint: 'owner.avatarMoveHint',
		hint: 'practiceProfile.imageCaptureHint',
		apply: 'practiceProfile.imageApply',
		remove: 'owner.avatarRemove',
		cameraUnavailable: 'owner.avatarCameraUnavailable',
		cameraDenied: 'owner.avatarCameraDenied',
		fileInvalid: 'owner.avatarFileInvalid',
		processingError: 'practiceProfile.imageProcessingError',
		tooLarge: 'practiceProfile.imageTooLarge',
		saving: 'record.saving',
		cancel: 'actions.cancel',
		frameOption: 'practiceProfile.imageOrientation'
	} as const;

	const frameOptions = [
		{
			id: 'landscape',
			label: 'practiceProfile.imageOrientationLandscape',
			frameWidth: 3200,
			frameHeight: 2400,
			previewWidth: 480,
			previewHeight: 360
		},
		{
			id: 'portrait',
			label: 'practiceProfile.imageOrientationPortrait',
			frameWidth: 2400,
			frameHeight: 3200,
			previewWidth: 315,
			previewHeight: 420
		}
	] as const;

	let {
		initialImageBytes = null,
		initialOriginalImageBytes = null,
		onApply,
		onClose
	}: {
		initialImageBytes?: Uint8Array | null;
		initialOriginalImageBytes?: Uint8Array | null;
		onApply: (bytes: Uint8Array, originalBytes: Uint8Array) => void;
		onClose: () => void;
	} = $props();
</script>

<ImageCaptureDialog
	{initialImageBytes}
	{initialOriginalImageBytes}
	{frameOptions}
	initialFrameOptionId="landscape"
	frameClass="rounded-md"
	previewContainerClass="max-w-xl"
	maxBytes={20_000_000}
	minExportSize={2000}
	outputMimeType="image/jpeg"
	outputQuality={0.99}
	preserveOriginal
	originalMaxBytes={30_000_000}
	originalMaxDimension={4800}
	originalMinDimension={2800}
	cameraIdealWidth={4096}
	cameraIdealHeight={3072}
	{labels}
	{onApply}
	{onClose}
/>
