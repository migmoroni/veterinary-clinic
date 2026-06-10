<!--
@component
Workplace-specific configuration of `ImageCaptureDialog`.

Keeps the complete photo in its captured portrait or landscape orientation and
offers only right-angle rotation. The saved display and editable source are the
same full-resolution, moderately compressed JPEG, so this workflow never crops
or independently degrades a second image. Diagnostic exams must still use the
unprocessed policy because even moderate JPEG encoding changes image data.
-->
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
