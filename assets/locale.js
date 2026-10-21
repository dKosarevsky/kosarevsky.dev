const supported = new Set(['en', 'ru', 'zh']);

/** Explicit links take precedence; removed locales safely return English. */
export function resolveLocale(query, saved) {
  if (query !== null) return supported.has(query) ? query : 'en';
  return supported.has(saved) ? saved : 'en';
}

export function documentLanguage(locale) {
  return locale === 'zh' ? 'zh-Hans' : locale;
}
