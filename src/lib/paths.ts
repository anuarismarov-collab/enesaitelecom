import { LANGS } from '../i18n/dict';
/** One static page per language: use as `export const getStaticPaths = langPaths;` */
export const langPaths = () => LANGS.map((lang) => ({ params: { lang } }));
