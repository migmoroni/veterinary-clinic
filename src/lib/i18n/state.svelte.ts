import { DEFAULT_LOCALE, type Locale } from './locales.js';

class I18nState {
	locale = $state<Locale>(DEFAULT_LOCALE);

	setLocale(locale: Locale) {
		this.locale = locale;
	}
}

export const i18n = new I18nState();