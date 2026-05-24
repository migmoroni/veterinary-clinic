<script lang="ts">
	import { t } from '$lib/i18n/index.js';
</script>

<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
	<p class="text-sm text-muted-foreground">{t('common.loading')}</p>
	<a class="mt-3 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95" href="/settings/backups">{t('settings.backups.title')}</a>
</section>