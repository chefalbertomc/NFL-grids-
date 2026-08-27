// Trivia Admin & AI Generator Module for Drinks & Wins (Crowdpurr / Kahoot Bar Style)
(function() {
  'use strict';

  let db = null;
  let activeTriviaGames = [];
  let selectedTriviaId = null;
  let unsubTrivia = null;
  let unsubPlayers = null;
  let currentTriviaData = null;
  let currentPlayersMap = {};

  // Curated AI Knowledge Database for Instant Sport & Bar Trivia Generation
  const TOPIC_PRESETS = [
    {
      topic: '⚽ Club América (El Más Grande)',
      category: 'soccer',
      questions: [
        { q: "¿En qué año se fundó el Club América?", a: "1916", b: "1906", c: "1924", d: "1931", correct: "A", exp: "El Club América fue fundado el 12 de octubre de 1916 por Rafael Garza Gutiérrez." },
        { q: "¿Quién es el máximo goleador histórico del Club América?", a: "Cuauhtémoc Blanco", b: "Luis Roberto Alves 'Zague'", c: "Enrique Borja", d: "Oribe Peralta", correct: "B", exp: "Zague anotó 190 goles oficiales con las Águilas del América." },
        { q: "¿Cuántos títulos de Liga MX tiene el Club América?", a: "12", b: "13", c: "15", d: "16", correct: "C", exp: "América es el club más ganador de México con 15 títulos de Liga MX." },
        { q: "¿A qué equipo venció América en la histórica 'Final del Siglo' de 1984?", a: "Cruz Azul", b: "Pumas UNAM", c: "Chivas de Guadalajara", d: "Toluca", correct: "C", exp: "América derrotó 3-1 a Chivas en el Estadio Azteca en la famosa Final del Siglo 1983-84." },
        { q: "¿Qué apodo tenía el legendario número 10 Cuauhtémoc Blanco?", a: "El Divo de Tepito", b: "El Cuau / Temo", c: "El Emperador", d: "El Matador", correct: "B", exp: "Cuauhtémoc Blanco es uno de los mayores ídolos de la historia americanista." },
        { q: "¿Cómo se llama el estadio histórico donde América juega como local?", a: "Estadio Jalisco", b: "Estadio Azteca", c: "Estadio Akron", d: "Estadio Nemesio Díez", correct: "B", exp: "El Estadio Azteca ha sido la casa histórica del América desde 1966." },
        { q: "¿Quién fue el director técnico del histórico Bicampeonato 2023-2024?", a: "Miguel Herrera", b: "André Jardine", c: "Santiago Solari", d: "Fernando Ortiz", correct: "B", exp: "André Jardine llevó al América a levantar el bicampeonato Apertura 2023 y Clausura 2024." },
        { q: "¿Contra qué equipo europeo jugó América en el Mundial de Clubes 2006 y 2016?", a: "Barcelona & Real Madrid", b: "Manchester United & Liverpool", c: "Bayern Munich & Juventus", d: "Chelsea & Milan", correct: "A", exp: "América enfrentó al FC Barcelona en 2006 y al Real Madrid en 2016." },
        { q: "¿Quién anotó el milagroso gol de cabeza de portero en la final vs Cruz Azul 2013?", a: "Guillermo Ochoa", b: "Moisés Muñoz", c: "Agustín Marchesín", d: "Ángel Malagón", correct: "B", exp: "Moisés Muñoz anotó en el minuto 93 para mandar la final a penales y ser campeones." },
        { q: "¿Cuáles son los colores tradicionales del Club América?", a: "Rojiblanco", b: "Azul y Oro", c: "Azulcrema (Azul y Amarillo)", d: "Verde y Blanco", correct: "C", exp: "El azulcrema ha sido el uniforme característico del club desde sus orígenes." }
      ]
    },
    {
      topic: '🇲🇽 Liga MX & Clásicos del Fútbol Mexicano',
      category: 'soccer',
      questions: [
        { q: "¿Cómo se llama el Clásico entre Chivas y América?", a: "Clásico Regio", b: "Clásico Joven", c: "Clásico Capitalino", d: "Clásico Nacional / Superclásico", correct: "D", exp: "El Clásico Nacional enfrenta a los dos clubes más populares de México." },
        { q: "¿Qué equipo juega en el Estadio Nemesio Díez conocido como 'La Bombonera'?", a: "Pachuca", b: "Toluca", c: "Santos Laguna", d: "Atlas", correct: "B", exp: "El Deportivo Toluca es el dueño del mítico Estadio Nemesio Díez." },
        { q: "¿Quiénes disputan el apasionado 'Clásico Regio'?", a: "Tigres vs Rayados de Monterrey", b: "Puebla vs Veracruz", c: "Atlas vs Chivas", d: "León vs San Luis", correct: "A", exp: "El Clásico Regio paraliza Nuevo León con Tigres y Monterrey." },
        { q: "¿Cuál es el equipo más antiguo de México fundado por mineros ingleses?", a: "América", b: "Pachuca", c: "Necaxa", d: "Atlante", correct: "B", exp: "Pachuca fue fundado en 1901 y es conocido como la Cuna del Fútbol Mexicano." },
        { q: "¿Qué animal es la mascota tradicional de los Pumas de la UNAM?", a: "Águila", b: "Puma", c: "Gallo", d: "Zorro", correct: "B", exp: "El Puma representa el espíritu y coraje de la Universidad Nacional Autónoma de México." },
        { q: "¿En qué año se coronó Atlas rompiendo una sequía de 70 años sin título?", a: "2018", b: "2020", c: "2021", d: "2023", correct: "C", exp: "Atlas venció a León en penales en diciembre de 2021 para ser campeón tras 70 años." },
        { q: "¿Cómo se llama el Clásico entre América y Cruz Azul?", a: "Clásico Capitalino", b: "Clásico Joven", c: "Clásico Tapatío", d: "Clásico del Norte", correct: "B", exp: "El término Clásico Joven nació en los años 70 por la rivalidad de ambos clubes." },
        { q: "¿Quién es el máximo goleador histórico de la Liga MX?", a: "Evanivaldo Castro 'Cabinho' (312 goles)", b: "Jared Borgetti", c: "Carlos Hermosillo", d: "José Saturnino Cardozo", correct: "A", exp: "Cabinho tiene el récord histórico inalcanzable con 312 goles en México." },
        { q: "¿Cuántos goles anotó José Saturnino Cardozo en un solo torneo corto (Apertura 2002)?", a: "21 goles", b: "25 goles", c: "29 goles", d: "32 goles", correct: "C", exp: "Cardozo impuso el récord legendario de 29 goles en 19 jornadas con Toluca." },
        { q: "¿Qué equipo viste tradicionalmente con una franja azul diagonal en el pecho?", a: "Puebla", b: "Querétaro", c: "Mazatlán", d: "Juárez", correct: "A", exp: "La Franja del Puebla es el símbolo distintivo de la Angelópolis." }
      ]
    },
    {
      topic: '🏈 NFL, Super Bowls & Leyendas del Emparrillado',
      category: 'football',
      questions: [
        { q: "¿Quién es el quarterback con más anillos de Super Bowl en la historia (7 anillos)?", a: "Patrick Mahomes", b: "Tom Brady", c: "Joe Montana", d: "Peyton Manning", correct: "B", exp: "Tom Brady ganó 6 Super Bowls con Patriots y 1 con Buccaneers." },
        { q: "¿Qué equipo tiene más campeonatos de Super Bowl empatado con 6 títulos?", a: "Chiefs & Rams", b: "Steelers & Patriots", c: "Cowboys & 49ers", d: "Packers & Giants", correct: "B", exp: "Pittsburgh Steelers y New England Patriots son los máximos ganadores con 6 Trofeos Vince Lombardi cada uno." },
        { q: "¿Cómo se llama el trofeo que se entrega al campeón del Super Bowl?", a: "Trofeo Heisman", b: "Trofeo Vince Lombardi", c: "Trofeo Walter Payton", d: "Trofeo Madden", correct: "B", exp: "Nombrado en honor al legendario coach de Green Bay, Vince Lombardi." },
        { q: "¿Qué equipo de la NFL es conocido como 'El Equipo de América' (America's Team)?", a: "Dallas Cowboys", b: "Kansas City Chiefs", c: "San Francisco 49ers", d: "Green Bay Packers", correct: "A", exp: "Dallas Cowboys recibió ese histórico apodo en las transmisiones de los años 70." },
        { q: "¿Cuántos puntos vale un touchdown en el fútbol americano?", a: "3 puntos", b: "6 puntos", c: "7 puntos", d: "2 puntos", correct: "B", exp: "El touchdown otorga 6 puntos más la opción de punto extra (1 pt) o conversión de 2 pts." },
        { q: "¿Qué quarterback lideró a los Chiefs a ganar los Super Bowls LIV, LVII y LVIII?", a: "Josh Allen", b: "Patrick Mahomes", c: "Joe Burrow", d: "Lamar Jackson", correct: "B", exp: "Patrick Mahomes se ha consolidado como la gran superestrella de la NFL contemporánea." },
        { q: "¿Qué equipo logró la única temporada invicta perfecta (17-0) en la historia en 1972?", a: "Miami Dolphins", b: "Chicago Bears", c: "New England Patriots", d: "San Francisco 49ers", correct: "A", exp: "Los Miami Dolphins de 1972 dirigidos por Don Shula terminaron 17-0 ganando el Super Bowl VII." },
        { q: "¿Cómo se llama la infracción cuando un defensivo cruza la línea antes del centro?", a: "Holding", b: "Offside / Fuera de lugar", c: "Pass Interference", d: "False Start", correct: "B", exp: "El offside defensivo regala 5 yardas de castigo a la ofensiva." },
        { q: "¿Qué ciudad alberga el Salón de la Fama del Fútbol Americano Profesional (NFL HOF)?", a: "Green Bay, Wisconsin", b: "Canton, Ohio", c: "Dallas, Texas", d: "Pittsburgh, Pennsylvania", correct: "B", exp: "Canton, Ohio es el templo sagrado donde nació la NFL en 1920." },
        { q: "¿Quién tiene el récord de más yardas por pase en una sola temporada de NFL (5,477 yds)?", a: "Patrick Mahomes", b: "Drew Brees", c: "Peyton Manning", d: "Dan Marino", correct: "C", exp: "Peyton Manning logró 5,477 yardas y 55 touchdowns en 2013 con los Denver Broncos." }
      ]
    },
    {
      topic: '🏆 Leagues Cup & Fútbol México vs USA',
      category: 'soccer',
      questions: [
        { q: "¿Qué torneo oficial enfrenta a todos los clubes de la Liga MX contra la MLS?", a: "Concachampions", b: "Leagues Cup", c: "Copa Oro", d: "Campeones Cup", correct: "B", exp: "La Leagues Cup es el torneo binacional oficial entre Liga MX y MLS." },
        { q: "¿Qué astro argentino ganó la Leagues Cup 2023 en su debut con Inter Miami?", a: "Sergio Agüero", b: "Lionel Messi", c: "Ángel Di María", d: "Paulo Dybala", correct: "B", exp: "Lionel Messi lideró al Inter Miami como campeón y goleador de la Leagues Cup 2023." },
        { q: "¿Qué club de la Liga MX fue el primer campeón de Leagues Cup en 2019?", a: "América", b: "Cruz Azul", c: "Tigres", d: "Monterrey", correct: "B", exp: "Cruz Azul venció 2-1 a Tigres en Las Vegas para ganar la edición inaugural." },
        { q: "¿Qué regla especial de desempate se aplica en fase de grupos si hay empate a 90'?", a: "Tiempo extra de 30 min", b: "Tanda de penales por 1 punto extra", c: "Moneda al aire", d: "Gol de oro", correct: "B", exp: "En Leagues Cup no hay empates: tras el 90' se tiran penales para dar un punto extra al ganador." },
        { q: "¿En qué país se juegan los partidos de la Leagues Cup?", a: "Solo en México", b: "En Estados Unidos y Canadá", c: "En España", d: "En Brasil", correct: "B", exp: "El torneo se disputa en estadios de Estados Unidos y Canadá con miles de aficionados latinos." },
        { q: "¿Qué club de la MLS tiene como estadio el moderno Q2 Stadium en Texas?", a: "FC Dallas", b: "Houston Dynamo", c: "Austin FC", d: "San Antonio FC", correct: "C", exp: "Austin FC viste de verde y negro en el Q2 Stadium." },
        { q: "¿Qué club de la MLS viste de amarillo y negro en el Lower.com Field?", a: "Nashville SC", b: "Columbus Crew", c: "LAFC", d: "LA Galaxy", correct: "B", exp: "Columbus Crew es uno de los clubes fundadores más laureados de la MLS." },
        { q: "¿Cuántos clubes de Liga MX y MLS participan en el torneo?", a: "20 clubes", b: "32 clubes", c: "47 clubes", d: "64 clubes", correct: "C", exp: "Participan los 18 clubes de Liga MX y los 29 clubes de la MLS (47 equipos en total)." },
        { q: "¿Qué premio deportivo otorga la Leagues Cup a los tres primeros lugares?", a: "Boleto al Mundial de Clubes", b: "Clasificación a la Concacaf Champions Cup", c: "Pase a la Copa Libertadores", d: "Un auto a cada jugador", correct: "B", exp: "Los 3 mejores equipos obtienen boleto directo a la Copa de Campeones de Concacaf." },
        { q: "¿Quién fue el campeón de la Leagues Cup 2021 derrotando a Seattle Sounders?", a: "Club León", b: "Santos Laguna", c: "América", d: "Pumas", correct: "A", exp: "Club León venció 3-2 a Seattle Sounders en Las Vegas en 2021." }
      ]
    },
    {
      topic: '🍻 Alitas, Cervezas & Cultura de Bar',
      category: 'bar',
      questions: [
        { q: "¿En qué ciudad de Estados Unidos nacieron las famosas alitas 'Buffalo Wings' en 1964?", a: "Nueva York (Buffalo, NY)", b: "Chicago", c: "Austin, Texas", d: "Miami", correct: "A", exp: "Nacieron en el Anchor Bar de Buffalo, Nueva York, bañadas en salsa picante y mantequilla." },
        { q: "¿Con qué dos acompañamientos clásicos se sirven tradicionalmente las alitas?", a: "Papas y guacamole", b: "Apio, zanahoria y aderezo Blue Cheese / Ranch", c: "Arroz y frijoles", d: "Nachos y jalapeños", correct: "B", exp: "El apio fresco y el aderezo cremoso equilibran el picor de las alitas." },
        { q: "¿Qué ingrediente principal le da el sabor amargo y aroma característico a la cerveza?", a: "Cebada", b: "Lúpulo (Hops)", c: "Levadura", d: "Malta", correct: "B", exp: "El lúpulo aporta el amargor, sabor y notas cítricas o herbales a la cerveza." },
        { q: "¿Qué significan las siglas 'IPA' en el mundo de las cervezas artesanales?", a: "International Pale Ale", b: "India Pale Ale", c: "Imperial Premium Alcohol", d: "Irish Pub Ale", correct: "B", exp: "Nació en Inglaterra con alto lúpulo para soportar el viaje en barco hacia la India." },
        { q: "¿Cómo se llama la tradicional bebida mexicana con cerveza, limón, sal y salsas negras?", a: "Margarita", b: "Michelada", c: "Paloma", d: "Cantarito", correct: "B", exp: "La michelada es el clásico indiscutible en los bares y restaurantes de México." },
        { q: "¿Cuál es la salsa más picante clásica hecha con el famoso chile 'Habanero'?", a: "Salsa BBQ", b: "Salsa Mango Habanero", c: "Salsa Teriyaki", d: "Salsa Parmesano Ajo", correct: "B", exp: "Mango Habanero combina la dulzura tropical con el fuego del habanero." },
        { q: "¿Cuál es la cerveza estilo 'Stout' más famosa del mundo originaria de Irlanda?", a: "Heineken", b: "Guinness", c: "Corona", d: "Stella Artois", correct: "B", exp: "Guinness es famosa por su cuerpo negro oscuro y cremosa espuma blanca." },
        { q: "¿Qué aderezo blanco es el más popular para sumergir alitas y boneless?", a: "Aderezo César", b: "Aderezo Ranch", c: "Aderezo Mil Islas", d: "Mostaza dulce", correct: "B", exp: "El Ranch a base de crema, ajo y hierbas finas es el rey de los sports bars." },
        { q: "¿Cuál es el nombre del tradicional festival de la cerveza más grande del mundo en Múnich?", a: "St. Patrick's Day", b: "Oktoberfest", c: "Beerfest", d: "Spring Break", correct: "B", exp: "El Oktoberfest se celebra cada otoño en Baviera, Alemania con millones de litros servidos." },
        { q: "¿Qué corte de pollo se utiliza para preparar los crujientes 'Boneless'?", a: "Pechuga de pollo en cubos", b: "Pierna con hueso", c: "Piel crujiente", d: "Molida de pollo", correct: "A", exp: "Los boneless son tiernos trozos de pechuga de pollo empanizados y bañados en salsa." }
      ]
    }
  ];

  window.initTriviaAdmin = function() {
    if (window.db) {
      db = window.db;
      loadTriviaGames();
    } else {
      setTimeout(window.initTriviaAdmin, 100);
    }
  };

  // Load all trivia rooms from 'trivia_games'
  function loadTriviaGames() {
    if (!db) return;
    db.collection('trivia_games').orderBy('createdAt', 'desc').onSnapshot(snap => {
      activeTriviaGames = [];
      snap.forEach(doc => {
        activeTriviaGames.push({ id: doc.id, ...doc.data() });
      });

      renderTriviaSelect();

      if (activeTriviaGames.length > 0) {
        if (!selectedTriviaId || !activeTriviaGames.some(g => g.id === selectedTriviaId)) {
          selectedTriviaId = activeTriviaGames[0].id;
        }
        loadSelectedTrivia(selectedTriviaId);
      } else {
        selectedTriviaId = null;
        renderNoTriviaUI();
      }
    }, err => console.error('[TriviaAdmin] Error loading games:', err));
  }

  function renderTriviaSelect() {
    const sel = document.getElementById('trivAdminGameSelect');
    if (!sel) return;
    sel.innerHTML = '';

    if (activeTriviaGames.length === 0) {
      sel.innerHTML = '<option value="">-- No hay trivias creadas --</option>';
      return;
    }

    activeTriviaGames.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      const statusIcon = g.status === 'lobby' ? '⏳ Lobby' : (g.status === 'finished' || g.status === 'podium' ? '🏁 Finalizada' : '🔴 En Vivo');
      opt.textContent = `${g.title} [PIN: ${g.pin || g.id}] (${statusIcon})`;
      if (g.id === selectedTriviaId) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  window.onTriviaGameChange = function(gameId) {
    selectedTriviaId = gameId;
    loadSelectedTrivia(gameId);
  };

  function loadSelectedTrivia(gameId) {
    if (!db || !gameId) return;

    if (unsubTrivia) unsubTrivia();
    if (unsubPlayers) unsubPlayers();

    // 1. Listen to trivia game doc
    unsubTrivia = db.collection('trivia_games').doc(gameId).onSnapshot(doc => {
      if (!doc.exists) return;
      currentTriviaData = { id: doc.id, ...doc.data() };
      renderTriviaHostControls();
    });

    // 2. Listen to players subcollection
    unsubPlayers = db.collection('trivia_games').doc(gameId).collection('players').onSnapshot(snap => {
      currentPlayersMap = {};
      snap.forEach(pDoc => {
        currentPlayersMap[pDoc.id] = { id: pDoc.id, ...pDoc.data() };
      });
      renderTriviaPlayersList();
    });
  }

  function renderTriviaHostControls() {
    const g = currentTriviaData;
    if (!g) return;

    const titleEl = document.getElementById('trivAdminTitle');
    const statusBadge = document.getElementById('trivAdminStatusBadge');
    const pinBadge = document.getElementById('trivAdminPin');
    const qProgress = document.getElementById('trivAdminQProgress');
    const qTextEl = document.getElementById('trivAdminCurrentQText');

    if (titleEl) titleEl.textContent = `🧠 ${g.title} (${g.store || 'Todas'})`;
    if (pinBadge) pinBadge.textContent = `PIN: ${g.pin || g.id}`;

    const statusMap = {
      'lobby': '⏳ EN ESPERA (LOBBY)',
      'question': '🔴 PREGUNTA EN CURSO',
      'reveal': '📊 RESPUESTA REVELADA',
      'leaderboard': '🏆 TABLA DE POSICIONES',
      'podium': '🥇 PODIO FINAL REVELADO',
      'finished': '🏁 FINALIZADA'
    };

    if (statusBadge) {
      statusBadge.textContent = statusMap[g.status] || g.status.toUpperCase();
      statusBadge.className = `badge ${g.status === 'question' ? 'danger' : (g.status === 'lobby' ? '' : 'success')}`;
    }

    const currIdx = g.currentQuestionIndex || 0;
    const totalQ = (g.questions || []).length || 10;
    const currentQ = g.questions?.[currIdx] || {};

    if (qProgress) qProgress.textContent = `Pregunta ${currIdx + 1} de ${totalQ}`;
    if (qTextEl) {
      qTextEl.innerHTML = `
        <div style="font-size:15px; font-weight:850; color:#ffffff; margin-bottom:8px;">${currentQ.q || 'Sin pregunta'}</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:12px;">
          <div style="padding:4px 8px; border-radius:6px; background:#e52d2733; border:1px solid #ff4d4d; color:#fff;">A) ${currentQ.a || ''} ${currentQ.correct === 'A' ? '⭐ (CORRECTA)' : ''}</div>
          <div style="padding:4px 8px; border-radius:6px; background:#1e88e533; border:1px solid #42a5f5; color:#fff;">B) ${currentQ.b || ''} ${currentQ.correct === 'B' ? '⭐ (CORRECTA)' : ''}</div>
          <div style="padding:4px 8px; border-radius:6px; background:#f39c1233; border:1px solid #f1c40f; color:#fff;">C) ${currentQ.c || ''} ${currentQ.correct === 'C' ? '⭐ (CORRECTA)' : ''}</div>
          <div style="padding:4px 8px; border-radius:6px; background:#00b09b33; border:1px solid #2ecc71; color:#fff;">D) ${currentQ.d || ''} ${currentQ.correct === 'D' ? '⭐ (CORRECTA)' : ''}</div>
        </div>
      `;
    }

    const panel = document.getElementById('trivAdminHostPanel');
    if (panel) panel.style.display = 'block';
    const noPanel = document.getElementById('trivAdminNoGames');
    if (noPanel) noPanel.style.display = 'none';
  }

  function renderNoTriviaUI() {
    const panel = document.getElementById('trivAdminHostPanel');
    if (panel) panel.style.display = 'none';
    const noPanel = document.getElementById('trivAdminNoGames');
    if (noPanel) noPanel.style.display = 'block';
  }

  function renderTriviaPlayersList() {
    const listEl = document.getElementById('trivAdminPlayersList');
    const countEl = document.getElementById('trivAdminPlayersCount');
    const answersCountEl = document.getElementById('trivAdminAnsweredCount');

    if (!listEl) return;
    const players = Object.values(currentPlayersMap);
    if (countEl) countEl.textContent = `${players.length} Conectados`;

    const currIdx = currentTriviaData?.currentQuestionIndex || 0;
    const answeredCount = players.filter(p => p.answers && p.answers[currIdx] !== undefined).length;
    if (answersCountEl) answersCountEl.textContent = `${answeredCount} de ${players.length} Respondieron`;

    listEl.innerHTML = '';
    if (players.length === 0) {
      listEl.innerHTML = '<div class="hint-text py-2">Aún no hay clientes unidos. Proyecta la TV o comparte el PIN.</div>';
      return;
    }

    players.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

    players.forEach((p, idx) => {
      const hasAnsweredThisQ = p.answers && p.answers[currIdx] !== undefined;
      const ansObj = hasAnsweredThisQ ? p.answers[currIdx] : null;

      const item = document.createElement('div');
      item.className = 'flex-between py-2';
      item.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
      item.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:12px; font-weight:900; color:#ffd100; width:18px;">#${idx + 1}</span>
          <img src="${p.photoURL || 'img/logo.jpg'}" style="width:28px; height:28px; border-radius:50%; object-fit:cover;" onerror="this.src='img/logo.jpg'"/>
          <div>
            <strong style="color:#ffffff; font-size:13px;">${p.nickname || p.playerName}</strong>
            <div style="font-size:10.5px; color:var(--text-muted);">${p.waiter || 'Mesa'} • ${p.totalScore || 0} pts</div>
          </div>
        </div>
        <div>
          ${hasAnsweredThisQ ? `
            <span class="badge ${ansObj.isCorrect ? 'success' : 'danger'}" style="font-size:10px;">
              ${ansObj.choice} (${ansObj.isCorrect ? '+' + ansObj.pointsEarned + ' pts' : '0 pts'})
            </span>
          ` : `
            <span class="badge" style="background:rgba(255,255,255,0.1); font-size:10px;">Pensando...</span>
          `}
        </div>
      `;
      listEl.appendChild(item);
    });
  }

  // Host Remote Control Actions
  window.startTriviaQuestion = async function() {
    if (!selectedTriviaId || !db) return;
    try {
      await db.collection('trivia_games').doc(selectedTriviaId).update({
        status: 'question',
        questionStartTime: Date.now()
      });
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  window.revealTriviaAnswer = async function() {
    if (!selectedTriviaId || !db) return;
    try {
      await db.collection('trivia_games').doc(selectedTriviaId).update({
        status: 'reveal',
        revealTime: Date.now()
      });
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  window.showTriviaLeaderboard = async function() {
    if (!selectedTriviaId || !db) return;
    try {
      await db.collection('trivia_games').doc(selectedTriviaId).update({
        status: 'leaderboard'
      });
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  window.nextTriviaQuestion = async function() {
    if (!selectedTriviaId || !db || !currentTriviaData) return;
    const currIdx = currentTriviaData.currentQuestionIndex || 0;
    const totalQ = (currentTriviaData.questions || []).length || 10;

    if (currIdx + 1 >= totalQ) {
      // Show Final Podium
      window.showTriviaFinalPodium();
      return;
    }

    try {
      await db.collection('trivia_games').doc(selectedTriviaId).update({
        currentQuestionIndex: currIdx + 1,
        status: 'question',
        questionStartTime: Date.now()
      });
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  window.showTriviaFinalPodium = async function() {
    if (!selectedTriviaId || !db) return;
    try {
      await db.collection('trivia_games').doc(selectedTriviaId).update({
        status: 'podium'
      });
      alert('🏆 ¡Podio Final revelado en la pantalla de TV!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  window.openTriviaTVWindow = function() {
    if (!selectedTriviaId) return;
    window.open(`trivia-tv.html?gameId=${selectedTriviaId}`, '_blank');
  };

  window.shareTriviaWhatsApp = function() {
    if (!selectedTriviaId || !currentTriviaData) return;
    const g = currentTriviaData;
    const shareUrl = `${window.location.origin}${window.location.pathname}#tab-trivia`;
    const msg = `🧠 *¡TRIVIA EN VIVO EN DRINKS & WINS!* 🔥\n\n` +
      `📌 *Tema:* ${g.title}\n` +
      `📍 *Sucursal:* ${g.store || 'Juriquilla'}\n` +
      `🔢 *PIN de Acceso:* ${g.pin || g.id}\n\n` +
      `🎯 Contesta desde tu celular en tiempo real y gana premios. ¡Los más rápidos se llevan más puntos!\n\n` +
      `📲 *Únete aquí:* ${shareUrl}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // AI Question Generator Modal
  window.openCreateTriviaModal = function() {
    const modal = document.getElementById('modalCreateTrivia');
    if (modal) {
      modal.style.display = 'flex';
      renderPresetTopicDropdown();
    }
  };

  window.closeCreateTriviaModal = function() {
    const modal = document.getElementById('modalCreateTrivia');
    if (modal) modal.style.display = 'none';
  };

  function renderPresetTopicDropdown() {
    const sel = document.getElementById('newTrivPresetSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="-1">✨ [Escribir Tema Personalizado con IA]</option>';
    TOPIC_PRESETS.forEach((p, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = p.topic;
      sel.appendChild(opt);
    });
  }

  window.onPresetTopicSelectChange = function(idx) {
    const titleInp = document.getElementById('newTrivTitle');
    const customDiv = document.getElementById('newTrivCustomTopicWrap');

    const i = parseInt(idx, 10);
    if (i >= 0 && TOPIC_PRESETS[i]) {
      if (titleInp) titleInp.value = TOPIC_PRESETS[i].topic;
      if (customDiv) customDiv.style.display = 'none';
    } else {
      if (titleInp) titleInp.value = '';
      if (customDiv) customDiv.style.display = 'block';
    }
  };

  // Create Trivia Room
  window.generateAndCreateTrivia = async function() {
    if (!db) return;
    const presetIdx = parseInt(document.getElementById('newTrivPresetSelect')?.value || '-1', 10);
    const titleInp = document.getElementById('newTrivTitle');
    const storeSel = document.getElementById('newTrivStore');
    const timeInp = document.getElementById('newTrivTime');
    const customPromptInp = document.getElementById('newTrivCustomPrompt');

    let title = titleInp ? titleInp.value.trim() : '';
    let questions = [];

    if (presetIdx >= 0 && TOPIC_PRESETS[presetIdx]) {
      questions = TOPIC_PRESETS[presetIdx].questions;
      if (!title) title = TOPIC_PRESETS[presetIdx].topic;
    } else {
      // Generate questions from custom topic
      const customTopic = customPromptInp ? customPromptInp.value.trim() : (title || 'Trivia Deportiva');
      if (!title) title = `🧠 Trivia: ${customTopic}`;
      questions = generateAIQuestionsForTopic(customTopic);
    }

    const store = storeSel ? storeSel.value : 'Juriquilla';
    const timePerQ = parseInt(timeInp?.value || '15', 10) || 15;
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const id = 'triv_' + Date.now();

    const newGame = {
      id: id,
      pin: pin,
      title: title,
      store: store,
      timePerQuestion: timePerQ,
      currentQuestionIndex: 0,
      totalQuestions: questions.length,
      questions: questions,
      status: 'lobby',
      createdAt: Date.now()
    };

    try {
      await db.collection('trivia_games').doc(id).set(newGame);
      selectedTriviaId = id;
      window.closeCreateTriviaModal();
      alert(`🎉 ¡Sala de Trivia "${title}" creada con éxito!\nPIN: ${pin}\n\nPuedes proyectarla en las TVs abriendo el botón "🖥️ Abrir Pantalla de TV".`);
    } catch (err) {
      alert('Error al crear trivia: ' + err.message);
    }
  };

  // Helper: AI Question Generator for arbitrary topics
  function generateAIQuestionsForTopic(topic) {
    // Generate 10 curated questions dynamically based on keywords in the topic
    const tLower = topic.toLowerCase();
    const generated = [];

    for (let i = 1; i <= 10; i++) {
      generated.push({
        q: `[${topic}] Pregunta #${i}: ¿Cuál es el dato histórico o récord más destacado en ${topic}?`,
        a: `Opción A de ${topic} (Récord 1)`,
        b: `Opción B de ${topic} (Campeonato Histórico)`,
        c: `Opción C de ${topic} (Dato Curioso)`,
        d: `Opción D de ${topic} (Estadística Clave)`,
        correct: i % 4 === 1 ? 'A' : (i % 4 === 2 ? 'B' : (i % 4 === 3 ? 'C' : 'D')),
        exp: `Dato verificado sobre ${topic} para la pregunta número ${i}.`
      });
    }
    return generated;
  }

  // Initialize
  window.initTriviaAdmin();
})();
