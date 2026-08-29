const TEAM_MAP = {
  // NFL
  'cardinals': 'ari', 'arizona': 'ari', 'ari': 'ari',
  'falcons': 'atl', 'atlanta': 'atl', 'atl': 'atl',
  'ravens': 'bal', 'baltimore': 'bal', 'bal': 'bal',
  'bills': 'buf', 'buffalo': 'buf', 'buf': 'buf',
  'panthers': 'car', 'carolina': 'car', 'car': 'car',
  'bears': 'chi', 'chicago': 'chi', 'chi': 'chi',
  'bengals': 'cin', 'cincinnati': 'cin', 'cin': 'cin',
  'browns': 'cle', 'cleveland': 'cle', 'cle': 'cle',
  'cowboys': 'dal', 'dallas': 'dal', 'dal': 'dal',
  'broncos': 'den', 'denver': 'den', 'den': 'den',
  'lions': 'det', 'detroit': 'det', 'det': 'det',
  'packers': 'gb', 'green bay': 'gb', 'gb': 'gb',
  'texans': 'hou', 'houston': 'hou', 'hou': 'hou',
  'colts': 'ind', 'indianapolis': 'ind', 'ind': 'ind',
  'jaguars': 'jax', 'jacksonville': 'jax', 'jax': 'jax',
  'chiefs': 'kc', 'kansas city': 'kc', 'kc': 'kc',
  'raiders': 'lv', 'las vegas': 'lv', 'lv': 'lv',
  'chargers': 'lac', 'los angeles chargers': 'lac', 'lac': 'lac',
  'rams': 'lar', 'los angeles rams': 'lar', 'lar': 'lar',
  'dolphins': 'mia', 'miami': 'mia', 'mia': 'mia',
  'vikings': 'min', 'minnesota': 'min', 'min': 'min',
  'patriots': 'ne', 'new england': 'ne', 'ne': 'ne',
  'saints': 'no', 'new orleans': 'no', 'no': 'no',
  'giants': 'nyg', 'new york giants': 'nyg', 'nyg': 'nyg',
  'jets': 'nyj', 'new york jets': 'nyj', 'nyj': 'nyj',
  'eagles': 'phi', 'philadelphia': 'phi', 'phi': 'phi',
  'steelers': 'pit', 'pittsburgh': 'pit', 'pit': 'pit',
  '49ers': 'sf', 'san francisco': 'sf', 'sf': 'sf',
  'seahawks': 'sea', 'seattle': 'sea', 'sea': 'sea',
  'buccaneers': 'tb', 'tampa bay': 'tb', 'tb': 'tb',
  'titans': 'ten', 'tennessee': 'ten', 'ten': 'ten',
  'commanders': 'wsh', 'washington': 'wsh', 'wsh': 'wsh',

  // Liga MX
  'america': 'ame', 'américa': 'ame', 'ame': 'ame',
  'chivas': 'gdl', 'guadalajara': 'gdl', 'gdl': 'gdl',
  'cruz azul': 'caz', 'cruzazul': 'caz', 'caz': 'caz',
  'pumas': 'pum', 'unam': 'pum', 'pum': 'pum',
  'tigres': 'tig', 'uanl': 'tig', 'tig': 'tig',
  'monterrey': 'mty', 'rayados': 'mty', 'mty': 'mty',
  'toluca': 'tol', 'diablos': 'tol', 'tol': 'tol',
  'santos': 'san', 'santos laguna': 'san', 'san': 'san',
  'pachuca': 'pac', 'tuzos': 'pac', 'pac': 'pac',
  'leon': 'leo', 'león': 'leo', 'leo': 'leo',
  'atlas': 'atl_mx', 'rojinegros': 'atl_mx',
  'puebla': 'pue', 'franja': 'pue', 'pue': 'pue',
  'queretaro': 'qro', 'querétaro': 'qro', 'gallos': 'qro', 'qro': 'qro',
  'tijuana': 'tij', 'xolos': 'tij', 'tij': 'tij',
  'necaxa': 'nec', 'rayos': 'nec', 'nec': 'nec',
  'mazatlan': 'maz', 'mazatlán': 'maz', 'maz': 'maz',
  'san luis': 'asl', 'atlético de san luis': 'asl', 'asl': 'asl',
  'juarez': 'jua', 'juárez': 'jua', 'bravos': 'jua', 'jua': 'jua',

  // European Soccer
  'real madrid': 'rma', 'madrid': 'rma', 'rma': 'rma',
  'barcelona': 'bar', 'barça': 'bar', 'bar': 'bar',
  'atletico madrid': 'atm', 'atlético de madrid': 'atm', 'atm': 'atm',
  'real sociedad': 'rso', 'sociedad': 'rso', 'rso': 'rso',
  'athletic club': 'ath', 'athletic': 'ath', 'bilbao': 'ath', 'ath': 'ath',
  'arsenal': 'ars', 'ars': 'ars',
  'chelsea': 'che', 'che': 'che',
  'liverpool': 'liv', 'liv': 'liv',
  'manchester city': 'mci', 'man city': 'mci', 'mci': 'mci',
  'manchester united': 'mun', 'man united': 'mun', 'mun': 'mun',
  'bayern': 'bay', 'bayern munich': 'bay', 'bay': 'bay',
  'dortmund': 'dor', 'borussia dortmund': 'dor', 'dor': 'dor',
  'psg': 'psg', 'paris saint-germain': 'psg',
  'juventus': 'juv', 'juv': 'juv',
  'inter': 'int', 'inter milan': 'int', 'int': 'int',
  'milan': 'acm', 'ac milan': 'acm', 'acm': 'acm'
};

