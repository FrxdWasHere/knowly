export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script>
      (() => {
        try {
          const cached =
            localStorage.getItem("knowly.theme.v2") ||
            localStorage.getItem("knowly.theme.v1");
          if (!cached) return;
          const theme = JSON.parse(cached);
          if (!theme || typeof theme !== "object") return;
          const root = document.documentElement;
          root.classList.toggle("light", theme.mode === "light");
          root.classList.toggle("dark", theme.mode === "dark");
        } catch {}
      })();
    </script>
    <style>
      :root {
        color-scheme: light;
        --background: oklch(0.982 0.008 85);
        --foreground: oklch(0.205 0.014 70);
        --surface: oklch(1 0 0);
        --surface-2: oklch(0.947 0.016 85);
        --primary: oklch(0.53 0.188 25);
        --primary-foreground: oklch(1 0 0);
        --muted-foreground: oklch(0.445 0.018 72);
        --border: oklch(0.205 0.014 70);
        --shadow: oklch(0.205 0.014 70);
      }
      :root.dark {
        color-scheme: dark;
        --background: oklch(0.168 0.008 75);
        --foreground: oklch(0.955 0.014 85);
        --surface: oklch(0.212 0.009 75);
        --surface-2: oklch(0.26 0.01 75);
        --primary: oklch(0.725 0.16 27);
        --primary-foreground: oklch(0.14 0.01 75);
        --muted-foreground: oklch(0.755 0.016 82);
        --border: oklch(0.925 0.012 85);
        --shadow: oklch(0.925 0.012 85);
      }
      * { box-sizing: border-box; }
      body {
        font: 15px/1.5 "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: var(--background);
        color: var(--foreground);
        display: grid;
        place-items: center;
        min-height: 100vh;
        margin: 0;
        padding: 1.5rem;
      }
      .card {
        max-width: 28rem;
        width: 100%;
        text-align: center;
        padding: 2rem;
        border: 2px solid var(--border);
        background: var(--surface);
        border-radius: 1rem;
        box-shadow: 6px 6px 0 var(--shadow);
      }
      h1 {
        font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
        font-size: 1.5rem;
        letter-spacing: -0.02em;
        margin: 0 0 0.5rem;
      }
      p { color: var(--muted-foreground); margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 2.75rem;
        padding: 0.625rem 1rem;
        border-radius: 0.5rem;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
        border: 2px solid var(--border);
      }
      a:focus-visible, button:focus-visible {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
      }
      .primary {
        background: var(--primary);
        color: var(--primary-foreground);
        box-shadow: 3px 3px 0 var(--shadow);
      }
      .secondary { background: var(--surface-2); color: var(--foreground); }
      @media (max-width: 380px) {
        .actions { flex-direction: column; }
        a, button { width: 100%; }
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
