// Promotional Story & Table-Tent Cards Generator — Drinks & Wins (1080x1920 HD)
(function() {
  'use strict';

  const CARDS_DATA = [
    {
      id: 'card-general',
      icon: '🏅',
      tag: 'PORTAL GENERAL',
      title: '¿QUÉ ES DRINKS & WINS?',
      subtitle: 'Tu plataforma interactiva para partidos.',
      desc: 'Pronostica marcadores, compite en trivias en vivo, escoge tus casillas en grids y gana premios directos en tu mesa.',
      cta: '¡Únete a la diversión! 👇',
      leftEmoji: '🏈',
      rightEmoji: '🍺',
      badge1: '🎯 Juegos de Bar',
      badge2: '🎁 Premios en Vivo',
      qrUrl: 'https://bgames.s.gy/drinkandwins',
      displayUrl: 'bgames.s.gy/drinkandwins',
      theme: 'gold'
    },
    {
      id: 'card-nfl',
      icon: '🏈',
      tag: 'TEMPORADA NFL',
      title: '¡VIVE LA NFL EN DRINKS & WINS!',
      subtitle: 'El emparrillado en la palma de tu mano.',
      desc: '¡Gana premios durante todo el partido! Participa en los Grids de 100 casillas con marcadores de cada cuarto y en el Torneo Survivor semanal.',
      cta: 'Entra a tu tablero aquí 📲',
      leftEmoji: '🏈',
      rightEmoji: '🍺',
      badge1: '🔢 NFL Grids (100 Casillas)',
      badge2: '🛡️ Torneo Survivor',
      qrUrl: 'https://bgames.s.gy/drinkandwins',
      displayUrl: 'bgames.s.gy/drinkandwins',
      theme: 'nfl'
    },
    {
      id: 'card-soccer',
      icon: '⚽',
      tag: 'PASIÓN FUTBOLERA',
      title: 'DEMUESTRA TU INSTINTO GOLEADOR',
      subtitle: 'Juega desde tu celular y festeja doble.',
      desc: 'Pronostica el minuto exacto del primer gol con First Striker Wins y acierta los resultados de la jornada con Quinielas & Pick\'em.',
      cta: '¡Juega aquí con tu mesa! 👇',
      leftEmoji: '⚽',
      rightEmoji: '🍺',
      badge1: '⏱️ First Striker Wins',
      badge2: '📋 Quinielas & Pick\'em',
      qrUrl: 'https://bgames.s.gy/drinkandwins',
      displayUrl: 'bgames.s.gy/drinkandwins',
      theme: 'soccer'
    },
    {
      id: 'card-trivia',
      icon: '🧠',
      tag: 'PANTALLAS EN VIVO',
      title: '¿ERES EL QUE MÁS SABE DE DEPORTES?',
      subtitle: 'Compite en vivo contra todo el bar.',
      desc: 'Juega al mismo tiempo que las pantallas del bar. Responde las preguntas en tu celular antes de que acabe el tiempo y sube al podio.',
      cta: '¡Demuéstralo ahora ingresando el PIN! 📲👇',
      leftEmoji: '🧠',
      rightEmoji: '🍺',
      badge1: '📺 Trivia en Pantallas',
      badge2: '⚡ Respuestas en Tiempo Real',
      qrUrl: 'https://bgames.s.gy/drinkandwins',
      displayUrl: 'bgames.s.gy/drinkandwins',
      theme: 'trivia'
    },
    {
      id: 'card-install',
      icon: '📲',
      tag: 'ACCESO RÁPIDO PWA',
      title: '¡LLEVA DRINKS & WINS CONTIGO!',
      subtitle: 'Instala la aplicación en tu celular sin ocupar memoria.',
      desc: '🍎 iPhone (Safari): Toca "Compartir" 📤 y luego "Agregar al inicio" ➕\n🤖 Android (Chrome): Toca el menú (⋮) y selecciona "Instalar aplicación"',
      cta: '¡Listo para jugar en segundos! 🏆',
      leftEmoji: '📲',
      rightEmoji: '✨',
      badge1: '⚡ Sin descargas pesadas',
      badge2: '🚀 1 Clic con Google',
      qrUrl: 'https://bgames.s.gy/drinkandwins',
      displayUrl: 'bgames.s.gy/drinkandwins',
      theme: 'install'
    }
  ];

  /**
   * Generates a 1080x1920 HD Canvas Story Card
   */
  window.drawPromotionalCard = async function(cardConfig, options) {
    options = options || {};
    const store = options.store || 'Todas las Sucursales';
    const qrTarget = options.qrUrl || cardConfig.qrUrl || 'https://bgames.s.gy/drinkandwins';
    const displayUrl = options.displayUrl || cardConfig.displayUrl || 'bgames.s.gy/drinkandwins';

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    // 1. Background (Premium Card Style: Crisp Light Card with subtle dark border or Dark Luxe)
    const isDark = options.theme === 'dark';
    
    if (isDark) {
      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
      bgGrad.addColorStop(0, '#0f1117');
      bgGrad.addColorStop(0.5, '#161922');
      bgGrad.addColorStop(1, '#0a0b0e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1920);
    } else {
      // Crisp White Table-Tent Background with subtle luxury gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
      bgGrad.addColorStop(0, '#ffffff');
      bgGrad.addColorStop(0.3, '#fbfcfe');
      bgGrad.addColorStop(0.85, '#f4f6fa');
      bgGrad.addColorStop(1, '#eef1f6');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Subtle border frame
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 16;
      ctx.strokeRect(8, 8, 1064, 1904);
    }

    // Top Brand Pill / Tag
    const tagBg = isDark ? 'rgba(255,209,0,0.15)' : '#0f172a';
    const tagColor = isDark ? '#ffd100' : '#ffffff';
    
    ctx.fillStyle = tagBg;
    ctx.beginPath();
    ctx.roundRect(140, 80, 800, 72, 36);
    ctx.fill();

    ctx.fillStyle = tagColor;
    ctx.font = '900 28px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${cardConfig.icon} ${cardConfig.tag}`, 540, 126);

    // Main Card Title
    ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
    ctx.font = '900 54px Outfit, sans-serif';
    
    // Wrap title if needed
    const words = cardConfig.title.split(' ');
    let line1 = '';
    let line2 = '';
    words.forEach(w => {
      if ((line1 + w).length <= 20 && !line2) {
        line1 += (line1 ? ' ' : '') + w;
      } else {
        line2 += (line2 ? ' ' : '') + w;
      }
    });

    if (line2) {
      ctx.fillText(line1, 540, 240);
      ctx.fillText(line2, 540, 305);
    } else {
      ctx.fillText(line1, 540, 270);
    }

    // 2. Drinks & Wins Logo in Centerpiece
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    
    await new Promise(res => {
      logoImg.onload = res;
      logoImg.onerror = res;
      logoImg.src = 'img/logo.jpg';
    });

    // Logo Container Box
    const logoBoxY = line2 ? 350 : 330;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = isDark ? '#1a1d26' : '#ffffff';
    ctx.strokeStyle = '#ffd100';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(390, logoBoxY, 300, 300, 48);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Clip & Draw Logo
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(396, logoBoxY + 6, 288, 288, 42);
    ctx.clip();
    try {
      ctx.drawImage(logoImg, 396, logoBoxY + 6, 288, 288);
    } catch(e) {}
    ctx.restore();

    // Drinks & Wins Title Banner Below Logo
    ctx.fillStyle = isDark ? '#ffd100' : '#0f172a';
    ctx.font = '900 48px Outfit, sans-serif';
    ctx.fillText('DRINKS & WINS', 540, logoBoxY + 370);

    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
    ctx.font = '700 26px Inter, sans-serif';
    ctx.fillText('JUEGOS DE BAR EN TU CELULAR', 540, logoBoxY + 412);

    // Badges strip
    const badgeY = logoBoxY + 450;
    ctx.fillStyle = isDark ? 'rgba(255,209,0,0.12)' : '#f1f5f9';
    ctx.strokeStyle = isDark ? '#ffd100' : '#cbd5e1';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(100, badgeY, 415, 60, 30);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = isDark ? '#ffd100' : '#1e293b';
    ctx.font = '800 24px Inter, sans-serif';
    ctx.fillText(cardConfig.badge1, 307, badgeY + 40);

    ctx.fillStyle = isDark ? 'rgba(255,209,0,0.12)' : '#f1f5f9';
    ctx.beginPath();
    ctx.roundRect(565, badgeY, 415, 60, 30);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = isDark ? '#ffd100' : '#1e293b';
    ctx.fillText(cardConfig.badge2, 772, badgeY + 40);

    // Description Container Box
    const descY = badgeY + 95;
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.04)' : '#ffffff';
    ctx.strokeStyle = isDark ? '#2a2e3d' : '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(90, descY, 900, 220, 32);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = '700 32px Inter, sans-serif';
    ctx.fillText(cardConfig.subtitle, 540, descY + 60);

    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
    ctx.font = '500 26px Inter, sans-serif';
    
    // Multi-line description rendering
    const descLines = cardConfig.desc.split('\n');
    if (descLines.length > 1) {
      ctx.fillText(descLines[0], 540, descY + 115);
      ctx.fillText(descLines[1], 540, descY + 160);
    } else {
      const wordsDesc = cardConfig.desc.split(' ');
      let dLine1 = '', dLine2 = '';
      wordsDesc.forEach(w => {
        if ((dLine1 + w).length <= 48 && !dLine2) dLine1 += (dLine1 ? ' ' : '') + w;
        else dLine2 += (dLine2 ? ' ' : '') + w;
      });
      ctx.fillText(dLine1, 540, descY + 120);
      if (dLine2) ctx.fillText(dLine2, 540, descY + 165);
    }

    // Call to action text
    const ctaY = descY + 280;
    ctx.fillStyle = isDark ? '#ffd100' : '#0f172a';
    ctx.font = '900 36px Outfit, sans-serif';
    ctx.fillText(cardConfig.cta, 540, ctaY);

    // URL Display Banner
    ctx.fillStyle = '#ffd100';
    ctx.beginPath();
    ctx.roundRect(220, ctaY + 20, 640, 64, 32);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = '900 32px Outfit, sans-serif';
    ctx.fillText(displayUrl.toUpperCase(), 540, ctaY + 64);

    // QR Code Container Box
    const qrBoxY = ctaY + 120;
    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';

    const qrSize = 340;
    const qrUrlApi = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&margin=12&data=${encodeURIComponent(qrTarget)}`;

    await new Promise(res => {
      qrImg.onload = res;
      qrImg.onerror = res;
      qrImg.src = qrUrlApi;
    });

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffd100';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(370, qrBoxY, qrSize, qrSize, 36);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    try {
      ctx.drawImage(qrImg, 370, qrBoxY, qrSize, qrSize);
    } catch(e) {}

    // Bottom Decorative Emojis & Footer
    const footerY = qrBoxY + qrSize + 70;
    ctx.font = '64px sans-serif';
    ctx.fillText(cardConfig.leftEmoji, 220, footerY);
    ctx.fillText(cardConfig.rightEmoji, 860, footerY);

    ctx.fillStyle = isDark ? '#64748b' : '#64748b';
    ctx.font = '800 24px Inter, sans-serif';
    ctx.fillText(`📍 ${store.toUpperCase()} • ESCANEA CON TU CÁMARA`, 540, footerY - 10);

    return canvas.toDataURL('image/png');
  };

  /**
   * Generates a 1080x1920 Live Matchup Story Card (e.g. Steelers vs Bills)
   */
  window.drawMatchupStoryCard = async function(gameData, options) {
    options = options || {};
    const away = gameData.awayTeam || gameData.away || 'Visitante';
    const home = gameData.homeTeam || gameData.home || 'Local';
    const code = gameData.code || '';
    const store = gameData.store || options.store || 'Bar & Sports';
    const sport = options.sport || 'nfl';
    const gameType = options.gameType || '🏈 NFL FOOTBALL GRID';

    const infoA = window.resolveTeamStyle ? window.resolveTeamStyle(away) : { name: away, color: '#1a2a44', logo: 'img/logo.jpg' };
    const infoB = window.resolveTeamStyle ? window.resolveTeamStyle(home) : { name: home, color: '#441a2a', logo: 'img/logo.jpg' };

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    // Deep Dark Sports Background
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
    bgGrad.addColorStop(0, '#090a0f');
    bgGrad.addColorStop(0.5, '#12151f');
    bgGrad.addColorStop(1, '#06070a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Top Header Banner
    ctx.fillStyle = 'rgba(255,209,0,0.15)';
    ctx.beginPath();
    ctx.roundRect(140, 70, 800, 68, 34);
    ctx.fill();

    ctx.fillStyle = '#ffd100';
    ctx.font = '900 28px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${gameType} • ${store.toUpperCase()}`, 540, 114);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px Outfit, sans-serif';
    ctx.fillText('¡PARTIDO EN VIVO HOY!', 540, 220);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 26px Inter, sans-serif';
    ctx.fillText('Elige tus casillas y gana premios en tu mesa', 540, 270);

    // Matchup Diagonal Box (Y: 330 to 950)
    const matchBoxY = 330;
    const matchBoxH = 620;

    // Load both logos
    const imgA = new Image(); imgA.crossOrigin = 'anonymous';
    const imgB = new Image(); imgB.crossOrigin = 'anonymous';

    await Promise.all([
      new Promise(r => { imgA.onload = r; imgA.onerror = r; imgA.src = infoA.logo || 'img/logo.jpg'; }),
      new Promise(r => { imgB.onload = r; imgB.onerror = r; imgB.src = infoB.logo || 'img/logo.jpg'; })
    ]);

    // Draw Matchup Card Frame
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(60, matchBoxY, 960, matchBoxH, 44);
    ctx.clip();

    // Left Team A
    const gradA = ctx.createLinearGradient(60, matchBoxY, 540, matchBoxY + matchBoxH);
    gradA.addColorStop(0, infoA.color || '#1e3a8a');
    gradA.addColorStop(1, '#090a12');
    ctx.fillStyle = gradA;
    ctx.beginPath();
    ctx.moveTo(60, matchBoxY);
    ctx.lineTo(600, matchBoxY);
    ctx.lineTo(440, matchBoxY + matchBoxH);
    ctx.lineTo(60, matchBoxY + matchBoxH);
    ctx.closePath();
    ctx.fill();

    // Right Team B
    const gradB = ctx.createLinearGradient(540, matchBoxY, 1020, matchBoxY + matchBoxH);
    gradB.addColorStop(0, infoB.color || '#831843');
    gradB.addColorStop(1, '#090a12');
    ctx.fillStyle = gradB;
    ctx.beginPath();
    ctx.moveTo(600, matchBoxY);
    ctx.lineTo(1020, matchBoxY);
    ctx.lineTo(1020, matchBoxY + matchBoxH);
    ctx.lineTo(440, matchBoxY + matchBoxH);
    ctx.closePath();
    ctx.fill();

    // Gold Diagonal Divider
    ctx.strokeStyle = '#ffd100';
    ctx.lineWidth = 10;
    ctx.shadowColor = '#ffd100';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.moveTo(600, matchBoxY - 20);
    ctx.lineTo(440, matchBoxY + matchBoxH + 20);
    ctx.stroke();

    // Team A Logo & Name
    try { ctx.drawImage(imgA, 130, matchBoxY + 120, 260, 260); } catch(e) {}
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 38px Outfit, sans-serif';
    ctx.fillText(away.toUpperCase(), 260, matchBoxY + 440);

    // Team B Logo & Name
    try { ctx.drawImage(imgB, 690, matchBoxY + 120, 260, 260); } catch(e) {}
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 38px Outfit, sans-serif';
    ctx.fillText(home.toUpperCase(), 820, matchBoxY + 440);

    // Center VS Badge
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ffd100';
    ctx.beginPath();
    ctx.arc(520, matchBoxY + 280, 70, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = '900 52px Outfit, sans-serif';
    ctx.fillText('VS', 520, matchBoxY + 298);

    ctx.restore();

    // Golden Keycode Container Box (Y: 1000)
    const codeBoxY = 1000;
    ctx.fillStyle = 'rgba(255,209,0,0.1)';
    ctx.strokeStyle = '#ffd100';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(80, codeBoxY, 920, 200, 36);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffd100';
    ctx.font = '800 26px Outfit, sans-serif';
    ctx.fillText('🔑 CÓDIGO DE ACCESO PARA ESTE PARTIDO:', 540, codeBoxY + 55);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 96px Outfit, sans-serif';
    ctx.fillText(code, 540, codeBoxY + 155);

    // QR Code Section (Y: 1240)
    const qrBoxY = 1240;
    const qrSize = 360;
    const qrTarget = `https://nfl-grids.vercel.app/share?game=grids&code=${encodeURIComponent(code)}&away=${encodeURIComponent(away)}&home=${encodeURIComponent(home)}&sport=${sport}`;
    const qrUrlApi = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&margin=14&data=${encodeURIComponent(qrTarget)}`;

    const qrImg = new Image(); qrImg.crossOrigin = 'anonymous';
    await new Promise(res => {
      qrImg.onload = res; qrImg.onerror = res; qrImg.src = qrUrlApi;
    });

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffd100';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(360, qrBoxY, qrSize, qrSize, 36);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    try { ctx.drawImage(qrImg, 360, qrBoxY, qrSize, qrSize); } catch(e) {}

    // Footer Call to Action
    const footerY = qrBoxY + qrSize + 70;
    ctx.fillStyle = '#ffd100';
    ctx.font = '900 36px Outfit, sans-serif';
    ctx.fillText('📸 ESCANEA CON TU CÁMARA O ENTRA A:', 540, footerY);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 28px Inter, sans-serif';
    ctx.fillText('bgames.s.gy/drinkandwins', 540, footerY + 50);

    return canvas.toDataURL('image/png');
  };

  window.PROMOTIONAL_CARDS_DATA = CARDS_DATA;

  let currentGeneratedDataUrl = null;
  let currentCardTitle = 'Drinks-and-Wins-Promo';

  /**
   * Opens the Preview Modal for a Promotional Card
   */
  window.openPromoCardPreview = async function(cardIndexOrId, customOptions) {
    let card = null;
    if (typeof cardIndexOrId === 'number') {
      card = CARDS_DATA[cardIndexOrId];
    } else {
      card = CARDS_DATA.find(c => c.id === cardIndexOrId) || CARDS_DATA[0];
    }

    const modal = document.getElementById('modalPromoCardPreview');
    const imgEl = document.getElementById('promoCardPreviewImg');
    const loadingEl = document.getElementById('promoCardLoading');
    const titleEl = document.getElementById('promoCardModalTitle');

    if (modal) modal.style.display = 'flex';
    if (loadingEl) loadingEl.style.display = 'block';
    if (imgEl) imgEl.style.display = 'none';
    if (titleEl) titleEl.textContent = `📸 ${card.title}`;

    const store = (document.getElementById('promoSelectStore') || {}).value || 'Todas las Sucursales';
    const dataUrl = await window.drawPromotionalCard(card, { store, ...customOptions });

    currentGeneratedDataUrl = dataUrl;
    currentCardTitle = `DW-Promo-${card.id}`;

    if (loadingEl) loadingEl.style.display = 'none';
    if (imgEl) {
      imgEl.src = dataUrl;
      imgEl.style.display = 'block';
    }
  };

  /**
   * Opens Matchup Story Preview for the currently selected grid or active game
   */
  window.openMatchupStoryPreview = async function(gameData) {
    const modal = document.getElementById('modalPromoCardPreview');
    const imgEl = document.getElementById('promoCardPreviewImg');
    const loadingEl = document.getElementById('promoCardLoading');
    const titleEl = document.getElementById('promoCardModalTitle');

    if (modal) modal.style.display = 'flex';
    if (loadingEl) loadingEl.style.display = 'block';
    if (imgEl) imgEl.style.display = 'none';
    if (titleEl) titleEl.textContent = '📸 Historia del Partido';

    let g = gameData;
    if (!g && window.currentGame) {
      g = window.currentGame;
    }
    if (!g) {
      g = {
        away: 'Pittsburgh Steelers',
        home: 'Buffalo Bills',
        code: 'DW2024',
        store: 'Juriquilla'
      };
    }

    const dataUrl = await window.drawMatchupStoryCard(g, {
      gameType: g.gameType || '🏈 NFL FOOTBALL GRID'
    });

    currentGeneratedDataUrl = dataUrl;
    currentCardTitle = `DW-Matchup-${g.code || 'Grid'}`;

    if (loadingEl) loadingEl.style.display = 'none';
    if (imgEl) {
      imgEl.src = dataUrl;
      imgEl.style.display = 'block';
    }
  };

  /**
   * Downloads the generated card PNG to gallery
   */
  window.downloadCurrentPromoCard = function() {
    if (!currentGeneratedDataUrl) return;
    const a = document.createElement('a');
    a.href = currentGeneratedDataUrl;
    a.download = `${currentCardTitle}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /**
   * Native Share to WhatsApp Status / Instagram Stories
   */
  window.shareCurrentPromoCard = async function() {
    if (!currentGeneratedDataUrl) return;

    try {
      const res = await fetch(currentGeneratedDataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${currentCardTitle}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Drinks & Wins',
          text: '¡Únete y juega en Drinks & Wins! 🍻🏈'
        });
      } else {
        // Fallback to download
        window.downloadCurrentPromoCard();
        alert('📥 Tarjeta guardada en tu galería. ¡Ya puedes subirla a tu Estado de WhatsApp!');
      }
    } catch(err) {
      window.downloadCurrentPromoCard();
    }
  };

  /**
   * Close Preview Modal
   */
  window.closePromoCardModal = function() {
    const modal = document.getElementById('modalPromoCardPreview');
    if (modal) modal.style.display = 'none';
  };

  /**
   * Initializes the Promotional Cards grid in Admin
   */
  window.initPromotionalCardsUI = function() {
    const container = document.getElementById('promotionalCardsGrid');
    if (!container) return;

    container.innerHTML = CARDS_DATA.map((card, idx) => `
      <div class="card" style="margin:0; padding:16px; border-radius:18px; border:1.5px solid rgba(255,209,0,0.3); background:linear-gradient(145deg, #131720, #0c0e14); display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 8px 24px rgba(0,0,0,0.5);">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:24px;">${card.icon}</span>
            <span class="badge accent" style="font-size:10.5px; font-weight:800;">${card.tag}</span>
          </div>
          <h4 style="color:#ffd100; font-size:15px; font-weight:900; margin:0 0 6px 0;">${card.title}</h4>
          <p style="font-size:12px; color:#cbd5e1; margin:0 0 10px 0; line-height:1.4;">${card.desc}</p>
          <div style="font-size:11px; color:#94a3b8; margin-bottom:12px;">
            <span>${card.badge1}</span> • <span>${card.badge2}</span>
          </div>
        </div>

        <div style="display:flex; gap:6px; margin-top:10px;">
          <button type="button" class="btn btn-primary" onclick="window.openPromoCardPreview(${idx})" style="flex:1; padding:8px 12px; font-size:12px; font-weight:900; border-radius:10px;">
            👁️ Ver & Descargar
          </button>
        </div>
      </div>
    `).join('');
  };

  document.addEventListener('DOMContentLoaded', () => {
    window.initPromotionalCardsUI();
  });
})();
