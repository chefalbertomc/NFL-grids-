// Shared NFL Team Logos, Colors & Secondary Colors — Drink & Wins
(function() {
  'use strict';

  const TEAM_MAP = {
    'cardinals': 'ari', 'arizona': 'ari',
    'falcons': 'atl', 'atlanta': 'atl',
    'ravens': 'bal', 'baltimore': 'bal',
    'bills': 'buf', 'buffalo': 'buf',
    'panthers': 'car', 'carolina': 'car',
    'bears': 'chi', 'chicago': 'chi',
    'bengals': 'cin', 'cincinnati': 'cin',
    'browns': 'cle', 'cleveland': 'cle',
    'cowboys': 'dal', 'dallas': 'dal',
    'broncos': 'den', 'denver': 'den',
    'lions': 'det', 'detroit': 'det',
    'packers': 'gb', 'green bay': 'gb',
    'texans': 'hou', 'houston': 'hou',
    'colts': 'ind', 'indianapolis': 'ind',
    'jaguars': 'jax', 'jacksonville': 'jax',
    'chiefs': 'kc', 'kansas city': 'kc',
    'raiders': 'lv', 'las vegas': 'lv',
    'chargers': 'lac', 'los angeles chargers': 'lac',
    'rams': 'lar', 'los angeles rams': 'lar',
    'dolphins': 'mia', 'miami': 'mia',
    'vikings': 'min', 'minnesota': 'min',
    'patriots': 'ne', 'new england': 'ne',
    'saints': 'no', 'new orleans': 'no',
    'giants': 'nyg', 'new york giants': 'nyg',
    'jets': 'nyj', 'new york jets': 'nyj',
    'eagles': 'phi', 'philadelphia': 'phi',
    'steelers': 'pit', 'pittsburgh': 'pit',
    '49ers': 'sf', 'san francisco': 'sf',
    'seahawks': 'sea', 'seattle': 'sea',
    'buccaneers': 'tb', 'tampa bay': 'tb',
    'titans': 'ten', 'tennessee': 'ten',
    'commanders': 'wsh', 'washington': 'wsh'
  };

  // Primary (fill) color
  const TEAM_COLORS = {
    'ari': '#97233F', 'atl': '#A71930', 'bal': '#241773', 'buf': '#00338D',
    'car': '#0085CA', 'chi': '#0B162A', 'cin': '#FB4F14', 'cle': '#FF3C00',
    'dal': '#003594', 'den': '#FB4F14', 'det': '#0076B6', 'gb':  '#203731',
    'hou': '#03202F', 'ind': '#002C5F', 'jax': '#006778', 'kc':  '#E31837',
    'lv':  '#222222', 'lac': '#0080C6', 'lar': '#003594', 'mia': '#008E97',
    'min': '#4F2683', 'ne':  '#002244', 'no':  '#A08A4A', 'nyg': '#0B2265',
    'nyj': '#125740', 'phi': '#004C54', 'pit': '#FFB612', 'sf':  '#AA0000',
    'sea': '#002244', 'tb':  '#D50A0A', 'ten': '#0C2340', 'wsh': '#5A1414'
  };

  // Secondary (stroke/outline) color — the team's accent color
  const TEAM_SECONDARY = {
    'ari': '#FFB612', // Cardinals - Gold
    'atl': '#000000', // Falcons - Black
    'bal': '#9E7C0C', // Ravens - Gold
    'buf': '#C60C30', // Bills - Red
    'car': '#101820', // Panthers - Black
    'chi': '#C83803', // Bears - Orange
    'cin': '#000000', // Bengals - Black
    'cle': '#311D00', // Browns - Brown
    'dal': '#869397', // Cowboys - Silver
    'den': '#002244', // Broncos - Navy
    'det': '#B0B7BC', // Lions - Silver
    'gb':  '#FFB612', // Packers - Gold
    'hou': '#C9243F', // Texans - Red
    'ind': '#A2AAAD', // Colts - Silver
    'jax': '#D7A22A', // Jaguars - Gold
    'kc':  '#FFB81C', // Chiefs - Gold
    'lv':  '#A5ACAF', // Raiders - Silver
    'lac': '#FFC20E', // Chargers - Gold
    'lar': '#FFA300', // Rams - Gold
    'mia': '#FC4C02', // Dolphins - Orange
    'min': '#FFC62F', // Vikings - Gold
    'ne':  '#C60C30', // Patriots - Red
    'no':  '#101820', // Saints - Black
    'nyg': '#A71930', // Giants - Red
    'nyj': '#000000', // Jets - Black
    'phi': '#A5ACAF', // Eagles - Silver
    'pit': '#101820', // Steelers - Black
    'sf':  '#B3995D', // 49ers - Gold
    'sea': '#69BE28', // Seahawks - Action Green
    'tb':  '#FF7900', // Buccaneers - Orange
    'ten': '#4B92DB', // Titans - Titans Blue
    'wsh': '#FFB612'  // Commanders - Gold
  };

  function resolve(teamName) {
    if (!teamName) return null;
    const clean = teamName.toLowerCase().trim();
    for (const [key, val] of Object.entries(TEAM_MAP)) {
      if (clean.includes(key)) return val;
    }
    return null;
  }

  window.getTeamLogoURL = function(teamName) {
    const abbr = resolve(teamName);
    if (abbr) return 'https://a.espncdn.com/i/teamlogos/nfl/500/' + abbr + '.png';
    return 'img/logo.jpg';
  };

  const TEAM_NICKNAMES = {
    'ari': 'Cardinals', 'atl': 'Falcons', 'bal': 'Ravens', 'buf': 'Bills',
    'car': 'Panthers', 'chi': 'Bears', 'cin': 'Bengals', 'cle': 'Browns',
    'dal': 'Cowboys', 'den': 'Broncos', 'det': 'Lions', 'gb': 'Packers',
    'hou': 'Texans', 'ind': 'Colts', 'jax': 'Jaguars', 'kc': 'Chiefs',
    'lv': 'Raiders', 'lac': 'Chargers', 'lar': 'Rams', 'mia': 'Dolphins',
    'min': 'Vikings', 'ne': 'Patriots', 'no': 'Saints', 'nyg': 'Giants',
    'nyj': 'Jets', 'phi': 'Eagles', 'pit': 'Steelers', 'sf': '49ers',
    'sea': 'Seahawks', 'tb': 'Buccaneers', 'ten': 'Titans', 'wsh': 'Commanders'
  };

  window.getTeamNickname = function(teamName, defaultAbbr) {
    if (!teamName) return defaultAbbr || '';
    const abbr = resolve(teamName) || resolve(defaultAbbr);
    if (abbr && TEAM_NICKNAMES[abbr]) return TEAM_NICKNAMES[abbr];
    
    // Fallback: Use the last word of the team name, capitalized
    const words = teamName.trim().split(/\s+/);
    const lastWord = words[words.length - 1];
    return lastWord.charAt(0).toUpperCase() + lastWord.slice(1);
  };

  window.getTeamColor = function(teamName) {
    const abbr = resolve(teamName);
    return abbr ? (TEAM_COLORS[abbr] || '#ffd100') : '#ffd100';
  };

  window.getTeamInfo = function(teamName) {
    const abbr = resolve(teamName);
    const color = abbr ? (TEAM_COLORS[abbr] || '#ffd100') : '#ffd100';
    const secondaryColor = abbr ? (TEAM_SECONDARY[abbr] || '#ffffff') : '#ffffff';
    const logo = abbr
      ? 'https://a.espncdn.com/i/teamlogos/nfl/500/' + abbr + '.png'
      : 'img/logo.jpg';
    return { abbr, color, secondaryColor, logo };
  };
})();
