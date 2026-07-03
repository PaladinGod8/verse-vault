export const WORLD_MAP_HOST_PAGE_STYLE = String.raw`
      :root {
        color-scheme: dark;
        font-family: "Segoe UI", system-ui, sans-serif;
        background: #020617;
        color: #e2e8f0;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        grid-template-rows: auto 1fr auto;
        background:
          radial-gradient(circle at top, rgba(14, 165, 233, 0.18), transparent 34%),
          linear-gradient(180deg, #0f172a 0%, #020617 100%);
      }

      .toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
        padding: 0.85rem 1rem;
        border-bottom: 1px solid rgba(148, 163, 184, 0.22);
        background: rgba(2, 6, 23, 0.92);
        backdrop-filter: blur(12px);
      }

      .identity {
        min-width: 14rem;
        flex: 1 1 16rem;
      }

      .eyebrow {
        margin: 0;
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #7dd3fc;
      }

      .title {
        margin: 0.15rem 0 0;
        font-size: 1.05rem;
        font-weight: 700;
      }

      .host-note {
        margin: 0.35rem 0 0;
        max-width: 44rem;
        color: #cbd5e1;
        font-size: 0.84rem;
        line-height: 1.4;
      }

      .host-note strong {
        color: #f8fafc;
      }

      .toolbar-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      button {
        border: 1px solid rgba(148, 163, 184, 0.25);
        background: rgba(15, 23, 42, 0.9);
        color: #e2e8f0;
        border-radius: 999px;
        padding: 0.55rem 0.95rem;
        font: inherit;
        cursor: pointer;
        transition: background 120ms ease, border-color 120ms ease, opacity 120ms ease;
      }

      button:hover:not(:disabled) {
        background: rgba(30, 41, 59, 0.98);
        border-color: rgba(125, 211, 252, 0.45);
      }

      button:disabled {
        opacity: 0.55;
        cursor: progress;
      }

      .primary {
        background: linear-gradient(135deg, #0ea5e9, #0284c7);
        border-color: rgba(14, 165, 233, 0.9);
        color: #f8fafc;
      }

      .danger {
        border-color: rgba(251, 146, 60, 0.45);
      }

      .frame-shell {
        position: relative;
        min-height: 0;
      }

      iframe {
        width: 100%;
        height: 100%;
        min-height: calc(100vh - 10rem);
        border: 0;
        background: #020617;
      }

      .status {
        padding: 0.75rem 1rem 0.9rem;
        border-top: 1px solid rgba(148, 163, 184, 0.14);
        background: rgba(2, 6, 23, 0.92);
        color: #cbd5e1;
        font-size: 0.92rem;
      }

      .status strong {
        color: #f8fafc;
      }

      .error {
        color: #fecaca;
      }
`;
