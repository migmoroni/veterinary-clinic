import { describe, expect, it } from 'vitest';
import { formatEmailForInput, getEmailUrl } from '../email.js';

describe('email input mask', () => {
	it('normalizes spaces and casing while typing', () => {
		expect(formatEmailForInput('  Pessoa.Exemplo @ Email.COM  ')).toBe('pessoa.exemplo@email.com');
	});
});

describe('email helpers', () => {
	it('builds mailto URLs for valid-looking emails', () => {
		expect(getEmailUrl('Tutor@Example.COM')).toBe('mailto:tutor@example.com');
		expect(getEmailUrl('sem-arroba')).toBeNull();
	});
});
