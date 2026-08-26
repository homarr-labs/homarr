const overview = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        overflow: hidden;
        color: #f8f9fa;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        background:
          radial-gradient(circle at 18% 15%, rgba(116, 143, 252, .32), transparent 36%),
          radial-gradient(circle at 82% 80%, rgba(59, 201, 219, .22), transparent 42%),
          #15121f;
      }
      main { width: min(86%, 34rem); text-align: center; }
      .mark {
        width: 4rem;
        height: 4rem;
        margin: 0 auto 1rem;
        display: grid;
        place-items: center;
        border-radius: 1.25rem;
        font-size: 1.75rem;
        font-weight: 900;
        background: linear-gradient(135deg, #748ffc, #3bc9db);
        box-shadow: 0 1rem 3rem rgba(116, 143, 252, .34);
      }
      h1 { margin: 0; font-size: clamp(1.5rem, 8vw, 2.5rem); letter-spacing: -.04em; }
      p { margin: .65rem auto 0; max-width: 28rem; color: #c1c2c5; line-height: 1.55; }
      .signals { display: flex; justify-content: center; gap: .55rem; margin-top: 1.25rem; flex-wrap: wrap; }
      span { padding: .38rem .7rem; border: 1px solid rgba(255,255,255,.13); border-radius: 999px; background: rgba(255,255,255,.06); font-size: .75rem; }
    </style>
  </head>
  <body>
    <main>
      <div class="mark">H</div>
      <h1>Your home, at a glance.</h1>
      <p>Bring services, media, infrastructure, notes and everyday tools together on one practical dashboard.</p>
      <div class="signals"><span>59 widgets</span><span>Mock data included</span><span>Built for self-hosters</span></div>
    </main>
  </body>
</html>`;

export const GET = () =>
  new Response(overview, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
