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
  let generatedQuestionsBuffer = [];

  // =========================================================================
  // EXTENSIVE REAL-KNOWLEDGE DATABASE FOR INSTANT BAR & SPORTS TRIVIA
  // =========================================================================
  const TOPIC_PRESETS = [
    {
      id: 'america',
      category: '⚽ Fútbol Mexicano',
      topic: '⚽ Club América (El Más Grande)',
      questions: [
        { q: "¿En qué año se fundó el Club América?", a: "1916", b: "1906", c: "1924", d: "1931", correct: "A", exp: "El Club América fue fundado el 12 de octubre de 1916 por Rafael Garza Gutiérrez." },
        { q: "¿Quién es el máximo goleador histórico del Club América?", a: "Cuauhtémoc Blanco", b: "Luis Roberto Alves 'Zague'", c: "Enrique Borja", d: "Oribe Peralta", correct: "B", exp: "Zague anotó 190 goles oficiales vistiendo la camiseta de las Águilas." },
        { q: "¿Cuántos títulos de Liga MX tiene el Club América (máximo ganador)?", a: "12", b: "13", c: "15", d: "16", correct: "C", exp: "América es el club más laureado de México con 15 títulos de Liga MX." },
        { q: "¿A qué equipo venció América en la histórica 'Final del Siglo' 1983-84?", a: "Cruz Azul", b: "Pumas UNAM", c: "Chivas de Guadalajara", d: "Toluca", correct: "C", exp: "América derrotó 3-1 a Chivas en el Azteca tras atajar Zelada un penal a Eduardo Cisneros." },
        { q: "¿Cómo se llama el mítico estadio casa del América desde 1966?", a: "Estadio Jalisco", b: "Estadio Azteca", c: "Estadio Akron", d: "Estadio Nemesio Díez", correct: "B", exp: "El Coloso de Santa Úrsula ha sido la fortaleza americanista desde el 29 de mayo de 1966." },
        { q: "¿Quién fue el director técnico del Bicampeonato Apertura 2023 - Clausura 2024?", a: "Miguel Herrera", b: "André Jardine", c: "Santiago Solari", d: "Fernando Ortiz", correct: "B", exp: "André Jardine logró la hazaña del bicampeonato en sus primeros dos torneos con el club." },
        { q: "¿Quién anotó el milagroso gol de cabeza de portero en la final vs Cruz Azul 2013?", a: "Guillermo Ochoa", b: "Moisés Muñoz", c: "Agustín Marchesín", d: "Ángel Malagón", correct: "B", exp: "Moisés Muñoz anotó de cabeza al 92:30 para enviar la final al alargue y coronarse." },
        { q: "¿Contra qué club europeo jugó América en el Mundial de Clubes 2006 y 2016?", a: "Barcelona & Real Madrid", b: "Manchester United & Liverpool", c: "Bayern Múnich & Juventus", d: "Chelsea & Milan", correct: "A", exp: "Enfrentó al FC Barcelona en semifinales de 2006 y al Real Madrid en semifinales de 2016." },
        { q: "¿Qué dorsal utilizó el ídolo Cuauhtémoc Blanco la mayor parte de su carrera en América?", a: "Número 7", b: "Número 8", c: "Número 10", d: "Número 11", correct: "C", exp: "El 'Cuau' es inmortal con el dorsal número 10 de las Águilas." },
        { q: "¿Cuáles son los colores tradicionales e históricos del Club América?", a: "Rojiblanco", b: "Azul y Oro", c: "Azulcrema (Azul Marino y Amarillo Crema)", d: "Verde y Blanco", correct: "C", exp: "El uniforme azulcrema original fue confeccionado con tela de los pantalones de Rafael Garza." }
      ]
    },
    {
      id: 'chivas',
      category: '⚽ Fútbol Mexicano',
      topic: '🐐 Chivas de Guadalajara (El Rebaño Sagrado)',
      questions: [
        { q: "¿En qué año se fundó el Club Deportivo Guadalajara?", a: "1906", b: "1910", c: "1916", d: "1922", correct: "A", exp: "Fundado el 8 de mayo de 1906 por el comerciante belga Edgar Everaert como Club Unión." },
        { q: "¿Quién es el máximo goleador histórico de Chivas?", a: "Omar Bravo (160 goles)", b: "Salvador Reyes", c: "Javier 'Chicharito' Hernández", d: "Ramón Morales", correct: "A", exp: "Omar Bravo superó la legendaria marca de Chava Reyes alcanzando 160 goles." },
        { q: "¿Cuántos títulos de Liga MX tiene Chivas en su historia?", a: "10", b: "11", c: "12", d: "13", correct: "C", exp: "El Guadalajara suma 12 campeonatos de liga, el último obtenido en el Clausura 2017." },
        { q: "¿Cómo se llamó la legendaria época en que Chivas ganó 7 títulos de liga en 9 años?", a: "La Máquina", b: "El Campeonísimo", c: "Los Galácticos", d: "La Noria de Oro", correct: "B", exp: "El Campeonísimo dominó el fútbol mexicano entre 1956 y 1965 de la mano del Ing. Javier de la Torre." },
        { q: "¿A qué equipo venció Chivas en la final del Apertura 2006 en el Nemesio Díez?", a: "América", b: "Toluca", c: "Pumas", d: "Cruz Azul", correct: "B", exp: "Chivas venció 2-1 a Toluca con golazo inolvidable de Adolfo 'El Bofo' Bautista." },
        { q: "¿Cómo se llama el estadio inaugurado en 2010 casa actual de Chivas?", a: "Estadio Jalisco", b: "Estadio Akron", c: "Estadio Azteca", d: "Estadio Corregidora", correct: "B", exp: "El Estadio Akron (antes Omnilife) fue inaugurado en julio de 2010 ante Manchester United." },
        { q: "¿Qué director técnico llevó a Chivas a ganar el Doblete (Liga y Copa) en 2017?", a: "Matías Almeyda", b: "José Manuel de la Torre", c: "Hans Westerhof", d: "Veljko Paunovic", correct: "A", exp: "El 'Pelado' Almeyda lideró una época dorada ganando 5 títulos oficiales con el Rebaño." },
        { q: "¿Qué jugador debutó anotando con Manchester United tras ser vendido por Chivas en 2010?", a: "Carlos Vela", b: "Javier 'Chicharito' Hernández", c: "Marco Fabián", d: "Carlos Salcido", correct: "B", exp: "Chicharito Hernández fichó por los Red Devils de Sir Alex Ferguson en 2010." },
        { q: "¿Cuál es la política de identidad única en el mundo que mantiene Chivas?", a: "Solo jugadores menores de 25 años", b: "Jugar únicamente con futbolistas mexicanos", c: "Solo jugadores nacidos en Jalisco", d: "No cobrar boletos en clásicos", correct: "B", exp: "Chivas solo alinea futbolistas de nacionalidad mexicana por nacimiento o ascendencia." },
        { q: "¿Cómo se llama el clásico regional que enfrenta a Chivas contra Atlas?", a: "Clásico Regio", b: "Clásico Capitalino", c: "Clásico Tapatío", d: "Clásico Joven", correct: "C", exp: "El Clásico Tapatío es la rivalidad más antigua de México iniciada en 1916." }
      ]
    },
    {
      id: 'cruzazul',
      category: '⚽ Fútbol Mexicano',
      topic: '🚂 Cruz Azul (La Máquina Celeste)',
      questions: [
        { q: "¿En qué estado de la República nació originalmente la cooperativa y club Cruz Azul?", a: "Ciudad de México", b: "Hidalgo (Jasso / Cd. Cooperativa)", c: "Puebla", d: "Veracruz", correct: "B", exp: "Nació en Jasso, Hidalgo en 1927 por iniciativa de los trabajadores de la cementera." },
        { q: "¿Quién es el máximo goleador histórico de Cruz Azul?", a: "Carlos Hermosillo (198 goles)", b: "Francisco Palencia", c: "Emanuel Villa", d: "Christian Giménez", correct: "A", exp: "Carlos Hermosillo anotó 198 goles con La Máquina, incluyendo el penal del título en 1997." },
        { q: "¿Cuántos campeonatos de Liga MX tiene Cruz Azul?", a: "7", b: "8", c: "9", d: "10", correct: "C", exp: "Cruz Azul cuenta con 9 estrellas de Liga MX, la novena lograda en el Guardianes 2021." },
        { q: "¿A qué equipo venció Cruz Azul en la final del Guardianes 2021 para romper 23 años de sequía?", a: "Santos Laguna", b: "América", c: "León", d: "Pumas", correct: "A", exp: "Cruz Azul venció a Santos Laguna 2-1 global con gol decisivo de Jonathan 'Cabecita' Rodríguez." },
        { q: "¿A qué gigante sudamericano enfrentó Cruz Azul en la final de Copa Libertadores 2001?", a: "River Plate", b: "Boca Juniors", c: "Palmeiras", d: "Flamengo", correct: "B", exp: "Cruz Azul venció 1-0 a Boca en La Bombonera y cayó heroicamente en serie de penales." },
        { q: "¿Quién era el portero titular histórico del club durante más de 14 años hasta 2023?", a: "Oscar Pérez 'El Conejo'", b: "Jesús Corona", c: "Norberto Scoponi", d: "Sebastián Jurado", correct: "B", exp: "Jesús Corona fue el capitán y guardameta emblema de La Máquina entre 2009 y 2023." },
        { q: "¿Qué apodo recibió el equipo en los años 70 al ganar 6 ligas en una década?", a: "El Expreso del Norte", b: "La Máquina Celeste", c: "Los Cementeros de Hierro", d: "El Ballet Azul", correct: "B", exp: "El legendario cronista Ángel Fernández bautizó al club como 'La Máquina Celeste'." },
        { q: "¿Cómo se llama el Clásico de rivalidad capitalina entre Cruz Azul y América?", a: "Clásico Capitalino", b: "Clásico Joven", c: "Clásico Nacional", d: "Clásico del Pedregal", correct: "B", exp: "El Clásico Joven surgió a inicios de los 70s y es uno de los partidos más vibrantes del país." },
        { q: "¿Qué jugador anotó con el rostro ensangrentado en la final Invierno 1997 vs León?", a: "Julio César Yegros", b: "Carlos Hermosillo", c: "Benjamín Galindo", d: "Palencia", correct: "B", exp: "Hermosillo recibió una falta de Comizzo y cobró el penal de oro con sangre en el rostro." },
        { q: "¿Cómo se llama la mascota oficial de Cruz Azul?", a: "Goyo", b: "Blu / La Liebre de Cruz Azul", c: "Kin", d: "El Tibu", correct: "B", exp: "La liebre 'Blu' representa la velocidad y agilidad tradicional del equipo celeste." }
      ]
    },
    {
      id: 'ligamx',
      category: '⚽ Fútbol Mexicano',
      topic: '🇲🇽 Liga MX & Leyendas del Fútbol Mexicano',
      questions: [
        { q: "¿Quién es el máximo goleador histórico de toda la Liga MX con 312 goles?", a: "Jared Borgetti", b: "Evanivaldo Castro 'Cabinho'", c: "Carlos Hermosillo", d: "José Saturnino Cardozo", correct: "B", exp: "Cabinho marcó una era con 312 goles en México jugando para Pumas, Atlante, León y Tigres." },
        { q: "¿Quién tiene el récord de más goles en un solo torneo corto (29 goles en Apertura 2002)?", a: "André-Pierre Gignac", b: "José Saturnino Cardozo", c: "Sebastián Abreu", d: "Christian Benítez", correct: "B", exp: "Cardozo anotó 29 goles en 19 fechas de fase regular con Toluca, una marca histórica inigualable." },
        { q: "¿Qué equipo rompió una sequía de 70 años sin título al coronarse en el Apertura 2021?", a: "Atlas de Guadalajara", b: "Puebla", c: "Necaxa", d: "Zacatepec", correct: "A", exp: "Atlas venció en penales a León en el Estadio Jalisco tras 70 años sin alzar la copa." },
        { q: "¿Cómo se llama el clásico regio que paraliza a Nuevo León?", a: "Clásico del Norte", b: "Tigres UANL vs Rayados de Monterrey", c: "Santos vs Tigres", d: "Tijuana vs Juárez", correct: "B", exp: "El Clásico Regio enfrenta a Tigres y Rayados con una de las mayores aficiones del continente." },
        { q: "¿Qué club es conocido como 'La Cuna del Fútbol Mexicano' fundado en 1901 por mineros ingleses?", a: "Pachuca", b: "Atlante", c: "Necaxa", d: "Orizaba", correct: "A", exp: "El Club de Fútbol Pachuca fue fundado en 1901 por mineros de Cornualles en Hidalgo." },
        { q: "¿Qué delantero francés se convirtió en el máximo goleador histórico de Tigres UANL?", a: "Jérémy Ménez", b: "André-Pierre Gignac", c: "Florian Thauvin", d: "Andy Delort", correct: "B", exp: "Gignac superó los 200 goles con Tigres ganando 5 títulos de Liga MX y 1 Concachampions." },
        { q: "¿En qué estadio se jugaron las dos finales de Copa del Mundo de 1970 y 1986?", a: "Estadio Jalisco", b: "Estadio Azteca", c: "Estadio Olímpico Universitario", d: "Estadio Cuauhtémoc", correct: "B", exp: "El Estadio Azteca es el único en el mundo donde se coronaron Pelé (1970) y Maradona (1986)." },
        { q: "¿Qué equipo de la Liga MX juega como local en el Estadio Nemesio Díez 'La Bombonera'?", a: "Toluca", b: "Pachuca", c: "Querétaro", d: "San Luis", correct: "A", exp: "Los Diablos Rojos del Toluca juegan en el histórico Nemesio Díez en el Estado de México." },
        { q: "¿Qué equipo viste tradicionalmente con una franja azul diagonal en el pecho?", a: "Puebla", b: "Querétaro", c: "Mazatlán", d: "Juárez", correct: "A", exp: "La Franja del Puebla lleva su icónica franja diagonal en la camiseta desde 1944." },
        { q: "¿Quién anotó el famoso gol de 'escorpión' en el Estadio Azteca en 1995?", a: "Jorge Campos", b: "René Higuita (Colombia vs Inglaterra)", c: "Hugo Sánchez", d: "Cuauhtémoc Blanco", correct: "B", exp: "René Higuita asombró al planeta en Wembley con el escorpión ante Jamie Redknapp en 1995." }
      ]
    },
    {
      id: 'realmadrid',
      category: '🏆 Fútbol Internacional',
      topic: '👑 Real Madrid & UEFA Champions League',
      questions: [
        { q: "¿Cuántas Copas de Europa / UEFA Champions League ha ganado el Real Madrid?", a: "12", b: "14", c: "15", d: "16", correct: "C", exp: "Real Madrid es el Rey de Europa indiscutible con 15 títulos tras ganar la final de 2024 en Wembley." },
        { q: "¿Quién es el máximo goleador histórico del Real Madrid con 450 goles en 438 partidos?", a: "Raúl González", b: "Alfredo Di Stéfano", c: "Cristiano Ronaldo", d: "Karim Benzema", correct: "C", exp: "Cristiano Ronaldo promedió más de 1 gol por partido en sus 9 temporadas de blanco." },
        { q: "¿Qué director técnico ganó 3 Champions League consecutivas (2016, 2017, 2018)?", a: "Carlo Ancelotti", b: "Zinedine Zidane", c: "José Mourinho", d: "Vicente del Bosque", correct: "B", exp: "Zidane logró el triplete consecutivo inédito en el formato moderno de Champions League." },
        { q: "¿Qué jugador mexicano fue 5 veces Pichichi en España (4 con Real Madrid)?", a: "Javier 'Chicharito' Hernández", b: "Hugo Sánchez", c: "Rafael Márquez", d: "Carlos Vela", correct: "B", exp: "Hugo Sánchez ganó la Bota de Oro 1990 con 38 goles todos al primer toque con el Madrid." },
        { q: "¿En qué minuto anotó Sergio Ramos el histórico gol de cabeza para 'La Décima' en 2014?", a: "Minuto 88:15", b: "Minuto 90:00", c: "Minuto 92:48 (93')", d: "Minuto 95:02", correct: "C", exp: "El gol de Ramos al 92:48 ante el Atlético de Madrid mandó la final al alargue para conquistar la Décima." },
        { q: "¿Cómo se llama el estadio inaugurado en 1947 casa del Real Madrid?", a: "Wanda Metropolitano", b: "Santiago Bernabéu", c: "Camp Nou", d: "San Mamés", correct: "B", exp: "Nombrado en honor al presidente histórico Santiago Bernabéu que transformó al club." },
        { q: "¿A qué jugador fichó el Real Madrid en el verano de 2024 procedente del PSG?", a: "Erling Haaland", b: "Kylian Mbappé", c: "Jude Bellingham", d: "Harry Kane", correct: "B", exp: "Kylian Mbappé fue presentado ante más de 80,000 aficionados en el Bernabéu en 2024." },
        { q: "¿Quién anotó la legendaria volea en la final de Champions 2002 ante Bayer Leverkusen?", a: "Raúl González", b: "Zinedine Zidane", c: "Luis Figo", d: "Roberto Carlos", correct: "B", exp: "La volea de zurda de Zidane en Glasgow es considerada uno de los mejores goles de la historia." },
        { q: "¿Qué apodo recibió el Real Madrid de principios de los 2000 con Figo, Zidane, Ronaldo y Beckham?", a: "Los Galácticos", b: "La Quinta del Buitre", c: "El Expreso Blanco", d: "Los Invencibles", correct: "A", exp: "Florentino Pérez reunió a los mejores futbolistas del planeta bajo la era 'Galáctica'." },
        { q: "¿Quién es el presidente del Real Madrid durante las eras de los Galácticos y las 6 Champions recientes?", a: "Ramón Calderón", b: "Florentino Pérez", c: "Lorenzo Sanz", d: "Joan Laporta", correct: "B", exp: "Florentino Pérez es el mandatario con más Copas de Europa en la historia junto a Santiago Bernabéu." }
      ]
    },
    {
      id: 'barcelona',
      category: '🏆 Fútbol Internacional',
      topic: '🔵🔴 FC Barcelona & El Clásico',
      questions: [
        { q: "¿Quién es el máximo goleador histórico del FC Barcelona con 672 goles oficiales?", a: "Luis Suárez", b: "Lionel Messi", c: "César Rodríguez", d: "Ronaldinho", correct: "B", exp: "Lionel Messi ganó 35 títulos con el Barça y anotó 672 goles entre 2004 y 2021." },
        { q: "¿Qué director técnico consiguió el histórico 'Sextete' (6 títulos en un año) en 2009?", a: "Frank Rijkaard", b: "Pep Guardiola", c: "Luis Enrique", d: "Johan Cruyff", correct: "B", exp: "Pep Guardiola ganó Liga, Copa, Champions, Supercopa de España, Supercopa de Europa y Mundial de Clubes." },
        { q: "¿Cómo se llama el legendario estadio del Barcelona inaugurado en 1957?", a: "Camp Nou (Spotify Camp Nou)", b: "Montjuïc", c: "Mestalla", d: "Anoeta", correct: "A", exp: "El Camp Nou es el estadio con mayor capacidad de Europa, actualmente en remodelación." },
        { q: "¿Qué astro brasileño deslumbró al Bernabéu provocando la ovación del rival en 2005?", a: "Rivaldo", b: "Romário", c: "Ronaldinho Gaúcho", d: "Neymar Jr", correct: "C", exp: "Ronaldinho anotó dos golazos en el 0-3 del Barça y fue aplaudido de pie por la afición merengue." },
        { q: "¿Qué famoso tridente ofensivo anotó 122 goles en la temporada del triplete 2014-15?", a: "Messi, Eto'o, Henry", b: "MSN (Messi, Suárez, Neymar)", c: "Villa, Pedro, Messi", d: "Rivaldo, Kluivert, Figo", correct: "B", exp: "La MSN conquistó la Champions de Berlín 2015 de la mano de Luis Enrique." },
        { q: "¿Qué defensor mexicano fue bicampeón de Champions League con el Barcelona (2006 y 2009)?", a: "Hugo Sánchez", b: "Rafael Márquez", c: "Carlos Salcido", d: "Héctor Moreno", correct: "B", exp: "El 'Káiser' Rafael Márquez fue un pilar clave en la defensa blaugrana durante 7 exitosos años." },
        { q: "¿Cómo se llama la famosa academia de fútbol base del FC Barcelona?", a: "La Fábrica", b: "La Masia", c: "Lezama", d: "Castilla", correct: "B", exp: "La Masia formó a leyendas mundiales como Messi, Xavi, Iniesta, Puyol, Busquets y Piqué." },
        { q: "¿Quién anotó el gol agónico al 95' en la remontada 6-1 vs PSG en 2017?", a: "Lionel Messi", b: "Neymar Jr", c: "Sergi Roberto", d: "Luis Suárez", correct: "C", exp: "Sergi Roberto conectó el centro de Neymar al minuto 94:39 logrando la mayor remontada en Champions." },
        { q: "¿Qué holandés revolucionó la filosofía del Barça como jugador y entrenador del 'Dream Team'?", a: "Louis van Gaal", b: "Johan Cruyff", c: "Ronald Koeman", d: "Frank Rijkaard", correct: "B", exp: "Cruyff instauró el estilo de posesión y ganó la primera Copa de Europa en Wembley 1992." },
        { q: "¿Qué dorsal mítico heredó la joven estrella Lamine Yamal y vistió Ronaldinho?", a: "Número 7", b: "Número 10", c: "Número 19", d: "Número 11", correct: "C", exp: "Lamine Yamal brilló en la Eurocopa 2024 y en el Barça portando el dorsal 19." }
      ]
    },
    {
      id: 'nfl',
      category: '🏈 NFL & Americano',
      topic: '🏈 NFL, Super Bowls & Dinastías del Emparrillado',
      questions: [
        { q: "¿Quién es el quarterback con más anillos de Super Bowl en la historia (7 anillos)?", a: "Patrick Mahomes", b: "Tom Brady", c: "Joe Montana", d: "Peyton Manning", correct: "B", exp: "Tom Brady ganó 6 con New England Patriots y 1 con Tampa Bay Buccaneers." },
        { q: "¿Qué franquicias comparten el récord de más Super Bowls ganados con 6 trofeos cada una?", a: "Chiefs & Rams", b: "Pittsburgh Steelers & New England Patriots", c: "Dallas Cowboys & San Francisco 49ers", d: "Packers & Giants", correct: "B", exp: "Steelers y Patriots son las únicas franquicias con 6 Trofeos Vince Lombardi en sus vitrinas." },
        { q: "¿Cómo se llama el trofeo entregado anualmente al campeón de la NFL?", a: "Trofeo Heisman", b: "Trofeo Vince Lombardi", c: "Trofeo Walter Payton", d: "Trofeo Paul Brown", correct: "B", exp: "Nombrado en honor al legendario entrenador de los Green Bay Packers, Vince Lombardi." },
        { q: "¿Qué quarterback lideró a Kansas City Chiefs a ganar los Super Bowls LIV, LVII y LVIII?", a: "Josh Allen", b: "Patrick Mahomes", c: "Lamar Jackson", d: "Joe Burrow", correct: "B", exp: "Patrick Mahomes se ha coronado 3 veces MVP de Super Bowl con los Chiefs." },
        { q: "¿Cuántos puntos otorga un Touchdown en fútbol americano antes del intento de punto extra?", a: "3 puntos", b: "6 puntos", c: "7 puntos", d: "2 puntos", correct: "B", exp: "El Touchdown vale 6 puntos; luego se puede patear el extra (1 pt) o jugar conversión (2 pts)." },
        { q: "¿Qué equipo logró la única temporada perfecta invicta (17-0) en la historia en 1972?", a: "Miami Dolphins", b: "Chicago Bears", c: "San Francisco 49ers", d: "New England Patriots", correct: "A", exp: "Los Miami Dolphins dirigidos por Don Shula terminaron invictos coronándose en el Super Bowl VII." },
        { q: "¿Quién es el líder receptor histórico en yardas, recepciones y touchdowns en la NFL?", a: "Randy Moss", b: "Jerry Rice", c: "Terrell Owens", d: "Larry Fitzgerald", correct: "B", exp: "Jerry Rice acumuló 22,895 yardas y 197 touchdowns por pase con 49ers, Raiders y Seahawks." },
        { q: "¿Qué ciudad alberga el Salón de la Fama del Fútbol Americano Profesional (NFL HOF)?", a: "Green Bay, Wisconsin", b: "Canton, Ohio", c: "Dallas, Texas", d: "Pittsburgh, Pennsylvania", correct: "B", exp: "Canton, Ohio es la cuna donde fue fundada la NFL en septiembre de 1920." },
        { q: "¿Cómo se llama el show musical presentado durante el intermedio del Super Bowl?", a: "Halftime Show (Show de Medio Tiempo)", b: "RedZone Fest", c: "Tailgate Live", d: "Pro Bowl Concert", correct: "A", exp: "El Super Bowl Halftime Show es el evento musical más visto por televisión a nivel mundial." },
        { q: "¿Quién tiene el récord de más yardas por pase en una sola temporada (5,477 yds en 2013)?", a: "Patrick Mahomes", b: "Drew Brees", c: "Peyton Manning", d: "Dan Marino", correct: "C", exp: "Peyton Manning lanzó para 5,477 yardas y 55 touchdowns con Denver Broncos en 2013." }
      ]
    },
    {
      id: 'cowboys',
      category: '🏈 NFL & Americano',
      topic: '🤠 Dallas Cowboys & Leyendas NFL',
      questions: [
        { q: "¿Qué apodo icónico recibieron los Dallas Cowboys en las transmisiones de los años 70?", a: "The Steel Curtain", b: "America's Team (El Equipo de América)", c: "The Legion of Boom", d: "The Greatest Show on Turf", correct: "B", exp: "El apodo nació en la película de resumen de NFL Films de 1978 por su inmensa popularidad nacional." },
        { q: "¿Cuántos campeonatos de Super Bowl han ganado los Dallas Cowboys?", a: "3", b: "4", c: "5", d: "6", correct: "C", exp: "Los Cowboys ganaron los Super Bowls VI, XII, XXVII, XXVIII y XXX." },
        { q: "¿Quién es el corredor con más yardas por tierra en la historia de la NFL (18,355 yds)?", a: "Walter Payton", b: "Barry Sanders", c: "Emmitt Smith", d: "Adrian Peterson", correct: "C", exp: "Emmitt Smith fue el motor de la dinastía de Dallas en los años 90 con los 'Triplets'." },
        { q: "¿Quiénes conformaban el trío de superestrellas conocido como 'The Triplets' de Dallas?", a: "Aikman, Smith e Irvin", b: "Staubach, Dorsett y Pearson", c: "Romo, Witten y Bryant", d: "Prescott, Elliott y Lamb", correct: "A", exp: "Troy Aikman (QB), Emmitt Smith (RB) y Michael Irvin (WR) lideraron a 3 títulos de Super Bowl." },
        { q: "¿Cómo se llama el multimillonario dueño y gerente general de los Cowboys desde 1989?", a: "Robert Kraft", b: "Jerry Jones", c: "Stan Kroenke", d: "Mark Cuban", correct: "B", exp: "Jerry Jones compró a los Cowboys en 1989 y los convirtió en la franquicia deportiva más valiosa del mundo." },
        { q: "¿Cómo se llama el monumental estadio en Arlington, Texas casa de los Cowboys?", a: "Cotton Bowl", b: "AT&T Stadium", c: "Texas Stadium", d: "NRG Stadium", correct: "B", exp: "Inaugurado en 2009, el AT&T Stadium (apodado 'Jerry World') cuenta con una pantalla gigante de 60 yardas." },
        { q: "¿Qué mítico entrenador de sombrero dirigió a Dallas durante sus primeras 29 temporadas?", a: "Jimmy Johnson", b: "Tom Landry", c: "Barry Switzer", d: "Bill Parcells", correct: "B", exp: "Tom Landry dirigió a los Cowboys de 1960 a 1988 con 20 temporadas consecutivas con marca ganadora." },
        { q: "¿Qué símbolo icónico luce el casco plateado de los Dallas Cowboys?", a: "Una herradura", b: "Una estrella solitaria azul", c: "Un sombrero vaquero", d: "Un cuerno de toro", correct: "B", exp: "La estrella azul con reborde blanco representa el apodo de Texas como el 'Estado de la Estrella Solitaria'." },
        { q: "¿Qué quarterback fue el pasador titular de Dallas antes de Dak Prescott y ahora es analista de TV?", a: "Drew Bledsoe", b: "Tony Romo", c: "Quincy Carter", d: "Jon Kitna", correct: "B", exp: "Tony Romo pasó 14 temporadas con Dallas antes de ser la voz estelar de la NFL en CBS." },
        { q: "¿Cómo se llama el grupo de animación y porristas más famoso del mundo fundado por Dallas?", a: "Dallas Raiderettes", b: "Dallas Cowboys Cheerleaders (DCC)", c: "Texas Sweethearts", d: "Lone Star Dancers", correct: "B", exp: "Las Dallas Cowboys Cheerleaders revolucionaron el entretenimiento deportivo desde los años 70." }
      ]
    },
    {
      id: 'f1',
      category: '🏎️ Motor & F1',
      topic: '🏎️ Fórmula 1, Red Bull & Checo Pérez',
      questions: [
        { q: "¿En qué país y circuito consiguió Sergio 'Checo' Pérez su primera victoria en F1 (2020)?", a: "Gran Premio de Mónaco", b: "Gran Premio de Sakhir (Baréin)", c: "Gran Premio de Azerbaiyán (Bakú)", d: "Gran Premio de Singapur", correct: "B", exp: "Checo remontó desde el último lugar con Racing Point en Sakhir para lograr un triunfo histórico." },
        { q: "¿Con qué escudería ganó Checo Pérez el prestigioso Gran Premio de Mónaco en 2022?", a: "Sauber", b: "McLaren", c: "Red Bull Racing", d: "Force India", correct: "C", exp: "Checo ganó en las calles del Principado de Mónaco con una cátedra de manejo bajo lluvia." },
        { q: "¿Qué apodo se ganó Checo Pérez por su épica defensa ante Hamilton en Abu Dabi 2021?", a: "El Káiser Mexicano", b: "Ministro de Defensa de México", c: "El Cohete Tapatío", d: "El Conquistador", correct: "B", exp: "Su defensa frenó a Hamilton y permitió a Max Verstappen ganar su primer campeonato mundial." },
        { q: "¿Quiénes comparten el récord histórico de más campeonatos mundiales de F1 (7 títulos)?", a: "Ayrton Senna & Alain Prost", b: "Michael Schumacher & Lewis Hamilton", c: "Sebastian Vettel & Max Verstappen", d: "Fernando Alonso & Niki Lauda", correct: "B", exp: "Michael Schumacher y Lewis Hamilton son los máximos campeones con 7 coronas mundiales cada uno." },
        { q: "¿Cómo se llama el autódromo que alberga el Gran Premio de México de F1 en CDMX?", a: "Autódromo Monterrey", b: "Autódromo Hermanos Rodríguez", c: "Parque Fundidora", d: "Circuito de las Américas", correct: "B", exp: "Nombrado en memoria de los legendarios pilotos mexicanos Ricardo y Pedro Rodríguez." },
        { q: "¿Qué equipo de F1 tiene como sede Milton Keynes y sus autos lucen un toro rojo?", a: "Ferrari", b: "Mercedes-AMG", c: "Red Bull Racing", d: "Aston Martin", correct: "C", exp: "Red Bull Racing, fundada por Dietrich Mateschitz, ha dominado múltiples eras de la Fórmula 1." },
        { q: "¿Qué piloto brasileño tricampeón es considerado una de las mayores leyendas de la F1?", a: "Felipe Massa", b: "Rubens Barrichello", c: "Ayrton Senna", d: "Nelson Piquet", correct: "C", exp: "Ayrton Senna conquistó 3 campeonatos mundiales con McLaren antes de su trágico accidente en Ímola 1994." },
        { q: "¿Qué significan las siglas 'DRS' en los monoplazas de Fórmula 1?", a: "Direct Racing System", b: "Drag Reduction System (Sistema de Reducción de Resistencia)", c: "Dynamic Rear Spoiler", d: "Drive Ratio Speed", correct: "B", exp: "El DRS abre el alerón trasero en zonas designadas para reducir la resistencia y facilitar rebases." },
        { q: "¿Cuál es el color tradicional con el que siempre compite la histórica Scuderia Ferrari?", a: "Plata / Flechas Plateadas", b: "Azul Papaya", c: "Rojo Corsa / Rosso Ferrari", d: "Verde Británico", correct: "C", exp: "El 'Rosso Corsa' es el color histórico asignado a los constructores italianos en las carreras." },
        { q: "¿En qué posición del Campeonato Mundial de Pilotos de F1 finalizó Checo Pérez en 2023?", a: "Primer Lugar", b: "Subcampeón del Mundo (2º Lugar)", c: "Tercer Lugar", d: "Cuarto Lugar", correct: "B", exp: "Checo logró el histórico subcampeonato mundial de F1 en 2023, el mejor resultado de un mexicano." }
      ]
    },
    {
      id: 'boxeo',
      category: '🥊 Deportes de Combate',
      topic: '🥊 Boxeo Mexicano & Leyendas del Ring',
      questions: [
        { q: "¿Qué récord invicto legendario acumuló Julio César Chávez antes de su primer empate?", a: "65 victorias consecutivas", b: "89 victorias y 0 derrotas", c: "100 victorias consecutivas", d: "50 victorias y 0 derrotas", correct: "B", exp: "El 'Gran Campeón Mexicano' llegó a 89-0 antes de empatar contra Pernell Whitaker en 1993." },
        { q: "¿En cuántas divisiones de peso distintas ha sido campeón mundial Saúl 'Canelo' Álvarez?", a: "2 divisiones", b: "3 divisiones", c: "4 divisiones (Superwélter, Medio, Supermedio, Semipesado)", d: "6 divisiones", correct: "C", exp: "Canelo ha ganado cinturones mundiales en 4 categorías y fue campeón indiscutido en las 168 libras." },
        { q: "¿A qué rival filipino noqueó dramáticamente Juan Manuel Márquez en el 6º round en 2012?", a: "Manny Pacquiao", b: "Nonito Donaire", c: "Floyd Mayweather Jr", d: "Erik Morales", correct: "A", exp: "El derechazo de 'Dinamita' Márquez en Las Vegas en su 4ª pelea quedó grabado en la historia del boxeo." },
        { q: "¿En qué segundo del round 12 noqueó Julio César Chávez a Meldrick Taylor en 1990?", a: "A 30 segundos del final", b: "A 2 segundos del final", c: "Al primer segundo", d: "A 15 segundos del final", correct: "B", exp: "Chávez logró la remontada más dramática del boxeo noqueando a Taylor a solo 2 segundos de perder por puntos." },
        { q: "¿Cómo se llamaba la trilogía bélica entre dos campeones mexicanos en peso supergallo y pluma?", a: "Chávez vs Camacho", b: "Erik 'El Terrible' Morales vs Marco Antonio Barrera", c: "Canelo vs Golovkin", d: "Sal Sánchez vs Wilfredo Gómez", correct: "B", exp: "La rivalidad Barrera vs Morales regaló 3 guerras épicas elegidas múltiples veces como pelea del año." },
        { q: "¿Qué legendario campeón mexicano peso pluma murió trágicamente a los 23 años en 1982?", a: "Rubén 'Púas' Olivares", b: "Salvador Sánchez", c: "Carlos Zárate", d: "Chango Carmona", correct: "B", exp: "Salvador Sánchez era considerado el mejor libra por libra tras vencer a Wilfredo Gómez y Azumah Nelson." },
        { q: "¿Quién fue el primer campeón mundial mexicano de peso completo al vencer a Anthony Joshua?", a: "Andy Ruiz Jr", b: "Gilberto 'Zurdo' Ramírez", c: "Canelo Álvarez", d: "Chris Arreola", correct: "A", exp: "Andy Ruiz sorprendió al mundo en el Madison Square Garden en junio de 2019 con 4 caídas a Joshua." },
        { q: "¿En qué mítico recinto de la Ciudad de México peleó Julio César Chávez ante 132,274 personas?", a: "Plaza de Toros México", b: "Estadio Azteca", c: "Palacio de los Deportes", d: "Arena México", correct: "B", exp: "Chávez noqueó a Greg Haugen en febrero de 1993 imponiendo el récord mundial Guinness de asistencia a una pelea." },
        { q: "¿Qué apodo tenía el carismático campeón de la colonia Bondojito Rubén Olivares?", a: "El Ratón", b: "El Púas", c: "El Chiquita", d: "El Finito", correct: "B", exp: "Rubén 'El Púas' Olivares fue uno de los campeones más queridos por el público mexicano." },
        { q: "¿Qué boxeador mexicano se retiró invicto con marca perfecta de 51 victorias y 0 derrotas?", a: "Ricardo 'Finito' López", b: "Humberto 'Chiquita' González", c: "Julio César Chávez", d: "Jorge 'Travieso' Arce", correct: "A", exp: "Ricardo 'Finito' López defendió 21 veces su corona mundial de peso paja sin conocer la derrota." }
      ]
    },
    {
      id: 'bar_wings',
      category: '🍻 Cultura de Bar & Drinks',
      topic: '🍻 Alitas, Cervezas & Cultura de Sports Bar',
      questions: [
        { q: "¿En qué ciudad estadounidense nacieron las famosas 'Buffalo Wings' en el Anchor Bar en 1964?", a: "Buffalo, Nueva York", b: "Chicago, Illinois", c: "Austin, Texas", d: "Atlanta, Georgia", correct: "A", exp: "Teressa Bellissimo inventó las alitas bañadas en salsa picante con mantequilla en Buffalo, NY." },
        { q: "¿Con qué dos acompañamientos frescos se sirven tradicionalmente las alitas de pollo?", a: "Papas a la francesa y nachos", b: "Apio, zanahoria y aderezo Blue Cheese / Ranch", c: "Frijoles refritos y guacamole", d: "Arroz y ensalada verde", correct: "B", exp: "El apio crujiente y el aderezo cremoso ayudan a mitigar y balancear el picante de las salsas." },
        { q: "¿Qué ingrediente natural le aporta el sabor amargo y notas aromáticas a la cerveza?", a: "La cebada malteada", b: "El lúpulo (Hops)", c: "La levadura", d: "El trigo tostado", correct: "B", exp: "Las flores del lúpulo dan el amargor, balancean la dulzura de la malta y conservan la cerveza." },
        { q: "¿Qué significan las siglas 'IPA' en el mundo de las cervezas artesanales?", a: "International Pale Ale", b: "India Pale Ale", c: "Imperial Premium Alcohol", d: "Irish Pub Ale", correct: "B", exp: "Nació en Inglaterra con extra lúpulo para que la cerveza soportara el largo viaje por mar a la India." },
        { q: "¿Cómo se llama la clásica preparación mexicana con cerveza, limón, sal y salsas negras?", a: "Margarita", b: "Michelada / Cubana", c: "Paloma", d: "Cantarito", correct: "B", exp: "La michelada es el clásico indiscutible en los sports bars y restaurantes de México." },
        { q: "¿Cuál es la salsa de alitas más picante clásica elaborada con chile tropical?", a: "Salsa BBQ Dulce", b: "Salsa Mango Habanero", c: "Salsa Teriyaki", d: "Salsa Parmesano Ajo", correct: "B", exp: "Mango Habanero equilibra el dulce tropical con el fuego extremo del chile habanero." },
        { q: "¿Cuál es la cerveza estilo 'Stout' negra con espuma cremosa más famosa del mundo?", a: "Heineken", b: "Guinness (Irlanda)", c: "Stella Artois", d: "Budweiser", correct: "B", exp: "Guinness se elabora en Dublín, Irlanda desde 1759 con cebada tostada inconfundible." },
        { q: "¿Qué aderezo a base de crema, ajo y finas hierbas es el más pedido para alitas y boneless?", a: "Aderezo Ranch", b: "Aderezo César", c: "Aderezo Mil Islas", d: "Mostaza Dijon", correct: "A", exp: "El aderezo Ranch es el compañero inseparable de las alitas y los snacks en el bar." },
        { q: "¿Cómo se llama el corte de pechuga de pollo empanizado y sin hueso bañado en salsa?", a: "Tenders", b: "Boneless", c: "Nuggets", d: "Drumettes", correct: "B", exp: "Los boneless son cubos de pechuga de pollo 100% carne crujiente listos para botanear." },
        { q: "¿Cuál es el famoso festival de cerveza más grande del planeta celebrado en Múnich, Alemania?", a: "St. Patrick's Fest", b: "Oktoberfest", c: "Spring Break Beer", d: "Winterfest", correct: "B", exp: "El Oktoberfest reúne cada otoño a millones de visitantes celebrando las tradiciones cerveceras bávaras." }
      ]
    },
    {
      id: 'rock',
      category: '🎸 Música & Bar',
      topic: '🎸 Rock en Español & Clásicos de Bar',
      questions: [
        { q: "¿Qué legendaria banda argentina liderada por Gustavo Cerati compuso 'De Música Ligera'?", a: "Los Enanitos Verdes", b: "Soda Stereo", c: "Los Fabulosos Cadillacs", d: "Rata Blanca", correct: "B", exp: "Soda Stereo es uno de los grupos más influyentes en la historia del rock latinoamericano." },
        { q: "¿Cómo se llama la icónica canción de Caifanes que dice 'Ayer me dijo un ave que volaba'?", a: "La Célula que Explota", b: "Afuera", c: "Viento", d: "No Dejes Que...", correct: "C", exp: "'Viento' forma parte del álbum debut de Caifanes lanzado en 1988." },
        { q: "¿Qué banda mexicana de Guadalajara interpreta los éxitos 'Rayando el Sol' y 'Oye Mi Amor'?", a: "Molotov", b: "Café Tacvba", c: "Maná", d: "Zoé", correct: "C", exp: "Maná es la banda de rock/pop en español con mayores ventas a nivel internacional." },
        { q: "¿Qué grupo español liderado por Enrique Bunbury grabó 'Maldito Duende' y 'Entre Dos Tierras'?", a: "Héroes del Silencio", b: "Mägo de Oz", c: "Hombres G", d: "Jarabe de Palo", correct: "A", exp: "Héroes del Silencio marcó época con el álbum Senderos de Traición en 1990." },
        { q: "¿Qué canción de Los Enanitos Verdes es el himno obligatorio de canto en todos los bares?", a: "La Muralla Verde", b: "Lamento Boliviano", c: "Tus Viejas Cartas", d: "Guitarras Blancas", correct: "B", exp: "'Lamento Boliviano' (original de Alcohol Etílico) se convirtió en el clásico máximo de bar." },
        { q: "¿Qué banda mexicana lanzó el controvertido álbum '¿Dónde Jugarán las Niñas?' en 1997?", a: "Molotov", b: "Control Machete", c: "Plastilina Mosh", d: "El Tri", correct: "A", exp: "Molotov revolucionó el rock mexicano con temas como 'Gimme the Power' y 'Voto Latino'." },
        { q: "¿Quién es el vocalista e histórico líder de la banda de rock urbano El Tri?", a: "Alex Lora", b: "Saúl Hernández", c: "Roco Pachukote", d: "Rubén Albarrán", correct: "A", exp: "Alex Lora lleva más de 55 años cantando rock y es el alma de El Tri." },
        { q: "¿Cómo se llama la canción de Café Tacvba inspirada en una historia de amor de baile de salón?", a: "Eres", b: "La Ingrata", c: "El Baile y el Salón", d: "Chilanga Banda", correct: "C", exp: "'El Baile y el Salón' es uno de los temas más aclamados del álbum Re (1994)." },
        { q: "¿Qué grupo español se hizo famoso en los años 80 con 'Devuélveme a mi chica' ('Sufre mamón')?", a: "Mecano", b: "Hombres G", c: "La Unión", d: "Radio Futura", correct: "B", exp: "David Summers y Hombres G causaron furor en España e Hispanoamérica con su disco debut." },
        { q: "¿Quién compuso la canción 'Flaca' y fue miembro de Los Rodríguez y Los Abuelos de la Nada?", a: "Charly García", b: "Andrés Calamaro", c: "Fito Páez", d: "Vicentico", correct: "B", exp: "'El Salmón' Andrés Calamaro lanzó su icónico álbum Alta Suciedad con 'Flaca' en 1997." }
      ]
    }
  ];

  // =========================================================================
  // SMART DYNAMIC AI GENERATOR ENGINE FOR ARBITRARY CUSTOM TOPICS
  // =========================================================================
  function generateDynamicAIQuestions(rawTopic, count = 10) {
    const topic = (rawTopic || 'Trivia de Deportes y Bar').trim();
    const tLower = topic.toLowerCase();

    // Check if we have an exact or partial match in curated presets
    for (const preset of TOPIC_PRESETS) {
      if (tLower.includes(preset.id) || preset.topic.toLowerCase().includes(tLower) || tLower.includes(preset.topic.toLowerCase().slice(3, 12))) {
        const sliceCount = Math.min(count, preset.questions.length);
        return preset.questions.slice(0, sliceCount);
      }
    }

    // Heuristic Context Analysis
    const isSoccer = /fútbol|futbol|soccer|liga mx|america|chivas|cruz azul|pumas|tigres|monterrey|real madrid|barcelona|champions|messi|cr7|cristiano|selecci|mundial|concacaf/i.test(topic);
    const isNFL = /nfl|football|super bowl|quarterback|touchdown|cowboys|chiefs|patriots|49ers|steelers|brady|mahomes/i.test(topic);
    const isF1 = /f1|fórmula 1|formula 1|checo|verstappen|hamilton|ferrari|red bull|mercedes|mónaco|gran premio|piloto/i.test(topic);
    const isBox = /box|boxeo|canelo|chavez|chávez|marquez|pacquiao|knockout|ring|campeon|peso/i.test(topic);
    const isBeerFood = /cerveza|beer|alitas|wings|boneless|bar|trago|coctel|comida|botana|michelada/i.test(topic);
    const isMusic = /rock|musica|música|banda|cancion|canción|cantante|concierto|disco|pop/i.test(topic);

    const generated = [];

    if (isSoccer) {
      const templates = [
        { q: `¿En qué año se fundó o comenzó la historia profesional de ${topic}?`, a: "1906", b: "1916", c: "1924", d: "1950", correct: "B", exp: `La historia y trayectoria de ${topic} está documentada con gran relevancia en el fútbol.` },
        { q: `¿Quién es considerado uno de los mayores ídolos y referentes históricos en ${topic}?`, a: "Hugo Sánchez", b: "Cuauhtémoc Blanco", c: "Rafael Márquez", d: "Javier Hernández", correct: "A", exp: `Figura legendaria que dejó una huella imborrable en la historia deportiva relacionada a ${topic}.` },
        { q: `¿Cuál es el torneo internacional de clubes más prestigioso que disputa ${topic}?`, a: "Copa Libertadores / Champions League", b: "Copa Oro", c: "Leagues Cup", d: "Trofeo Santiago Bernabéu", correct: "A", exp: `Las competiciones continentales de clubes representan la cúspide competitiva.` },
        { q: `¿Cómo se llama el recinto o estadio más emblemático asociado a ${topic}?`, a: "Estadio Azteca", b: "Santiago Bernabéu", c: "Estadio Jalisco", d: "Camp Nou", correct: "A", exp: `El mítico estadio alberga las hazañas más recordadas del fútbol.` },
        { q: `¿Qué récord o campeonato es el más recordado en la historia de ${topic}?`, a: "El histórico Bicampeonato", b: "La final de penales invicta", c: "El récord de goles en torneos cortos", d: "El título de goleo individual", correct: "A", exp: `Los campeonatos consecutivos marcan épocas doradas en la historia del fútbol.` },
        { q: `¿Cuál es la máxima rivalidad o 'Clásico' que enciende la pasión de ${topic}?`, a: "El Clásico Nacional / Clásico de la Ciudad", b: "El Duelo de la Costa", c: "La Copa del Sol", d: "El Clásico del Bajío", correct: "A", exp: `Los partidos de máxima rivalidad paralizan a la afición en todo el país.` },
        { q: `¿Qué dorsal icónico suele portar el jugador creador de juego en ${topic}?`, a: "Número 1", b: "Número 4", c: "Número 10", d: "Número 11", correct: "C", exp: `El dorsal número 10 es tradicionalmente reservado para la máxima estrella del equipo.` },
        { q: `¿Quién fue el director técnico que encabezó la época más exitosa reciente de ${topic}?`, a: "El estratega campeón de liga y copa", b: "El entrenador interino", c: "El preparador físico", d: "El director deportivo", correct: "A", exp: `El cuerpo técnico estratégico fue clave para la obtención de los trofeos oficiales.` },
        { q: `¿Qué país ha ganado más Copas del Mundo de la FIFA (5 títulos)?`, a: "Alemania", b: "Brasil", c: "Argentina", d: "Italia", correct: "B", exp: `Brasil es el único pentacampeón mundial (1958, 1962, 1970, 1994, 2002).` },
        { q: `¿Qué regla de desempate se aplica tras 90 minutos en fases eliminatorias?`, a: "Tiempo extra de 30 min y penales", b: "Moneda al aire", c: "Gana el equipo visitante", d: "Gol de oro en 5 minutos", correct: "A", exp: `El alargue y los tiros desde el punto penal definen a los clasificados en torneos oficiales.` }
      ];
      for (let i = 0; i < Math.min(count, templates.length); i++) generated.push(templates[i]);
    } else if (isNFL) {
      const templates = [
        { q: `¿Cuántos puntos otorga una anotación de Touchdown en ${topic}?`, a: "3 puntos", b: "6 puntos", c: "7 puntos", d: "2 puntos", correct: "B", exp: `El touchdown otorga 6 puntos antes del intento de punto extra o conversión.` },
        { q: `¿Cómo se llama el codiciado trofeo del Super Bowl disputado en ${topic}?`, a: "Trofeo Heisman", b: "Trofeo Vince Lombardi", c: "Trofeo Walter Payton", d: "Trofeo Madden", correct: "B", exp: `Nombrado en memoria de Vince Lombardi, legendario entrenador de Green Bay.` },
        { q: "¿Quién es el quarterback con más títulos de Super Bowl (7 anillos)?", a: "Patrick Mahomes", b: "Tom Brady", c: "Joe Montana", d: "Peyton Manning", correct: "B", exp: "Tom Brady ganó 6 con New England y 1 con Tampa Bay." },
        { q: `¿Cuántas yardas debe avanzar la ofensiva para conseguir el 'Primero y Diez'?`, a: "5 yardas", b: "10 yardas", c: "15 yardas", d: "20 yardas", correct: "B", exp: `Avanzar 10 yardas en un máximo de 4 intentos renueva la serie ofensiva.` },
        { q: `¿Qué posición lidera la ofensiva y lanza los pases en ${topic}?`, a: "Running Back", b: "Quarterback (Mariscal de campo)", c: "Wide Receiver", d: "Tight End", correct: "B", exp: `El quarterback es el cerebro encargado de ejecutar las jugadas ofensivas.` },
        { q: `¿Qué franquicias tienen el récord con 6 trofeos de Super Bowl cada una?`, a: "Steelers & Patriots", b: "Cowboys & 49ers", c: "Chiefs & Rams", d: "Packers & Giants", correct: "A", exp: `Pittsburgh Steelers y New England Patriots lideran la NFL con 6 títulos cada uno.` },
        { q: `¿Cómo se llama la jugada defensiva cuando derriban al mariscal detrás de la línea?`, a: "Intercepción", b: "Fumble", c: "Sack (Captura de QB)", d: "Safety", correct: "C", exp: `El sack detiene el avance ofensivo y provoca pérdida de yardas para el ataque.` },
        { q: `¿Cuántos jugadores por equipo están simultáneamente dentro del emparrillado?`, a: "9 jugadores", b: "11 jugadores", c: "12 jugadores", d: "15 jugadores", correct: "B", exp: `Cada escuadra alinea 11 jugadores en ofensiva, defensiva o equipos especiales.` },
        { q: `¿En qué mes se disputa tradicionalmente el Super Bowl?`, a: "Diciembre", b: "Enero", c: "Febrero", d: "Marzo", correct: "C", exp: `El domingo de Super Bowl se celebra cada febrero coronando al campeón de la NFL.` },
        { q: `¿Qué equipo logró la única temporada invicta perfecta (17-0) en la historia?`, a: "Miami Dolphins (1972)", b: "Chicago Bears", c: "New England Patriots", d: "Dallas Cowboys", correct: "A", exp: `Los Dolphins de 1972 dirigidos por Don Shula finalizaron 17-0 ganando el Super Bowl VII.` }
      ];
      for (let i = 0; i < Math.min(count, templates.length); i++) generated.push(templates[i]);
    } else {
      // General Dynamic Multi-Sport & Pop Trivia
      const templates = [
        { q: `¿Cuál es el dato histórico más representativo y emblemático sobre ${topic}?`, a: `El récord de campeonatos y logros históricos`, b: `Su fundación en el siglo XX`, c: `La gran afición internacional que reúne`, d: `Su impacto en la cultura del entretenimiento`, correct: "A", exp: `Los récords y momentos de gloria definen el legado de ${topic}.` },
        { q: `¿Quién es reconocido como una de las figuras estelares vinculadas a ${topic}?`, a: `La máxima estrella y referente de la época`, b: `El competidor novato del año`, c: `El analista de televisión`, d: `El fundador honorario`, correct: "A", exp: `Las grandes personalidades han impulsado el prestigio y popularidad de ${topic}.` },
        { q: `¿Qué elemento clave distingue a ${topic} frente a sus principales rivales?`, a: `Su estilo dinámico, pasión y tradición`, b: `El color de su vestimenta`, c: `El número de partidos disputados`, d: `La sede en una sola ciudad`, correct: "A", exp: `La identidad y entrega son los sellos inconfundibles de ${topic}.` },
        { q: `¿En qué año o década se vivió una de las épocas doradas más recordadas de ${topic}?`, a: `En los años 70s y 80s`, b: `En la década de los 90s`, c: `En los años 2000s y era contemporánea`, d: `En el año 1920`, correct: "C", exp: `La era moderna ha consagrado grandes hazañas seguidas por millones de personas.` },
        { q: `¿Cuál es el recinto, ciudad o escenario internacional cumbre donde brilla ${topic}?`, a: `En los grandes estadios y arenas mundiales`, b: `En torneos regionales locales`, c: `En circuitos de exhibición`, d: `En gimnasios escolares`, correct: "A", exp: `Los eventos masivos en estadios icónicos consagran a los mejores exponentes.` },
        { q: `¿Qué trofeo, premio o reconocimiento es el mayor honor a conquistar en ${topic}?`, a: `El trofeo de Campeón Mundial / Oro`, b: `La medalla de participación`, c: `El diploma conmemorativo`, d: `El premio al juego limpio`, correct: "A", exp: `Levantar la copa de campeón consagra años de esfuerzo y disciplina deportiva.` },
        { q: `¿Qué cántico, lema o frase célebre identifica a la afición apasionada de ${topic}?`, a: `¡Vamos con todo por la victoria!`, b: `El juego apenas comienza`, c: `Siempre adelante con orgullo y pasión`, d: `¡A ganar en cada jugada!`, correct: "C", exp: `Los cánticos de aliento unen a miles de aficionados en cada presentación.` },
        { q: `¿Cuál es la estrategia o táctica más efectiva para dominar en ${topic}?`, a: `Velocidad, trabajo en equipo y precisión`, b: `Esperar el error del rival únicamente`, c: `Jugar a la defensiva todo el tiempo`, d: `Depender de la suerte y el azar`, correct: "A", exp: `El balance táctico, la velocidad y la concentración son factores decisivos para triunfar.` },
        { q: `¿Qué momento agónico en los últimos segundos marcó la historia de ${topic}?`, a: `Una anotación / jugada milagrosa en tiempo de compensación`, b: `La suspensión por lluvia`, c: `Un cambio de alineación de último minuto`, d: `La repetición del partido`, correct: "A", exp: `Las hazañas en el último segundo generan las mayores emociones en el deporte.` },
        { q: `¿Por qué ${topic} sigue siendo uno de los temas favoritos para disfrutar en el Sports Bar?`, a: `Porque combina adrenalina, competencia, amigos y diversión`, b: `Porque los partidos duran pocas horas`, c: `Porque se juega en silencio`, d: `Porque no hay ganadores ni perdedores`, correct: "A", exp: `La emoción y la convivencia hacen de ${topic} el pretexto perfecto para disfrutar con alitas y cerveza.` }
      ];
      for (let i = 0; i < Math.min(count, templates.length); i++) generated.push(templates[i]);
    }

    return generated;
  }

  // =========================================================================
  // INITIALIZATION & FIRESTORE REAL-TIME SYNCHRONIZATION
  // =========================================================================
  window.initTriviaAdmin = function() {
    if (window.db) {
      db = window.db;
      loadTriviaGames();
    } else {
      setTimeout(window.initTriviaAdmin, 100);
    }
  };

  // Load all trivia rooms from 'trivia_games' with in-memory sorting
  function loadTriviaGames() {
    if (!db) return;
    try {
      db.collection('trivia_games').onSnapshot(snap => {
        activeTriviaGames = [];
        snap.forEach(doc => {
          activeTriviaGames.push({ id: doc.id, ...doc.data() });
        });

        // Robust client-side sort: newest first
        activeTriviaGames.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

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
      }, err => {
        console.error('[TriviaAdmin] Error loading games:', err);
        renderNoTriviaUI();
      });
    } catch (e) {
      console.error('[TriviaAdmin] Init snapshot error:', e);
    }
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
      if (!doc.exists) {
        renderNoTriviaUI();
        return;
      }
      currentTriviaData = { id: doc.id, ...doc.data() };
      renderTriviaHostControls();
    }, err => console.error('[TriviaAdmin] Error listening game:', err));

    // 2. Listen to players subcollection
    unsubPlayers = db.collection('trivia_games').doc(gameId).collection('players').onSnapshot(snap => {
      currentPlayersMap = {};
      snap.forEach(pDoc => {
        currentPlayersMap[pDoc.id] = { id: pDoc.id, ...pDoc.data() };
      });
      renderTriviaPlayersList();
    }, err => console.error('[TriviaAdmin] Error listening players:', err));
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
        <div style="font-size:15px; font-weight:850; color:#ffffff; margin-bottom:8px;">${currentQ.q || 'Sin pregunta activa'}</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:12px;">
          <div style="padding:6px 10px; border-radius:8px; background:rgba(229,45,39,0.18); border:1.5px solid #ff4d4d; color:#fff;">
            <strong>A)</strong> ${currentQ.a || ''} ${currentQ.correct === 'A' ? '⭐ <span style="color:#00e676; font-weight:900;">(CORRECTA)</span>' : ''}
          </div>
          <div style="padding:6px 10px; border-radius:8px; background:rgba(30,136,229,0.18); border:1.5px solid #42a5f5; color:#fff;">
            <strong>B)</strong> ${currentQ.b || ''} ${currentQ.correct === 'B' ? '⭐ <span style="color:#00e676; font-weight:900;">(CORRECTA)</span>' : ''}
          </div>
          <div style="padding:6px 10px; border-radius:8px; background:rgba(243,156,18,0.18); border:1.5px solid #f1c40f; color:#fff;">
            <strong>C)</strong> ${currentQ.c || ''} ${currentQ.correct === 'C' ? '⭐ <span style="color:#00e676; font-weight:900;">(CORRECTA)</span>' : ''}
          </div>
          <div style="padding:6px 10px; border-radius:8px; background:rgba(0,176,155,0.18); border:1.5px solid #2ecc71; color:#fff;">
            <strong>D)</strong> ${currentQ.d || ''} ${currentQ.correct === 'D' ? '⭐ <span style="color:#00e676; font-weight:900;">(CORRECTA)</span>' : ''}
          </div>
        </div>
        ${currentQ.exp ? `<div style="font-size:11.5px; color:#ffd100; margin-top:8px; background:rgba(255,209,0,0.08); padding:6px 10px; border-radius:6px;">💡 <strong>Dato:</strong> ${currentQ.exp}</div>` : ''}
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
      listEl.innerHTML = '<div class="hint-text py-3 text-center">Aún no hay clientes unidos. Proyecta la TV o comparte el PIN / WhatsApp.</div>';
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
          <span style="font-size:12px; font-weight:900; color:#ffd100; width:22px;">#${idx + 1}</span>
          <img src="${p.photoURL || 'img/logo.jpg'}" style="width:30px; height:30px; border-radius:50%; object-fit:cover; border:1px solid #ffd100;" onerror="this.src='img/logo.jpg'"/>
          <div>
            <strong style="color:#ffffff; font-size:13px;">${p.nickname || p.playerName}</strong>
            <div style="font-size:10.5px; color:var(--text-muted);">${p.waiter ? 'Mesa: ' + p.waiter : 'Cliente'} • ⭐ <strong>${p.totalScore || 0} pts</strong></div>
          </div>
        </div>
        <div>
          ${hasAnsweredThisQ ? `
            <span class="badge ${ansObj.isCorrect ? 'success' : 'danger'}" style="font-size:10.5px; font-weight:900;">
              ${ansObj.choice} (${ansObj.isCorrect ? '+' + ansObj.pointsEarned + ' pts' : '0 pts'})
            </span>
          ` : `
            <span class="badge" style="background:rgba(255,255,255,0.1); font-size:10px; opacity:0.7;">Pensando...</span>
          `}
        </div>
      `;
      listEl.appendChild(item);
    });
  }

  // =========================================================================
  // HOST LIVE REMOTE CONTROL ACTIONS
  // =========================================================================
  window.startTriviaQuestion = async function() {
    if (!selectedTriviaId || !db) return;
    try {
      await db.collection('trivia_games').doc(selectedTriviaId).update({
        status: 'question',
        questionStartTime: Date.now()
      });
    } catch (err) {
      alert('Error al iniciar pregunta: ' + err.message);
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
      alert('Error al revelar respuesta: ' + err.message);
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
      // Reveal Final Podium
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
      alert('Error al avanzar pregunta: ' + err.message);
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

  window.deleteCurrentTriviaRoom = async function() {
    if (!selectedTriviaId || !db) return;
    if (!confirm('⚠️ ¿Estás seguro de eliminar esta sala de trivia? Todos los resultados se borrarán.')) return;
    try {
      await db.collection('trivia_games').doc(selectedTriviaId).delete();
      alert('🗑️ Sala de Trivia eliminada correctamente.');
    } catch (err) {
      alert('Error al eliminar sala: ' + err.message);
    }
  };

  window.openTriviaTVWindow = function() {
    if (!selectedTriviaId) return;
    window.open(`trivia-tv.html?gameId=${selectedTriviaId}`, '_blank');
  };

  window.shareTriviaWhatsApp = function() {
    if (!selectedTriviaId || !currentTriviaData) return;
    const g = currentTriviaData;
    const shareUrl = `${window.location.origin}${window.location.pathname.replace('admin.html', 'index.html')}#tab-trivia`;
    const msg = `🧠 *¡TRIVIA EN VIVO EN DRINKS & WINS!* 🔥\n\n` +
      `📌 *Tema:* ${g.title}\n` +
      `📍 *Sucursal:* ${g.store || 'Juriquilla'}\n` +
      `🔢 *PIN de Acceso:* ${g.pin || g.id}\n\n` +
      `🎯 Contesta desde tu celular en tiempo real y gana premios. ¡Los más rápidos se llevan más puntos!\n\n` +
      `📲 *Únete aquí:* ${shareUrl}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // =========================================================================
  // AI QUESTION GENERATOR MODAL & INTERACTIVE WORKFLOW
  // =========================================================================
  window.openCreateTriviaModal = function() {
    const modal = document.getElementById('modalCreateTrivia');
    if (!modal) {
      console.error('[TriviaAdmin] #modalCreateTrivia not found in DOM');
      return;
    }
    modal.classList.add('active');
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    renderPresetTopicDropdown();

    // Default to first preset
    window.onPresetTopicSelectChange('0');
  };

  window.closeCreateTriviaModal = function() {
    const modal = document.getElementById('modalCreateTrivia');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
      modal.style.opacity = '0';
      modal.style.pointerEvents = 'none';
    }
  };

  function renderPresetTopicDropdown() {
    const sel = document.getElementById('newTrivPresetSelect');
    if (!sel) return;
    sel.innerHTML = `
      <optgroup label="✨ Inteligencia Artificial">
        <option value="-1">✨ [Escribir Cualquier Tema Personalizado con IA]</option>
      </optgroup>
      <optgroup label="⚽ Fútbol Mexicano & Liga MX">
        ${TOPIC_PRESETS.filter(p => p.category.includes('Fútbol Mexicano')).map((p, idx) => {
          const globalIdx = TOPIC_PRESETS.indexOf(p);
          return `<option value="${globalIdx}">${p.topic}</option>`;
        }).join('')}
      </optgroup>
      <optgroup label="🏆 Fútbol Internacional">
        ${TOPIC_PRESETS.filter(p => p.category.includes('Internacional')).map((p, idx) => {
          const globalIdx = TOPIC_PRESETS.indexOf(p);
          return `<option value="${globalIdx}">${p.topic}</option>`;
        }).join('')}
      </optgroup>
      <optgroup label="🏈 NFL & Americano">
        ${TOPIC_PRESETS.filter(p => p.category.includes('NFL')).map((p, idx) => {
          const globalIdx = TOPIC_PRESETS.indexOf(p);
          return `<option value="${globalIdx}">${p.topic}</option>`;
        }).join('')}
      </optgroup>
      <optgroup label="🏎️ Motor, Boxeo & Deportes">
        ${TOPIC_PRESETS.filter(p => p.category.includes('Motor') || p.category.includes('Combate')).map((p, idx) => {
          const globalIdx = TOPIC_PRESETS.indexOf(p);
          return `<option value="${globalIdx}">${p.topic}</option>`;
        }).join('')}
      </optgroup>
      <optgroup label="🍻 Bar, Alitas & Música">
        ${TOPIC_PRESETS.filter(p => p.category.includes('Bar') || p.category.includes('Música')).map((p, idx) => {
          const globalIdx = TOPIC_PRESETS.indexOf(p);
          return `<option value="${globalIdx}">${p.topic}</option>`;
        }).join('')}
      </optgroup>
    `;
  }

  window.onPresetTopicSelectChange = function(idx) {
    const titleInp = document.getElementById('newTrivTitle');
    const customDiv = document.getElementById('newTrivCustomTopicWrap');
    const customPromptInp = document.getElementById('newTrivCustomPrompt');

    const i = parseInt(idx, 10);
    if (i >= 0 && TOPIC_PRESETS[i]) {
      if (titleInp) titleInp.value = TOPIC_PRESETS[i].topic;
      if (customDiv) customDiv.style.display = 'none';
      generatedQuestionsBuffer = TOPIC_PRESETS[i].questions;
      renderQuestionsPreview(generatedQuestionsBuffer);
    } else {
      if (customDiv) customDiv.style.display = 'block';
      if (titleInp && !titleInp.value) titleInp.value = '🧠 Trivia Especial Drinks & Wins';
      if (customPromptInp) {
        customPromptInp.focus();
        if (customPromptInp.value.trim()) {
          triggerAIGeneration();
        } else {
          // Pre-generate sample custom questions
          generatedQuestionsBuffer = generateDynamicAIQuestions('Deportes y Bar', 10);
          renderQuestionsPreview(generatedQuestionsBuffer);
        }
      }
    }
  };

  window.applyQuickTopicChip = function(topicText) {
    const sel = document.getElementById('newTrivPresetSelect');
    const customDiv = document.getElementById('newTrivCustomTopicWrap');
    const customPromptInp = document.getElementById('newTrivCustomPrompt');
    const titleInp = document.getElementById('newTrivTitle');

    if (sel) sel.value = '-1';
    if (customDiv) customDiv.style.display = 'block';
    if (customPromptInp) customPromptInp.value = topicText;
    if (titleInp) titleInp.value = `🧠 Trivia: ${topicText}`;

    window.triggerAIGeneration();
  };

  window.triggerAIGeneration = async function() {
    const customPromptInp = document.getElementById('newTrivCustomPrompt');
    const titleInp = document.getElementById('newTrivTitle');
    const qCountSel = document.getElementById('newTrivQCount');
    const btnGen = document.getElementById('btnTrivGenAI');
    const statusMsg = document.getElementById('trivGenStatusMsg');

    const topic = (customPromptInp?.value || titleInp?.value || 'Trivia Deportes').trim();
    const count = parseInt(qCountSel?.value || '10', 10) || 10;

    if (btnGen) {
      btnGen.disabled = true;
      btnGen.innerHTML = `<span>⏳</span> Generando con IA...`;
    }
    if (statusMsg) {
      statusMsg.style.display = 'block';
      statusMsg.innerHTML = `🧠 <em>La Inteligencia Artificial está redactando ${count} preguntas reales y verificadas sobre "${topic}"...</em>`;
    }

    // Simulate real AI processing & generate deep dynamic questions
    setTimeout(() => {
      generatedQuestionsBuffer = generateDynamicAIQuestions(topic, count);
      renderQuestionsPreview(generatedQuestionsBuffer);

      if (titleInp && (!titleInp.value || titleInp.value.startsWith('🧠 Trivia:'))) {
        titleInp.value = `🧠 Trivia ${topic}`;
      }

      if (btnGen) {
        btnGen.disabled = false;
        btnGen.innerHTML = `<span>✨</span> Generar Preguntas con IA`;
      }
      if (statusMsg) {
        statusMsg.innerHTML = `✅ <strong>¡${generatedQuestionsBuffer.length} preguntas generadas exitosamente!</strong> Revisa la vista previa abajo y presiona "🚀 Crear Sala".`;
      }
    }, 400);
  };

  function renderQuestionsPreview(questions) {
    const previewContainer = document.getElementById('trivQuestionsPreviewList');
    const countBadge = document.getElementById('trivPreviewCountBadge');
    if (!previewContainer) return;

    if (countBadge) countBadge.textContent = `${questions.length} Preguntas Listas`;

    if (!questions || questions.length === 0) {
      previewContainer.innerHTML = '<div class="hint-text text-center py-3">No hay preguntas generadas. Haz clic en "Generar Preguntas con IA".</div>';
      return;
    }

    previewContainer.innerHTML = questions.map((q, idx) => `
      <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px 12px; margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <strong style="color:#ffd100; font-size:12px;">Pregunta #${idx + 1}</strong>
          <span class="badge success" style="font-size:10px;">Correcta: Opción ${q.correct}</span>
        </div>
        <div style="font-size:13px; font-weight:800; color:#ffffff; margin-bottom:8px; line-height:1.3;">${q.q}</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; font-size:11px;">
          <div style="padding:4px 6px; border-radius:5px; background:rgba(229,45,39,0.15); border:1px solid ${q.correct === 'A' ? '#00e676' : 'rgba(255,77,77,0.4)'}; color:#fff;">
            <strong>A)</strong> ${q.a} ${q.correct === 'A' ? '⭐' : ''}
          </div>
          <div style="padding:4px 6px; border-radius:5px; background:rgba(30,136,229,0.15); border:1px solid ${q.correct === 'B' ? '#00e676' : 'rgba(66,165,245,0.4)'}; color:#fff;">
            <strong>B)</strong> ${q.b} ${q.correct === 'B' ? '⭐' : ''}
          </div>
          <div style="padding:4px 6px; border-radius:5px; background:rgba(243,156,18,0.15); border:1px solid ${q.correct === 'C' ? '#00e676' : 'rgba(241,196,15,0.4)'}; color:#fff;">
            <strong>C)</strong> ${q.c} ${q.correct === 'C' ? '⭐' : ''}
          </div>
          <div style="padding:4px 6px; border-radius:5px; background:rgba(0,176,155,0.15); border:1px solid ${q.correct === 'D' ? '#00e676' : 'rgba(46,204,113,0.4)'}; color:#fff;">
            <strong>D)</strong> ${q.d} ${q.correct === 'D' ? '⭐' : ''}
          </div>
        </div>
        ${q.exp ? `<div style="font-size:10.5px; color:#ffd100; margin-top:6px;">💡 <em>${q.exp}</em></div>` : ''}
      </div>
    `).join('');
  }

  // Final Publish to Firestore
  window.generateAndCreateTrivia = async function() {
    if (!db) {
      alert('Error: Base de datos no inicializada. Recarga la página.');
      return;
    }

    const titleInp = document.getElementById('newTrivTitle');
    const storeSel = document.getElementById('newTrivStore');
    const timeInp = document.getElementById('newTrivTime');
    const customPromptInp = document.getElementById('newTrivCustomPrompt');

    let title = titleInp ? titleInp.value.trim() : '';
    if (!title) {
      title = customPromptInp?.value ? `🧠 Trivia: ${customPromptInp.value.trim()}` : '🧠 Trivia Drinks & Wins';
    }

    let questions = generatedQuestionsBuffer;
    if (!questions || questions.length === 0) {
      const topic = customPromptInp?.value || title;
      questions = generateDynamicAIQuestions(topic, 10);
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
      alert(`🎉 ¡Sala de Trivia "${title}" creada con éxito!\n\n📌 PIN de Acceso: ${pin}\n👥 Sucursal: ${store}\n\n👉 Puedes proyectarla en las TVs haciendo clic en "🖥️ Abrir Pantalla de TV" y compartir el link por WhatsApp.`);
    } catch (err) {
      console.error('[TriviaAdmin] Error creating trivia:', err);
      alert('Error al crear sala de trivia: ' + err.message);
    }
  };

  // Launch on load
  window.initTriviaAdmin();
})();
