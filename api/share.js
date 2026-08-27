export default function handler(req, res) {
  const {
    away = 'Visitante',
    home = 'Local',
    awayLogo = '',
    homeLogo = '',
    code = '',
    game = 'grids',
    sport = 'nfl',
    title = '',
    desc = ''
  } = req.query;

  // Resolve team logos
  const logoA = awayLogo || `https://a.espncdn.com/i/teamlogos/${sport}/500/${away.toLowerCase().trim()}.png`;
  const logoB = homeLogo || `https://a.espncdn.com/i/teamlogos/${sport}/500/${home.toLowerCase().trim()}.png`;

  const b64A = Buffer.from(logoA).toString('base64').replace(/=+$/, '');
  const b64B = Buffer.from(logoB).toString('base64').replace(/=+$/, '');

  const imageUrl = `https://res.cloudinary.com/demo/image/upload/w_1200,h_630,c_fill,b_rgb:0e1015/l_fetch:${b64A},w_280,g_west,x_120/l_fetch:${b64B},w_280,g_east,x_120/l_text:Arial_60_bold:VS,co_rgb:ffd100,g_center/sample.jpg`;

  const gameTitle = title || (game === 'firstgoal' 
    ? `⚽ ${away} vs ${home} — Primer Gol` 
    : `🏈 ${away} @ ${home} — NFL Grid`);

  const gameDesc = desc || (game === 'firstgoal'
    ? '¡Adivina quién anota el primer gol y gana en Drinks & Wins!'
    : '¡Escoge tus casillas para el partido en vivo y gana premios en cada cuarto!');

  const targetTab = game === 'firstgoal' ? 'tab-firstgoal' : 'tab-grids';
  const redirectUrl = `https://chefalbertomc.github.io/NFL-grids-/index.html?tab=${targetTab}${code ? `&code=${encodeURIComponent(code)}` : ''}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');

  return res.status(200).send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${gameTitle}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Open Graph / WhatsApp -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${redirectUrl}">
  <meta property="og:title" content="${gameTitle}">
  <meta property="og:description" content="${gameDesc}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${gameTitle}">
  <meta name="twitter:description" content="${gameDesc}">
  <meta name="twitter:image" content="${imageUrl}">

  <!-- Instant Browser Redirect for Real Users -->
  <meta http-equiv="refresh" content="0;url=${redirectUrl}">
  <style>
    body { background: #0d0e12; color: #ffd100; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .spin { width: 44px; height: 44px; border: 4px solid rgba(255,209,0,0.2); border-top-color: #ffd100; border-radius: 50%; animation: s .8s linear infinite; }
    @keyframes s { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="spin"></div>
  <p style="margin-top:16px; font-weight:bold;">Entrando a Drinks & Wins...</p>
  <script>window.location.replace("${redirectUrl}");</script>
</body>
</html>`);
}
