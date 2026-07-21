import logoUrl from './upgradsot_logo_small.png'
import logoWhiteUrl from './ugsot_white_small.png'
import loginHeroUrl from './login_hero_image.png'

/**
 * Brand images, imported rather than written as `/assets/…` string paths.
 *
 * The packaged app loads the renderer over `file://`, where a root-absolute `/assets/logo.png`
 * resolves to the filesystem root and 404s — the logo rendered as a broken image in every packaged
 * build while working fine against the dev server. Importing hands the path to Vite, which emits a
 * hashed file and a URL that resolves correctly under both protocols.
 */
export { logoUrl, logoWhiteUrl, loginHeroUrl }
