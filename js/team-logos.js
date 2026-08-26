// Shared Team Logos, Colors & Secondary Colors — Drink & Wins (NFL, Liga MX, Soccer, Multi-Sport)
(function() {
  'use strict';

  const TEAM_MAP = {
    // NFL
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
    'commanders': 'wsh', 'washington': 'wsh',

    // Liga MX
    'america': 'ame', 'américa': 'ame', 'aguilas': 'ame',
    'chivas': 'gdl', 'guadalajara': 'gdl',
    'cruz azul': 'caz', 'cruzazul': 'caz',
    'pumas': 'pum', 'unam': 'pum',
    'tigres': 'tig', 'uanl': 'tig',
    'monterrey': 'mty', 'rayados': 'mty',
    'toluca': 'tol', 'diablos': 'tol',
    'santos': 'san', 'santos laguna': 'san',
    'pachuca': 'pac', 'tuzos': 'pac',
    'leon': 'leo', 'león': 'leo',
    'atlas': 'atl_mx', 'rojinegros': 'atl_mx',
    'puebla': 'pue', 'franja': 'pue',
    'queretaro': 'qro', 'querétaro': 'qro', 'gallos': 'qro',
    'tijuana': 'tij', 'xolos': 'tij',
    'necaxa': 'nec', 'rayos': 'nec',
    'mazatlan': 'maz', 'mazatlán': 'maz',
    'san luis': 'asl', 'atlético de san luis': 'asl',
    'juarez': 'jua', 'juárez': 'jua', 'bravos': 'jua',

    // European Soccer
    'real madrid': 'rma', 'madrid': 'rma',
    'barcelona': 'bar', 'barça': 'bar',
    'atletico madrid': 'atm', 'atlético de madrid': 'atm',
    'manchester city': 'mci', 'man city': 'mci',
    'manchester united': 'mun', 'man united': 'mun',
    'liverpool': 'liv',
    'arsenal': 'ars',
    'chelsea': 'che',
    'psg': 'psg', 'paris saint-germain': 'psg',
    'bayern': 'bay', 'bayern munich': 'bay',
    'dortmund': 'dor', 'borussia dortmund': 'dor',
    'juventus': 'juv',
    'inter': 'int', 'inter milan': 'int',
    'milan': 'acm', 'ac milan': 'acm'
  };

  // Primary Colors
  const TEAM_COLORS = {
    // NFL
    'ari': '#97233F', 'atl': '#A71930', 'bal': '#241773', 'buf': '#00338D',
    'car': '#0085CA', 'chi': '#0B162A', 'cin': '#FB4F14', 'cle': '#FF3C00',
    'dal': '#003594', 'den': '#FB4F14', 'det': '#0076B6', 'gb':  '#203731',
    'hou': '#03202F', 'ind': '#002C5F', 'jax': '#006778', 'kc':  '#E31837',
    'lv':  '#222222', 'lac': '#0080C6', 'lar': '#003594', 'mia': '#008E97',
    'min': '#4F2683', 'ne':  '#002244', 'no':  '#A08A4A', 'nyg': '#0B2265',
    'nyj': '#125740', 'phi': '#004C54', 'pit': '#FFB612', 'sf':  '#AA0000',
    'sea': '#002244', 'tb':  '#D50A0A', 'ten': '#0C2340', 'wsh': '#5A1414',

    // Liga MX
    'ame': '#002C6A', 'gdl': '#D81A2A', 'caz': '#0048A0', 'pum': '#142954',
    'tig': '#FDB813', 'mty': '#002B49', 'tol': '#D71920', 'san': '#006847',
    'pac': '#002D62', 'leo': '#006341', 'atl_mx': '#000000', 'pue': '#002B49',
    'qro': '#002B49', 'tij': '#CC0000', 'nec': '#E31B23', 'maz': '#582C83',
    'asl': '#D81E05', 'jua': '#00953B',

    // International Soccer
    'rma': '#00529F', 'bar': '#004D98', 'atm': '#CB3524',
    'mci': '#6CABDD', 'mun': '#DA291C', 'liv': '#C8102E',
    'ars': '#EF0107', 'che': '#034694', 'psg': '#004170',
    'bay': '#DC052D', 'dor': '#FDE100', 'juv': '#000000',
    'int': '#00579C', 'acm': '#FB090B'
  };

  // Secondary (stroke/accent) Colors
  const TEAM_SECONDARY = {
    'ari': '#FFB612', 'atl': '#000000', 'bal': '#9E7C0C', 'buf': '#C60C30',
    'car': '#101820', 'chi': '#C83803', 'cin': '#000000', 'cle': '#311D00',
    'dal': '#869397', 'den': '#002244', 'det': '#B0B7BC', 'gb':  '#FFB612',
    'hou': '#C9243F', 'ind': '#A2AAAD', 'jax': '#D7A22A', 'kc':  '#FFB81C',
    'lv':  '#A5ACAF', 'lac': '#FFC20E', 'lar': '#FFA300', 'mia': '#FC4C02',
    'min': '#FFC62F', 'ne':  '#C60C30', 'no':  '#101820', 'nyg': '#A71930',
    'nyj': '#000000', 'phi': '#A5ACAF', 'pit': '#101820', 'sf':  '#B3995D',
    'sea': '#69BE28', 'tb':  '#FF7900', 'ten': '#4B92DB', 'wsh': '#FFB612',

    'ame': '#FBE122', 'gdl': '#002B49', 'caz': '#E31B23', 'pum': '#C59B27',
    'tig': '#004B87', 'mty': '#FFFFFF', 'tol': '#FFFFFF', 'san': '#FFFFFF',
    'pac': '#C0C0C0', 'leo': '#FFD100', 'atl_mx': '#D31126', 'pue': '#FFFFFF',
    'qro': '#000000', 'tij': '#000000', 'nec': '#FFFFFF', 'maz': '#00A3E0',
    'asl': '#002855', 'jua': '#E31B23',

    'rma': '#FEBE10', 'bar': '#A50044', 'atm': '#1B3B6F',
    'mci': '#1C2C5B', 'mun': '#000000', 'liv': '#00B2A9',
    'ars': '#063672', 'che': '#EE242C', 'psg': '#DA291C',
    'bay': '#0066B2', 'dor': '#000000', 'juv': '#FFFFFF',
    'int': '#000000', 'acm': '#000000'
  };

  function resolve(teamName) {
    if (!teamName) return null;
    const clean = teamName.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const [key, val] of Object.entries(TEAM_MAP)) {
      const normKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (clean === normKey || clean.includes(normKey)) return val;
    }
    return null;
  }

  window.getTeamLogoURL = function(teamName) {
    const abbr = resolve(teamName);
    if (abbr) {
      if (['ame','gdl','caz','pum','tig','mty','tol','san','pac','leo','atl_mx','pue','qro','tij','nec','maz','asl','jua'].includes(abbr)) {
        return `https://a.espncdn.com/i/teamlogos/soccer/500/${abbr.replace('_mx','')}.png`;
      }
      return 'https://a.espncdn.com/i/teamlogos/nfl/500/' + abbr + '.png';
    }
    return 'img/logo.jpg';
  };

  window.getTeamColor = function(teamName) {
    const abbr = resolve(teamName);
    return abbr ? (TEAM_COLORS[abbr] || '#1a1a24') : '#1a1a24';
  };

  window.getTeamSecondaryColor = function(teamName) {
    const abbr = resolve(teamName);
    return abbr ? (TEAM_SECONDARY[abbr] || '#ffd100') : '#ffd100';
  };

  window.resolveTeamStyle = function(teamData) {
    if (!teamData) {
      return { name: 'Equipo', abbr: 'EQP', logo: 'img/logo.jpg', color: '#1a1a24', secondaryColor: '#ffd100' };
    }
    if (typeof teamData === 'string') {
      const abbr = resolve(teamData);
      return {
        name: teamData,
        abbr: abbr ? abbr.toUpperCase() : teamData.slice(0, 3).toUpperCase(),
        logo: window.getTeamLogoURL(teamData),
        color: window.getTeamColor(teamData),
        secondaryColor: window.getTeamSecondaryColor(teamData)
      };
    }
    
    // ESPN Team object
    const rawName = teamData.shortDisplayName || teamData.displayName || teamData.name || 'Equipo';
    const cleanAbbr = teamData.abbreviation || teamData.abbr || (resolve(rawName) || rawName.slice(0, 3)).toUpperCase();
    const rawLogo = teamData.logo || teamData.teamLogo || window.getTeamLogoURL(rawName);
    
    let rawColor = teamData.color;
    if (rawColor) {
      rawColor = rawColor.startsWith('#') ? rawColor : '#' + rawColor;
    } else {
      rawColor = window.getTeamColor(rawName);
    }

    let rawSec = teamData.alternateColor || teamData.secondaryColor;
    if (rawSec) {
      rawSec = rawSec.startsWith('#') ? rawSec : '#' + rawSec;
    } else {
      rawSec = window.getTeamSecondaryColor(rawName);
    }

    return {
      name: rawName,
      abbr: cleanAbbr,
      logo: rawLogo,
      color: rawColor,
      secondaryColor: rawSec
    };
  };

  window.getTeamInfo = function(teamName) {
    return window.resolveTeamStyle(teamName);
  };
})();

