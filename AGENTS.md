# Repository Guidelines

## Project Structure & Module Organization

`miniprogram/` contains the native WeChat mini program. Put screens in `pages/<page>/`, reusable presentation in `components/ui/` or `components/business/`, cloud API wrappers in `services/`, and shared state/helpers in `utils/`. Keep calls to `wx.cloud` inside the service layer. `cloudfunctions/<name>/` holds one CloudBase function per directory, with `index.js` and its own `package.json`. `docs/` contains product, technical, and UI specifications; `scripts/check.js` checks project consistency. Page and component files use the WeChat quartet: `.js`, `.json`, `.wxml`, and `.wxss`.

## Build, Test, and Development Commands

- `node scripts/check.js` checks page/component files and registrations, service-to-function references, and Cloud Function package manifests.
- Open the repository root in WeChat DevTools to compile, preview, and debug the mini program.
- Deploy CloudBase functions from DevTools using “Upload and deploy: install dependencies in the cloud.” Run `cloudfunctions/init` once from Cloud Test to initialize database collections and templates.

There is no root `package.json` or configured automated test framework. The consistency checker currently reports the `cloudfunctions/login` directory as missing a `package.json`; account for this existing gap when interpreting its result.

## Coding Style & Naming Conventions

Use the native mini program stack (JavaScript, WXML, WXSS, and JSON) and CommonJS modules in services and Cloud Functions. Follow the surrounding file’s formatting; two-space indentation is common. Use lowercase kebab-case for page/component directory names and the established `index.*` filenames within them. Keep page code focused on UI behavior, route data access through `services/`, and put balance-changing order or points logic in Cloud Functions transactions.

## Testing Guidelines

Run `node scripts/check.js` after structural changes. In WeChat DevTools, exercise affected pages and flows; when changing Cloud Functions, validate the relevant action in Cloud Test or a configured environment. No automated unit or coverage requirements are defined.

## Commit & Pull Request Guidelines

Git history is unavailable in this checkout, so no repository-specific commit pattern could be confirmed. Use a short imperative subject, optionally with a conventional prefix (for example, `fix: prevent duplicate order creation`). PRs should describe the user-visible change, list validation performed, link related issues, and include screenshots for UI changes. Call out CloudBase schema, permissions, or deployment steps when affected.

## Configuration & Security

Use your own AppID and CloudBase environment when running locally. Keep machine-specific settings and credentials out of shared changes; never commit secrets or real user data.