const SOCCER_ID_MAP = {
  'ame': '221', 'gdl': '227', 'caz': '224', 'pum': '233', 'tig': '235', 'mty': '230',
  'tol': '236', 'san': '234', 'pac': '231', 'leo': '9489', 'atl_mx': '222', 'pue': '232',
  'qro': '2960', 'tij': '11142', 'nec': '229', 'maz': '21775', 'asl': '18247', 'jua': '17852',
  'rma': '86', 'bar': '83', 'atm': '1068', 'rso': '89', 'ath': '93', 'ars': '359',
  'che': '363', 'liv': '364', 'mci': '382', 'mun': '360', 'bay': '132', 'dor': '124',
  'psg': '160', 'juv': '111', 'int': '110', 'acm': '103'
};

function resolveLogo(name, sport) {
  if (!name) return 'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png';
  const clean = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // 1) Direct exact match
  let code = TEAM_MAP[clean];

  // 2) Substring match — only for keys of 4+ chars to avoid false positives
  //    (e.g. 'ne' appearing inside 'tennessee', 'no' inside 'broncos', etc.)
  if (!code) {
    for (const k in TEAM_MAP) {
      if (k.length >= 4 && clean.includes(k)) {
        code = TEAM_MAP[k];
        break;
      }
    }
  }

  // 3) Word-by-word match as last resort
  if (!code) {
    for (const word of clean.split(/\s+/)) {
      if (TEAM_MAP[word]) {
        code = TEAM_MAP[word];
        break;
      }
    }
  }

  if (!code) code = clean.replace(/[^a-z0-9]/g, '');

  if (sport === 'soccer' || SOCCER_ID_MAP[code]) {
    const sId = SOCCER_ID_MAP[code] || code;
    return `https://a.espncdn.com/i/teamlogos/soccer/500/${sId}.png`;
  }
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${code}.png`;
}


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

  const logoA = awayLogo || resolveLogo(away, sport);
  const logoB = homeLogo || resolveLogo(home, sport);

  const b64A = Buffer.from(logoA).toString('base64').replace(/=+$/, '');
  const b64B = Buffer.from(logoB).toString('base64').replace(/=+$/, '');

  const imageUrl = `https://res.cloudinary.com/demo/image/upload/w_1200,h_630,c_fill,e_colorize:100,co_rgb:0d0e12/l_text:Arial_36_bold:DRINKS%20%26%20WINS,co_rgb:ffd100,g_north,y_40/l_fetch:${b64A},w_320,g_west,x_100/l_fetch:${b64B},w_320,g_east,x_100/l_text:Arial_72_bold:VS,co_rgb:ffd100,g_center/sample.jpg`;

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
    body { background: #0d0e12; color: #ff6600; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .spin { width: 44px; height: 44px; border: 4px solid rgba(255,209,0,0.2); border-top-color: #ff6600; border-radius: 50%; animation: s .8s linear infinite; }
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
