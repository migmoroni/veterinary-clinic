import { describe, expect, it } from 'vitest';
import { formatEmailForInput, getEmailUrl } from '../email.js';

describe('email input mask', () => {
	it('normalizes spaces and casing while typing', () => {
		expect(formatEmailForInput('  Pessoa.Exemplo @ Email.COM  ')).toBe('pessoa.exemplo@email.com');
		expect(formatEmailForInput('\n Pessoa\tExemplo +Teste @ Domínio.COM \r')).toBe('pessoaexemplo+teste@domínio.com');
	});

	it('does not impose a length limit while normalizing email input', () => {
		const local = 'A'.repeat(1000);
		const domain = 'B'.repeat(1000);

		expect(formatEmailForInput(` ${local} @ ${domain}.COM `)).toBe(`${local.toLowerCase()}@${domain.toLowerCase()}.com`);
	});
});

describe('email helpers', () => {
	it('builds mailto URLs for valid-looking emails', () => {
		expect(getEmailUrl('Tutor@Example.COM')).toBe('mailto:tutor@example.com');
		expect(getEmailUrl('sem-arroba')).toBeNull();
	});

	it('only requires an at sign before building mailto URLs', () => {
		expect(getEmailUrl('bad<script>@example.com')).toBe('mailto:bad<script>@example.com');
		expect(getEmailUrl('@@')).toBe('mailto:@@');
	});
});
