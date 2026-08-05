export function formatEmailForInput(value: string | null | undefined): string {
	return (value ?? '').trim().replace(/\s+/g, '').toLowerCase();
}

export function getEmailUrl(value: string | null | undefined): string | null {
	const email = formatEmailForInput(value);
	if (!email || !email.includes('@')) return null;

	return `mailto:${email}`;
}
