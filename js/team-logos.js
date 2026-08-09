// Shared NFL Team Logos Utility for Wings & Wins
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

  window.getTeamLogoURL = function(teamName) {
    if (!teamName) return 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/nfl.png';
    const clean = teamName.toLowerCase().trim();
    for (const [key, val] of Object.entries(TEAM_MAP)) {
      if (clean.includes(key)) {
        return `https://a.espncdn.com/i/teamlogos/nfl/500/${val}.png`;
      }
    }
    return 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/nfl.png';
  };
})();
