# VS Code Extension Marketplace Icon Research

Research date: 2026-07-29. Sources are limited to VS Code documentation and the VS Code repository's extension-manifest schema.

## Recommended Asset

- Set the root `package.json` `icon` field to a relative path for a PNG included in the extension package. The documented minimum is 128 x 128 pixels; 256 x 256 is specified for Retina screens. Source: https://code.visualstudio.com/api/references/extension-manifest#fields
- The VS Code manifest schema accepts `icon` as a string and describes it as the path to a 128 x 128 pixel icon. Source: https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/extensions/common/extensionsRegistry.ts
- The Marketplace publishing guide likewise specifies a relative path to an included PNG of at least 128 x 128 pixels. Source: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#marketplace-integration
- The first-party documentation reviewed does not prescribe an opaque or transparent PNG background. Its visual guidance is to use an icon with a contrasting `galleryBanner.color`; use that banner setting when an icon needs a controlled Marketplace-page background. Source: https://code.visualstudio.com/api/references/extension-manifest#marketplace-presentation-tips

## Packaging Constraints

- `vsce` rejects an SVG supplied through the `icon` manifest field. Source: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#publishing-extensions
- The reviewed first-party sources specify no maximum icon pixel dimension or icon file-size limit. The documented dimensions are the 128 x 128 minimum and 256 x 256 Retina guidance above.
- Files matched by `.vscodeignore` are excluded from the VSIX, so the file named by `icon` must not be ignored. Source: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#using-vscodeignore

## CAI Connector Assessment

`package.json` declares `"icon": "cai-connector.png"`. The referenced root file exists, is a 128 x 128 PNG, and is not excluded by `.vscodeignore`; it therefore meets the documented PNG, inclusion, and minimum-dimension requirements, and it is not an SVG rejected by `vsce`.

Its PNG header declares truecolor with alpha (RGBA), but the reviewed sources do not require transparency. At 128 x 128, it does not meet the documentation's 256 x 256 Retina guidance.

## Activity Bar Sidebar Icon

The CAI Connector sidebar is a custom Activity Bar view container, declared in `package.json` under `contributes.viewsContainers.activitybar`. Its `icon` field is independent of the Marketplace `icon` field above.

- VS Code specifies that Activity Bar view-container icons should be centered at 24 x 24 pixels, use one color, and preferably be SVG. Other image formats are accepted. VS Code applies 60% opacity by default and 100% opacity for hover and active states. Source: https://code.visualstudio.com/api/references/contribution-points#contributes.viewsContainers
- The manifest points this icon to `media/cai-sidebar.svg`, so it uses the recommended SVG format. Source: https://code.visualstudio.com/api/references/contribution-points#contributes.viewsContainers

## CAI Connector Sidebar Assessment

`media/cai-sidebar.svg` has a `viewBox="0 0 24 24"` and uses `currentColor` for both its path stroke and text fill. It therefore follows the 24 x 24 coordinate system, single-color guidance, and lets VS Code apply the documented state styling. No manifest or asset-format change is required.