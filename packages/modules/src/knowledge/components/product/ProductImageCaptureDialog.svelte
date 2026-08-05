<script lang="ts">
	import ImageCaptureDialog from '@vet/ui/components/shared/ImageCaptureDialog.svelte';

	const labels = {
		title: 'product.imageCaptureTitle',
		description: 'product.imageCaptureDescription',
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
		hint: 'product.imageCaptureHint',
		apply: 'practiceProfile.imageApply',
		remove: 'owner.avatarRemove',
		cameraUnavailable: 'owner.avatarCameraUnavailable',
		cameraDenied: 'owner.avatarCameraDenied',
		fileInvalid: 'owner.avatarFileInvalid',
		processingError: 'practiceProfile.imageProcessingError',
		tooLarge: 'practiceProfile.imageTooLarge',
		saving: 'record.saving',
		cancel: 'actions.cancel',
		rotateLeft: 'practiceProfile.imageRotateLeft',
		rotateRight: 'practiceProfile.imageRotateRight'
	} as const;

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
	editMode="rotate"
	frameClass="rounded-md"
	previewContainerClass="max-w-xl"
	previewSize={480}
	outputMimeType="image/jpeg"
	originalOutputQuality={0.9}
	cameraIdealWidth={4096}
	cameraIdealHeight={3072}
	{labels}
	{onApply}
	{onClose}
/>
