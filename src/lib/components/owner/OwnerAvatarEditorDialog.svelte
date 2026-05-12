<script lang="ts">
	import ImageCaptureDialog from '$lib/components/shared/ImageCaptureDialog.svelte';

	const AVATAR_FRAME_SIZE = 720;
	const AVATAR_MAX_BYTES = 1_000_000;
	const PREVIEW_SIZE = 320;
	const MIN_EXPORT_SIZE = 256;
	const avatarImageLabels = {
		title: 'owner.avatarDialogTitle',
		description: 'owner.avatarDialogDescription',
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
		hint: 'owner.avatarHint',
		apply: 'owner.avatarApply',
		remove: 'owner.avatarRemove',
		cameraUnavailable: 'owner.avatarCameraUnavailable',
		cameraDenied: 'owner.avatarCameraDenied',
		fileInvalid: 'owner.avatarFileInvalid',
		processingError: 'owner.avatarProcessingError',
		tooLarge: 'owner.avatarTooLarge',
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
