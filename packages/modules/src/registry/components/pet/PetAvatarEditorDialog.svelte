<script lang="ts">
	import ImageCaptureDialog from '@vet/ui/components/shared/ImageCaptureDialog.svelte';

	const AVATAR_FRAME_SIZE = 720;
	const AVATAR_MAX_BYTES = 1_000_000;
	const PREVIEW_SIZE = 320;
	const MIN_EXPORT_SIZE = 256;
	const avatarImageLabels = {
		title: 'pet.avatarDialogTitle',
		description: 'pet.avatarDialogDescription',
		noImage: 'pet.avatarNoImage',
		selectFile: 'pet.avatarSelectFile',
		useCamera: 'pet.avatarUseCamera',
		cameraSelect: 'pet.avatarCameraSelect',
		cameraAuto: 'pet.avatarCameraAuto',
		cameraFallback: 'pet.avatarCameraFallback',
		capture: 'pet.avatarCapture',
		stopCamera: 'pet.avatarStopCamera',
		zoom: 'pet.avatarZoom',
		moveHint: 'pet.avatarMoveHint',
		hint: 'pet.avatarHint',
		apply: 'pet.avatarApply',
		remove: 'pet.avatarRemove',
		cameraUnavailable: 'pet.avatarCameraUnavailable',
		cameraDenied: 'pet.avatarCameraDenied',
		fileInvalid: 'pet.avatarFileInvalid',
		processingError: 'pet.avatarProcessingError',
		tooLarge: 'pet.avatarTooLarge',
		saving: 'record.saving',
		cancel: 'actions.cancel'
	} as const;

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

	const canRemoveAvatar = $derived(Boolean(initialAvatarBytes && initialAvatarBytes.length > 0));
</script>

<ImageCaptureDialog
	initialImageBytes={initialAvatarBytes}
	canRemove={canRemoveAvatar}
	frameSize={AVATAR_FRAME_SIZE}
	maxBytes={AVATAR_MAX_BYTES}
	previewSize={PREVIEW_SIZE}
	minExportSize={MIN_EXPORT_SIZE}
	outputMimeType="image/png"
	labels={avatarImageLabels}
	onApply={onApply}
	onRemove={onRemove}
	onClose={onClose}
/>
