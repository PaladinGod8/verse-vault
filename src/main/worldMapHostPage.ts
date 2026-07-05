/**
 * @role World-map editor host page builder
 * @owns Inline wrapper HTML that adds Verse Vault controls around the vendored FMG app
 * @seam Protocol-served page loaded in the dedicated world-map BrowserWindow
 * @calls window.worldMapHost from preloadWorldMap and same-origin iframe access to FMG
 */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildWorldMapHostPageHtml(vendorVersion: string): string {
  const safeVendorVersion = escapeHtml(vendorVersion);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self' data: blob:; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; connect-src 'self' data: blob:; object-src 'none'; base-uri 'none'"
    />
    <title>World Map</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body data-vendor-version="${safeVendorVersion}">
    <header class="toolbar">
      <div class="identity">
        <p class="eyebrow">Verse Vault World Map</p>
        <h1 class="title" id="world-title">Opening editor...</h1>
        <p class="host-note">
          Verse Vault <strong>Save</strong> is canonical. FMG browser-storage,
          Dropbox, and built-in save/load flows are suppressed in this host.
        </p>
      </div>
      <div class="toolbar-buttons">
        <button class="primary" id="save-button" type="button">Save</button>
        <button class="danger" id="regenerate-button" type="button">Regenerate</button>
        <button id="export-button" type="button">Export Copy</button>
        <button id="close-button" type="button">Close</button>
      </div>
    </header>

    <main class="frame-shell">
      <iframe id="fmg-frame" title="Fantasy Map Generator"></iframe>
    </main>

    <footer class="status" id="status-line">
      Preparing Azgaar Fantasy Map Generator ${safeVendorVersion}...
    </footer>

    <script src="script.js"></script>
  </body>
</html>`;
}
