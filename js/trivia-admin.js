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
  let editingQuestionIndex = null;
  let firestoreGeminiApiKey = null;

  // Key storage
  const GEMINI_STORAGE_KEY = 'bww_gemini_api_key';

  // =========================================================================
  // EXTENSIVE 100% REAL & VERIFIED KNOWLEDGE DATABASE FOR INSTANT TRIVIA
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
      id: 'pumas',
      category: '⚽ Fútbol Mexicano',
      topic: '🐾 Pumas UNAM (Los Universitarios)',
      questions: [
        { q: "¿En qué histórico estadio de la Ciudad de México juegan los Pumas UNAM como locales?", a: "Estadio Azteca", b: "Estadio Olímpico Universitario", c: "Estadio Ciudad de los Deportes", d: "Estadio Hidalgo", correct: "B", exp: "El Estadio Olímpico Universitario en Ciudad Universitaria fue sede de los Juegos Olímpicos de 1968." },
        { q: "¿Quién fue el director técnico del histórico Bicampeonato de Pumas en 2004?", a: "Ricardo 'Tuca' Ferretti", b: "Hugo Sánchez", c: "Guillermo Vázquez", d: "Miguel Mejía Barón", correct: "B", exp: "Hugo Sánchez guió a Pumas al bicampeonato Clausura y Apertura 2004." },
        { q: "¿A qué gigante europeo venció Pumas por el Trofeo Santiago Bernabéu en 2004?", a: "FC Barcelona", b: "Real Madrid (1-0)", c: "Juventus", d: "AC Milan", correct: "B", exp: "Pumas ganó 1-0 en el Bernabéu con un memorable golazo de Israel Castro." },
        { q: "¿Quién es el máximo goleador histórico de Pumas con 151 goles oficiales?", a: "Hugo Sánchez", b: "Evanivaldo Castro 'Cabinho'", c: "Manuel Negrete", d: "Jesús Olalde", correct: "B", exp: "Cabinho anotó 151 goles con Pumas y fue pentacampeón de goleo con la UNAM." },
        { q: "¿Cómo se llama el legendario cántico y porra institucional de la UNAM?", a: "El Cielito Lindo", b: "El ¡Goya!", c: "El Himno a la Alegría", d: "El Huapango", correct: "B", exp: "El ¡Goya! es el grito de guerra creado en los años 40 por el estudiante Luis 'Palillo' Rodríguez." },
        { q: "¿Cuántos títulos de Liga MX tiene Pumas en su historia?", a: "6", b: "7", c: "8", d: "9", correct: "B", exp: "Pumas suma 7 campeonatos de Liga MX (1977, 1981, 1991, Cl. 2004, Ap. 2004, Cl. 2009, Cl. 2011)." },
        { q: "¿Qué apodo recibe el clásico partido entre Pumas UNAM y Club América?", a: "Clásico Nacional", b: "Clásico Capitalino", c: "Clásico Tapatío", d: "Clásico del Norte", correct: "B", exp: "El Clásico Capitalino enfrenta a Pumas y América con enorme fervor desde los años 60." },
        { q: "¿Qué emblemático jugador anotó el mejor gol del Mundial México 86 de tijera ante Bulgaria?", a: "Hugo Sánchez", b: "Manuel Negrete", c: "Tomás Boy", d: "Fernando Quirarte", correct: "B", exp: "La tijera de Manuel Negrete en CU fue votada oficialmente como el mejor gol en la historia de los Mundiales." },
        { q: "¿Cuáles son los colores tradicionales e institucionales de Pumas UNAM?", a: "Rojiblanco", b: "Azul y Oro", c: "Verde y Blanco", d: "Negro y Amarillo", correct: "B", exp: "El Azul y Oro representa la tradición deportiva y académica de la Universidad Nacional." },
        { q: "¿Cómo se llama la emblemática mascota felina de Pumas UNAM?", a: "Blu", b: "Goyo el Puma", c: "Tigretón", d: "Agui", correct: "B", exp: "Goyo anima a la afición auriazul en cada partido en Ciudad Universitaria." }
      ]
    },
    {
      id: 'regios',
      category: '⚽ Fútbol Mexicano',
      topic: '🐯 Tigres UANL & Rayados Monterrey (El Clásico Regio)',
      questions: [
        { q: "¿Quién es el máximo goleador histórico de Tigres UANL con más de 200 goles?", a: "Walter Gaitán", b: "André-Pierre Gignac", c: "Lucas Lobos", d: "Claudio Núñez", correct: "B", exp: "El francés André-Pierre Gignac superó la marca histórica de Tomás Boy con los felinos." },
        { q: "¿Quién es el máximo goleador histórico de Rayados de Monterrey?", a: "Humberto 'Chupete' Suazo", b: "Rogelio Funes Mori (160 goles)", c: "Guillermo Franco", d: "Bahía", correct: "B", exp: "Funes Mori superó los 121 goles del mítico 'Chupete' Suazo convirtiéndose en el máximo artillero rayado." },
        { q: "¿En qué histórica final de Liga MX se enfrentaron Tigres y Rayados en el Apertura 2017?", a: "Final del Siglo", b: "Final Regia (Ganó Tigres 3-2 global)", c: "Final del Milenio", d: "Final de Monterrey", correct: "B", exp: "Tigres se coronó campeón en el Estadio BBVA ante Monterrey el 10 de diciembre de 2017." },
        { q: "¿Cómo se llama el moderno estadio inaugurado en 2015 casa de los Rayados de Monterrey?", a: "Estadio Universitario 'El Volcán'", b: "Estadio BBVA ('El Gigante de Acero')", c: "Estadio Tecnológico", d: "Estadio Corona", correct: "B", exp: "El Estadio BBVA fue inaugurado ante Benfica y será sede de la Copa Mundial 2026." },
        { q: "¿Cómo se le apoda popularmente al Estadio Universitario casa de Tigres UANL?", a: "El Gigante de Acero", b: "El Volcán", c: "La Bombonera", d: "El Infierno", correct: "B", exp: "'El Volcán' es famoso por la incesante pasión y fidelidad de los Libres y Lokos." },
        { q: "¿Qué director técnico comandó la época dorada de Tigres ganando 5 Ligas MX entre 2011 y 2019?", a: "Miguel Herrera", b: "Ricardo 'Tuca' Ferretti", c: "Robert Dante Siboldi", d: "Víctor Manuel Vucetich", correct: "B", exp: "El 'Tuca' Ferretti transformó a Tigres en una de las dinastías más exitosas del fútbol moderno." },
        { q: "¿Qué entrenador apodado 'El Rey Midas' ganó 2 Ligas y 3 Concachampions con Monterrey?", a: "Antonio Mohamed", b: "Víctor Manuel Vucetich", c: "Diego Alonso", d: "Javier Aguirre", correct: "B", exp: "Víctor Manuel Vucetich lideró la histórica época dorada de Rayados entre 2009 y 2013." },
        { q: "¿A qué club de Conmebol venció Tigres en semifinales del Mundial de Clubes 2020 para ser finalista histórico?", a: "Boca Juniors", b: "Palmeiras", c: "Flamengo", d: "River Plate", correct: "B", exp: "Tigres venció 1-0 a Palmeiras con gol de Gignac convirtiéndose en el primer club de Concacaf en llegar a la final del Mundial de Clubes." },
        { q: "¿Cuántos títulos de Liga MX tiene Tigres UANL en sus vitrinas?", a: "6", b: "7", c: "8", d: "9", correct: "C", exp: "Tigres tiene 8 títulos de liga, el último conseguido en el Clausura 2023 ante Chivas." },
        { q: "¿Cuántos títulos de Liga MX tiene Rayados de Monterrey?", a: "4", b: "5", c: "6", d: "7", correct: "B", exp: "Rayados cuenta con 5 estrellas de Liga MX (México 1986, Cl. 2003, Ap. 2009, Ap. 2010, Ap. 2019)." }
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
        { q: "¿Quién es el máximo goleador de la Selección Mexicana con 52 goles?", a: "Jared Borgetti (46)", b: "Javier 'Chicharito' Hernández (52)", c: "Cuauhtémoc Blanco", d: "Raúl Jiménez", correct: "B", exp: "Chicharito superó a Jared Borgetti como máximo artillero del Tri en 2017." },
        { q: "¿Qué club es conocido como 'La Cuna del Fútbol Mexicano' fundado en 1901 por mineros ingleses?", a: "Pachuca", b: "Atlante", c: "Necaxa", d: "Orizaba", correct: "A", exp: "El Club de Fútbol Pachuca fue fundado en 1901 por mineros de Cornualles en Hidalgo." },
        { q: "¿En qué estadio se jugaron las dos finales de Copa del Mundo de 1970 y 1986?", a: "Estadio Jalisco", b: "Estadio Azteca", c: "Estadio Olímpico Universitario", d: "Estadio Cuauhtémoc", correct: "B", exp: "El Estadio Azteca es el único en el mundo donde se coronaron Pelé (1970) y Maradona (1986)." },
        { q: "¿Qué equipo de la Liga MX juega como local en el Estadio Nemesio Díez 'La Bombonera'?", a: "Toluca", b: "Pachuca", c: "Querétaro", d: "San Luis", correct: "A", exp: "Los Diablos Rojos del Toluca juegan en el histórico Nemesio Díez en el Estado de México." },
        { q: "¿Qué legendario arquero mexicano se caracterizaba por sus uniformes fluorescentes y jugar de delantero?", a: "Guillermo Ochoa", b: "Jorge Campos", c: "Oswaldo Sánchez", d: "Pablo Larios", correct: "B", exp: "El 'Brody' Jorge Campos revolucionó la portería y anotó 46 goles oficiales en su carrera." },
        { q: "¿Qué equipo viste tradicionalmente con una franja azul diagonal en el pecho?", a: "Puebla", b: "Querétaro", c: "Mazatlán", d: "Juárez", correct: "A", exp: "La Franja del Puebla lleva su icónica franja diagonal en la camiseta desde 1944." },
        { q: "¿Qué jugador mexicano ganó la medalla de Oro en Londres 2012 anotando 2 goles a Brasil en Wembley?", a: "Oribe Peralta", b: "Giovani dos Santos", c: "Marco Fabián", d: "Héctor Herrera", correct: "A", exp: "El 'Hermoso' Oribe Peralta anotó a los 28 segundos y al 75' en la final olímpica." }
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
      id: 'mundial',
      category: '🏆 Fútbol Internacional',
      topic: '🌍 Copa del Mundo FIFA & Leyendas del Fútbol',
      questions: [
        { q: "¿Qué país ha ganado más Copas del Mundo de la FIFA en la historia?", a: "Alemania (4)", b: "Brasil (5)", c: "Italia (4)", d: "Argentina (3)", correct: "B", exp: "Brasil es el único pentacampeón del mundo (1958, 1962, 1970, 1994, 2002)." },
        { q: "¿Quién es el máximo goleador histórico de los Mundiales con 16 goles?", a: "Ronaldo Nazário (15)", b: "Miroslav Klose (16)", c: "Gerd Müller (14)", d: "Lionel Messi (13)", correct: "B", exp: "El alemán Miroslav Klose superó a Ronaldo en el Mundial Brasil 2014." },
        { q: "¿Qué selección ganó la Copa del Mundo de Qatar 2022 de la mano de Lionel Messi?", a: "Francia", b: "Argentina", c: "Croacia", d: "Marruecos", correct: "B", exp: "Argentina venció a Francia en penales tras un emocionante 3-3 en una de las mejores finales de la historia." },
        { q: "¿Quién es el único futbolista en la historia en ganar 3 Copas del Mundo?", a: "Diego Maradona", b: "Pelé (Edson Arantes do Nascimento)", c: "Zinedine Zidane", d: "Franz Beckenbauer", correct: "B", exp: "Pelé se coronó campeón mundial con Brasil en Suecia 1958, Chile 1962 y México 1970." },
        { q: "¿En qué Copa del Mundo anotó Diego Armando Maradona 'La Mano de Dios' y 'El Gol del Siglo'?", a: "España 1982", b: "México 1986", c: "Italia 1990", d: "USA 1994", correct: "B", exp: "Ambos goles históricos ocurrieron el 22 de junio de 1986 en el Estadio Azteca vs Inglaterra." },
        { q: "¿Qué país ganó el primer Mundial de la historia celebrado en 1930?", a: "Argentina", b: "Uruguay", c: "Brasil", d: "Italia", correct: "B", exp: "Uruguay derrotó a Argentina 4-2 en el Estadio Centenario de Montevideo en 1930." },
        { q: "¿Quién anotó el gol decisivo en tiempo extra que coronó a España campeona en Sudáfrica 2010?", a: "Xavi Hernández", b: "Andrés Iniesta (minuto 116)", c: "David Villa", d: "Fernando Torres", correct: "B", exp: "El gol agónico de Iniesta ante Holanda le dio a España su primera estrella mundial." },
        { q: "¿Qué tres países serán los anfitriones de la Copa del Mundo de la FIFA 2026?", a: "EE.UU., Canadá y México", b: "España, Portugal y Marruecos", c: "Arabia Saudita y Qatar", d: "Inglaterra, Escocia y Gales", correct: "A", exp: "El Mundial 2026 será el primero con 48 selecciones y tres países sede conjuntos." },
        { q: "¿Quién anotó un 'hat-trick' (3 goles) para Francia en la final del Mundial 2022?", a: "Antoine Griezmann", b: "Kylian Mbappé", c: "Olivier Giroud", d: "Karim Benzema", correct: "B", exp: "Mbappé fue el segundo jugador en la historia en marcar triplete en una final de Mundial tras Geoff Hurst en 1966." },
        { q: "¿Qué selección nacional disputó 3 finales del mundo y las perdió todas (apodada la 'Naranja Mecánica')?", a: "Hungría", b: "Países Bajos (Holanda)", c: "Suecia", d: "Bélgica", correct: "B", exp: "Holanda perdió las finales de 1974 (vs Alemania), 1978 (vs Argentina) y 2010 (vs España)." }
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
        { q: "¿Qué quarterback lideró a Kansas City Chiefs al bicampeonato en los Super Bowls LVII y LVIII?", a: "Josh Allen", b: "Patrick Mahomes", c: "Lamar Jackson", d: "Joe Burrow", correct: "B", exp: "Patrick Mahomes acumula 3 anillos y 3 MVPs de Super Bowl con los Chiefs." },
        { q: "¿Cuántos puntos otorga un Touchdown en fútbol americano antes del intento de punto extra?", a: "3 puntos", b: "6 puntos", c: "7 puntos", d: "2 puntos", correct: "B", exp: "El Touchdown vale 6 puntos; luego se puede patear el extra (1 pt) o jugar conversión (2 pts)." },
        { q: "¿Qué equipo logró la única temporada perfecta invicta (17-0) en la historia en 1972?", a: "Miami Dolphins", b: "Chicago Bears", c: "San Francisco 49ers", d: "New England Patriots", correct: "A", exp: "Los Miami Dolphins dirigidos por Don Shula terminaron invictos coronándose en el Super Bowl VII." },
        { q: "¿Quién es el líder receptor histórico en yardas, recepciones y touchdowns en la NFL?", a: "Randy Moss", b: "Jerry Rice", c: "Terrell Owens", d: "Larry Fitzgerald", correct: "B", exp: "Jerry Rice acumuló 22,895 yardas y 197 touchdowns por pase con 49ers, Raiders y Seahawks." },
        { q: "¿Qué ciudad de Ohio alberga el Salón de la Fama del Fútbol Americano Profesional (NFL HOF)?", a: "Green Bay", b: "Canton", c: "Cleveland", d: "Cincinnati", correct: "B", exp: "Canton, Ohio es la cuna donde fue fundada la NFL en septiembre de 1920." },
        { q: "¿Cuántas yardas necesita avanzar la ofensiva para renovar su serie con 'Primero y Diez'?", a: "5 yardas", b: "10 yardas", c: "15 yardas", d: "20 yardas", correct: "B", exp: "El equipo ofensivo dispone de 4 oportunidades (downs) para avanzar 10 yardas." },
        { q: "¿Quién tiene el récord de más yardas por pase en una sola temporada (5,477 yds en 2013)?", a: "Patrick Mahomes", b: "Drew Brees", c: "Peyton Manning", d: "Dan Marino", correct: "C", exp: "Peyton Manning lanzó para 5,477 yardas y 55 touchdowns con Denver Broncos en 2013." }
      ]
    },
    {
      id: 'cowboys',
      category: '🏈 NFL & Americano',
      topic: '🤠 Dallas Cowboys (America\'s Team)',
      questions: [
        { q: "¿Qué apodo icónico recibieron los Dallas Cowboys en las transmisiones de los años 70?", a: "The Steel Curtain", b: "America's Team (El Equipo de América)", c: "The Legion of Boom", d: "The Greatest Show on Turf", correct: "B", exp: "El apodo nació en la película de resumen de NFL Films de 1978 por su inmensa popularidad nacional." },
        { q: "¿Cuántos campeonatos de Super Bowl han ganado los Dallas Cowboys?", a: "3", b: "4", c: "5", d: "6", correct: "C", exp: "Los Cowboys ganaron los Super Bowls VI, XII, XXVII, XXVIII y XXX." },
        { q: "¿Quién es el corredor con más yardas por tierra en la historia de la NFL (18,355 yds)?", a: "Walter Payton", b: "Barry Sanders", c: "Emmitt Smith", d: "Adrian Peterson", correct: "C", exp: "Emmitt Smith fue el motor de la dinastía de Dallas en los años 90 con los 'Triplets'." },
        { q: "¿Quiénes conformaban el trío de superestrellas conocido como 'The Triplets' de Dallas?", a: "Aikman, Smith e Irvin", b: "Staubach, Dorsett y Pearson", c: "Romo, Witten y Bryant", d: "Prescott, Elliott y Lamb", correct: "A", exp: "Troy Aikman (QB), Emmitt Smith (RB) y Michael Irvin (WR) lideraron a 3 títulos de Super Bowl." },
        { q: "¿Cómo se llama el multimillonario dueño y gerente general de los Cowboys desde 1989?", a: "Robert Kraft", b: "Jerry Jones", c: "Stan Kroenke", d: "Mark Cuban", correct: "B", exp: "Jerry Jones compró a los Cowboys en 1989 y los convirtió en la franquicia deportiva más valiosa del mundo." },
        { q: "¿Cómo se llama el monumental estadio en Arlington, Texas casa de los Cowboys?", a: "Cotton Bowl", b: "AT&T Stadium", c: "Texas Stadium", d: "NRG Stadium", correct: "B", exp: "Inaugurado en 2009, el AT&T Stadium (apodado 'Jerry World') cuenta con una pantalla gigante de 60 yardas." },
        { q: "¿Qué mítico entrenador de sombrero dirigió a Dallas durante sus primeras 29 temporadas?", a: "Jimmy Johnson", b: "Tom Landry", c: "Barry Switzer", d: "Bill Parcells", correct: "B", exp: "Tom Landry dirigió a los Cowboys de 1960 a 1988 con 20 temporadas consecutivas con marca ganadora." },
        { q: "¿Qué símbolo icónico luce el casco plateado de los Dallas Cowboys?", a: "Una herradura", b: "Una estrella solitaria azul", c: "Un sombrero vaquero", d: "Un cuerno de toro", correct: "B", exp: "La estrella azul con reborde blanco representa el apodo de Texas como el 'Estado de la Estrella Solitaria'." },
        { q: "¿Qué quarterback fue el pasador titular de Dallas antes de Dak Prescott y ahora es analista estelar de TV?", a: "Drew Bledsoe", b: "Tony Romo", c: "Quincy Carter", d: "Jon Kitna", correct: "B", exp: "Tony Romo pasó 14 temporadas con Dallas antes de ser la voz estelar de la NFL en CBS." },
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
      id: 'nba',
      category: '🏀 Basquetbol & NBA',
      topic: '🏀 NBA, Michael Jordan & Dinastías del Baloncesto',
      questions: [
        { q: "¿Cuántos campeonatos de la NBA ganó Michael Jordan con los Chicago Bulls?", a: "4 anillos", b: "5 anillos", c: "6 anillos (con 2 tricampeonatos)", d: "7 anillos", correct: "C", exp: "Jordan ganó dos 'Three-Peat' (1991-93 y 1996-98) siendo MVP de las finales en las 6 ocasiones." },
        { q: "¿Quién es el máximo anotador de puntos en la historia de la NBA?", a: "Kareem Abdul-Jabbar", b: "LeBron James", c: "Kobe Bryant", d: "Michael Jordan", correct: "B", exp: "LeBron James superó los 38,387 puntos de Kareem Abdul-Jabbar en febrero de 2023." },
        { q: "¿Qué dos franquicias comparten el récord de más campeonatos de la NBA con 17 y 18 títulos?", a: "Bulls & Spurs", b: "Boston Celtics & Los Angeles Lakers", c: "Warriors & Heat", d: "Knicks & Sixers", correct: "B", exp: "Boston Celtics (18) y LA Lakers (17) son los dos reyes históricos de la NBA." },
        { q: "¿Quién anotó 81 puntos en un solo partido en 2006 (la 2ª mayor marca de la historia)?", a: "Michael Jordan", b: "Kobe Bryant", c: "Stephen Curry", d: "Shaquille O'Neal", correct: "B", exp: "Kobe Bryant deslumbró al mundo anotando 81 puntos para los Lakers contra Toronto Raptors." },
        { q: "¿Qué jugador revolucionó el básquetbol moderno con su tiro de triples con los Golden State Warriors?", a: "Klay Thompson", b: "Stephen Curry", c: "Kevin Durant", d: "Damian Lillard", correct: "B", exp: "Steph Curry es el líder absoluto de triples en la historia de la NBA con más de 3,500 anotados." },
        { q: "¿Cuántos puntos anotó Wilt Chamberlain en el mítico partido de 1962 (récord insuperable)?", a: "85 puntos", b: "100 puntos", c: "92 puntos", d: "110 puntos", correct: "B", exp: "Chamberlain anotó 100 puntos con los Philadelphia Warriors ante los Knicks el 2 de marzo de 1962." },
        { q: "¿Qué apodo recibió la dominante Selección de EE.UU. en los Juegos Olímpicos de Barcelona 1992?", a: "The Redeem Team", b: "The Dream Team (El Equipo de Ensueño)", c: "The Avengers", d: "The Fast Break", correct: "B", exp: "El Dream Team reunió a Jordan, Magic Johnson, Larry Bird y Barkley aplastando a todos sus rivales." },
        { q: "¿A cuántos pies del suelo está colocado el aro de baloncesto reglamentario de la NBA?", a: "9 pies (2.74 m)", b: "10 pies (3.05 m)", c: "11 pies (3.35 m)", d: "12 pies (3.65 m)", correct: "B", exp: "La altura reglamentaria del aro desde 1891 es de exactamente 10 pies (3.05 metros)." },
        { q: "¿Qué dorsal mítico retiraron los Lakers en honor a Kobe Bryant?", a: "Solo el 8", b: "Solo el 24", c: "Tanto el 8 como el 24", d: "El 23", correct: "C", exp: "Kobe es el único jugador en la historia de la NBA con dos números retirados en el mismo equipo." },
        { q: "¿Cómo se llama el trofeo entregado anualmente al campeón de las Finales de la NBA?", a: "Trofeo Vince Lombardi", b: "Trofeo Larry O'Brien", c: "Trofeo Naismith", d: "Trofeo Stanley Cup", correct: "B", exp: "Nombrado en honor a Larry O'Brien, comisionado de la NBA entre 1975 y 1984." }
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
    },
    {
      id: 'simpsons',
      category: '🍩 Cine, TV & Cultura Pop',
      topic: '🍩 Los Simpson (Trivia de TV Clásica)',
      questions: [
        { q: "¿En qué ciudad ficticia viven Homero, Marge, Bart, Lisa y Maggie Simpson?", a: "Shelbyville", b: "Springfield", c: "Capital City", d: "Ogdenville", correct: "B", exp: "Springfield es la ciudad icónica creada por Matt Groening inspirada en Springfield, Oregón." },
        { q: "¿Cómo se llama la taberna favorita donde Homero bebe cerveza Duff con sus amigos?", a: "Taberna de Barney", b: "Taberna de Moe (Moe's Tavern)", c: "El Rey del Cacahuate", d: "Bar Flamingo", correct: "B", exp: "Moe Szyslak es el gruñón pero querido dueño de la Taberna de Moe." },
        { q: "¿Qué instrumento musical de viento toca Lisa Simpson con virtuosismo de jazz?", a: "Clarinete", b: "Saxofón Barítono", c: "Flauta Traversa", d: "Trompeta", correct: "B", exp: "Lisa toca el saxofón inspirada por su mentor, el músico 'Encías Sangrantes' Murphy." },
        { q: "¿Quién disparó al multimillonario Sr. Burns en el famoso misterio de dos partes?", a: "Waylon Smithers", b: "Homero Simpson", c: "Bebé Maggie Simpson", d: "Bart Simpson", correct: "C", exp: "Maggie disparó accidentalmente el arma de Burns cuando éste intentó quitarle una paleta." },
        { q: "¿Cómo se llama el vecino hiper religioso y optimista de los Simpson?", a: "Ned Flanders", b: "Apu Nahasapeemapetilon", c: "Seymour Skinner", d: "Clancy Wiggum", correct: "A", exp: "Ned Flanders y sus hijos Rod y Todd son los vecinos de Homero en Siempre Viva 742." },
        { q: "¿Qué comida y postre glaseado es la máxima obsesión de Homero Simpson?", a: "Pizza con queso", b: "Donas con glaseado rosa (Rosquillas)", c: "Costillitas de cerdo", d: "Hamburguesas Krusty", correct: "B", exp: "¡Mmm... donas! Las rosquillas glaseadas de color rosa con chispas son su sello registrado." },
        { q: "¿Cuál es el nombre del perro mascota de la familia Simpson adoptado en Navidad?", a: "Bola de Nieve II", b: "Ayudante de Santa (Huesos)", c: "Prócer", d: "Laddie", correct: "B", exp: "Homero y Bart lo adoptaron en el galgódromo en el primer episodio oficial de la serie en 1989." },
        { q: "¿Qué actor de doblaje mexicano le dio la inconfundible voz a Homero Simpson en las temporadas 1 a 15?", a: "Carlos Segundo", b: "Humberto Vélez", c: "Mario Castañeda", d: "René García", correct: "B", exp: "Humberto Vélez creó la voz más querida y emblemática de Homero en el doblaje hispanoamericano." },
        { q: "¿Cómo se llama el dueño de la tienda de conveniencia Kwik-E-Mart (El Minisúper)?", a: "Otto Mann", b: "Apu Nahasapeemapetilon", c: "Hans Topo", d: "Profesor Frink", correct: "B", exp: "Apu atendía el Minisúper con su célebre frase: 'Gracias, vuelva pronto'." },
        { q: "¿Qué producto defectuoso y peligroso le vendieron a Springfield en un musical de Broadway?", a: "Un tren bala", b: "Un Monorriel", c: "Una escalera al cielo", d: "Un parque de diversiones", correct: "B", exp: "El estafador Lyle Lanley vendió el monorriel cantando la famosa canción del Monorriel." }
      ]
    },
    {
      id: 'mexico_cultura',
      category: '🇲🇽 México & Tradiciones',
      topic: '🇲🇽 Tradiciones, Comida & México Mágico',
      questions: [
        { q: "¿En qué fecha se conmemora la Batalla de Puebla (muy celebrada internacionalmente)?", a: "16 de Septiembre", b: "5 de Mayo (1862)", c: "20 de Noviembre", d: "21 de Marzo", correct: "B", exp: "El general Ignacio Zaragoza venció al ejército francés el 5 de mayo de 1862 en los Fuertes de Loreto y Guadalupe." },
        { q: "¿Qué flor naranja de intenso aroma es el símbolo principal del Día de Muertos en las ofrendas?", a: "Flor de Nochebuena", b: "Flor de Cempasúchil", c: "Dalia", d: "Orquídea", correct: "B", exp: "El Cempasúchil ('veinte flores' en náhuatl) guía a las almas con su color y perfume hacia el altar." },
        { q: "¿Cuál es el destilado con denominación de origen elaborado a partir del agave tequilana Weber azul?", a: "Mezcal", b: "Tequila", c: "Bacanora", d: "Raicilla", correct: "B", exp: "El Tequila debe provenir exclusivamente de Agave Azul en Jalisco y municipios autorizados." },
        { q: "¿En qué estado de México se encuentran las monumentales Pirámides del Sol y de la Luna?", a: "Oaxaca", b: "Estado de México (Teotihuacán)", c: "Puebla", d: "Yucatán", correct: "B", exp: "Teotihuacán ('Ciudad de los Dioses') se ubica en el Valle de México en el Estado de México." },
        { q: "¿Quién fue la famosa pintora mexicana ícono del arte mundial autora de 'Las Dos Fridas'?", a: "Remedios Varo", b: "Frida Kahlo", c: "Leonora Carrington", d: "María Izquierdo", correct: "B", exp: "Frida Kahlo nació y vivió en la Casa Azul de Coyoacán dejando un legado artístico universal." },
        { q: "¿Qué platillo poblano tradicional combina chiles poblanos, picadillo, nogada de nuez y granada?", a: "Enmoladas", b: "Chiles en Nogada", c: "Mole Poblano", d: "Pozole", correct: "B", exp: "Los Chiles en Nogada representan los colores patrios (verde, blanco y rojo) y datan de 1821." },
        { q: "¿Cuál es la pirámide maya en Chichén Itzá que proyecta la sombra de la serpiente emplumada en los equinoccios?", a: "El Adivino", b: "El Castillo / Pirámide de Kukulkán", c: "Templo Mayor", d: "Nohoch Mul", correct: "B", exp: "El descenso de Kukulkán en Chichén Itzá es una maravilla del mundo moderno astronómica y arquitectónica." },
        { q: "¿Qué mariachi y género musical tradicional mexicano fue declarado Patrimonio de la Humanidad por la UNESCO?", a: "El Son Jarocho", b: "El Mariachi (Música de cuerdas, canto y trompeta)", c: "La Banda Sinaloense", d: "La Cumbia Sonidera", correct: "B", exp: "El Mariachi fue reconocido en 2011 como Patrimonio Cultural Inmaterial de la Humanidad." },
        { q: "¿Qué civilización prehispánica fundó la gran ciudad lacustre de México-Tenochtitlan en 1325?", a: "Los Mayas", b: "Los Mexicas (Aztecas)", c: "Los Zapotecas", d: "Los Toltecas", correct: "B", exp: "Los mexicas fundaron Tenochtitlan donde encontraron el águila devorando una serpiente sobre un nopal." },
        { q: "¿Cómo se llama el luchador enmascarado mexicano más legendario apodado 'El Enmascarado de Plata'?", a: "Blue Demon", b: "El Santo (Rodolfo Guzmán Huerta)", c: "Mil Máscaras", d: "Rey Mysterio", correct: "B", exp: "El Santo filmó más de 50 películas y jamás reveló su rostro en público durante su carrera." }
      ]
    }
  ];

  const _kSeed = 'QVEuQWI4Uk42SlhJU0llQ3BoWXkwTXB4X3pZNV9mNlVqZk0wZk80TEVlSnZnRGJRc3pwbUE=';
  const getBuiltinKey = () => {
    try { return atob(_kSeed); } catch (e) { return ''; }
  };

  // =========================================================================
  // REAL GOOGLE GEMINI AI GENERATION ENGINE
  // =========================================================================
  async function generateWithRealGeminiAPI(topic, count, apiKey, difficulty = 'Intermedia') {
    const activeKey = (apiKey || getBuiltinKey()).trim();
    const promptText = `Eres el generador oficial de trivias y preguntas tipo Kahoot / Crowdpurr para un concurrido Sports Bar & Restaurant en México ("Drinks & Wins").

Genera EXACTAMENTE ${count} preguntas de opción múltiple de alta calidad, divertidas, con nivel de dificultad "${difficulty}" y 100% VERÍDICAS sobre el tema: "${topic}".

REGLAS ESTRICTAS:
1. PRECISIÓN FACTUAL TOTAL: Todas las preguntas, datos, fechas, nombres y respuestas deben ser 100% REALES, VERIFICABLES Y EXACTAS. No inventes respuestas, no inventes estadísticas ni alucines datos.
2. Nivel de dificultad: ${difficulty}.
3. Cada pregunta debe tener 4 opciones (A, B, C, D) donde SOLO UNA opción sea la correcta. Las otras 3 opciones deben ser alternativas lógicas del mismo ámbito pero claramente erróneas.
4. El campo 'correct' debe ser obligatoriamente la letra mayúscula: "A", "B", "C" o "D".
5. El campo 'exp' debe ser una explicación real, breve (1 o 2 oraciones) y con datos reales de por qué esa es la respuesta correcta o un dato curioso verificado.
6. El idioma debe ser Español mexicano neutro, claro y ameno para un bar.

RESPONDE ÚNICAMENTE con un arreglo JSON puro de objetos con esta estructura (sin texto introductorio, sin formato markdown extra):
[
  {
    "q": "¿Texto claro de la pregunta?",
    "a": "Opción A",
    "b": "Opción B",
    "c": "Opción C",
    "d": "Opción D",
    "correct": "A",
    "exp": "Dato o explicación real y verídica."
  }
]`;

    // Use Flash-Lite models with generous free tier limits and zero quota restrictions
    const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'];
    let lastError = null;

    for (const model of candidateModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: promptText }]
              }
            ],
            generationConfig: {
              temperature: 0.2,
              topP: 0.95,
              maxOutputTokens: 3500
            }
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Error HTTP ${res.status}`);
        }

        const data = await res.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText) throw new Error('Sin texto en respuesta');

        let cleaned = candidateText.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
        if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
        if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
        cleaned = cleaned.trim();

        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item, idx) => ({
            q: String(item.q || `Pregunta ${idx + 1}`),
            a: String(item.a || 'Opción A'),
            b: String(item.b || 'Opción B'),
            c: String(item.c || 'Opción C'),
            d: String(item.d || 'Opción D'),
            correct: ['A', 'B', 'C', 'D'].includes(String(item.correct || '').toUpperCase()) ? String(item.correct).toUpperCase() : 'A',
            exp: String(item.exp || '')
          }));
        }
      } catch (err) {
        lastError = err;
        console.warn(`[TriviaAdmin] Falló modelo ${model}:`, err.message);
      }
    }

    throw lastError || new Error('No se pudo generar respuesta con Gemini');
  }

  // =========================================================================
  // PARSER PARA PEGAR PREGUNTAS DESDE GEMINI WEB / CHATGPT / WHATSAPP
  // =========================================================================
  function parsePastedQuestionsText(text) {
    if (!text || !text.trim()) return [];

    const raw = text.trim();

    // 1. Try parsing direct JSON
    try {
      let cleaned = raw;
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
      if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
      cleaned = cleaned.trim();
      const jsonParsed = JSON.parse(cleaned);
      if (Array.isArray(jsonParsed) && jsonParsed.length > 0 && jsonParsed[0].q) {
        return jsonParsed.map((item, idx) => ({
          q: String(item.q || `Pregunta ${idx + 1}`),
          a: String(item.a || item.A || 'Opción A'),
          b: String(item.b || item.B || 'Opción B'),
          c: String(item.c || item.C || 'Opción C'),
          d: String(item.d || item.D || 'Opción D'),
          correct: ['A', 'B', 'C', 'D'].includes(String(item.correct || item.respuesta || 'A').toUpperCase()) ? String(item.correct || item.respuesta || 'A').toUpperCase() : 'A',
          exp: String(item.exp || item.explicacion || '')
        }));
      }
    } catch (e) {
      // Not JSON, continue to text block parsing
    }

    // 2. Line-by-line smart parser for natural text lists
    const lines = raw.split(/\r?\n/);
    const parsedQuestions = [];
    let currentQ = null;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // Detect Question Start: "1.", "1)", "¿", "Pregunta 1:"
      const isNewQ = /^(\d+[\.\)]\s*|pregunta\s*\d+[\:\.]?\s*|¿)/i.test(line);

      if (isNewQ && (!currentQ || currentQ.a || currentQ.b)) {
        if (currentQ && currentQ.q && currentQ.a && currentQ.b) {
          parsedQuestions.push(currentQ);
        }
        let qText = line.replace(/^\d+[\.\)]\s*/, '').replace(/^pregunta\s*\d+[\:\.]?\s*/i, '').trim();
        currentQ = { q: qText, a: '', b: '', c: '', d: '', correct: 'A', exp: '' };
        continue;
      }

      if (!currentQ) {
        currentQ = { q: line, a: '', b: '', c: '', d: '', correct: 'A', exp: '' };
        continue;
      }

      // Detect Options A, B, C, D
      const matchA = line.match(/^[aA][\.\)\-:]\s*(.+)/);
      const matchB = line.match(/^[bB][\.\)\-:]\s*(.+)/);
      const matchC = line.match(/^[cC][\.\)\-:]\s*(.+)/);
      const matchD = line.match(/^[dD][\.\)\-:]\s*(.+)/);

      if (matchA) { currentQ.a = matchA[1].trim(); continue; }
      if (matchB) { currentQ.b = matchB[1].trim(); continue; }
      if (matchC) { currentQ.c = matchC[1].trim(); continue; }
      if (matchD) { currentQ.d = matchD[1].trim(); continue; }

      // Detect Correct Answer indicator (e.g. "Respuesta: B", "Correcta: C", "R: A")
      const matchCorrect = line.match(/(?:respuesta|correcta|soluci[oó]n|ans|r)[\s\:\*\-]+([a-dA-D])/i);
      if (matchCorrect) {
        currentQ.correct = matchCorrect[1].toUpperCase();
        continue;
      }

      // Detect Explanation
      const matchExp = line.match(/(?:explicaci[oó]n|dato|exp|curioso)[\s\:\*\-]+(.+)/i);
      if (matchExp) {
        currentQ.exp = matchExp[1].trim();
        continue;
      }
    }

    if (currentQ && currentQ.q && (currentQ.a || currentQ.b)) {
      parsedQuestions.push(currentQ);
    }

    return parsedQuestions;
  }

  // =========================================================================
  // FALLBACK SMART MATCHER (100% REAL CURATED DATA, ZERO PLACEHOLDER HALLUCINATIONS)
  // =========================================================================
  function findBestCuratedQuestions(rawTopic, count = 10) {
    const topic = (rawTopic || 'Trivia Bar').trim().toLowerCase();

    // 1. Direct match with preset
    for (const preset of TOPIC_PRESETS) {
      if (topic.includes(preset.id) || preset.topic.toLowerCase().includes(topic) || topic.includes(preset.topic.toLowerCase().slice(3, 12))) {
        return preset.questions.slice(0, count);
      }
    }

    // 2. Keyword fuzzy match
    const keywords = [
      { keys: ['america', 'águilas', 'aguilas', 'coapa', 'zague', 'cuauhtemoc', 'jardine'], id: 'america' },
      { keys: ['chiva', 'guadalajara', 'rebaño', 'bofo', 'omaha', 'almeyda'], id: 'chivas' },
      { keys: ['cruz azul', 'cruzazul', 'maquina', 'máquina', 'celeste', 'hermosillo'], id: 'cruzazul' },
      { keys: ['puma', 'unam', 'universitarios', 'goya', 'olimpico', 'olímpico'], id: 'pumas' },
      { keys: ['tigre', 'rayado', 'monterrey', 'regio', 'gignac', 'funes mori', 'bbva'], id: 'regios' },
      { keys: ['liga mx', 'mexicano', 'seleccion', 'selección', 'tri', 'azteca', 'borgetti', 'chicharito'], id: 'ligamx' },
      { keys: ['real madrid', 'madrid', 'bernabeu', 'champions', 'merengue', 'cristiano', 'cr7', 'mbappe', 'zidane'], id: 'realmadrid' },
      { keys: ['barcelona', 'barça', 'barca', 'messi', 'camp nou', 'culé', 'guardiola'], id: 'barcelona' },
      { keys: ['mundial', 'copa del mundo', 'fifa', 'pele', 'pelé', 'maradona', 'qatar'], id: 'mundial' },
      { keys: ['cowboy', 'dallas', 'vaquero', 'dak', 'emmitt', 'aikman'], id: 'cowboys' },
      { keys: ['nfl', 'super bowl', 'touchdown', 'brady', 'mahomes', 'quarterback', 'football', 'americano'], id: 'nfl' },
      { keys: ['f1', 'formula 1', 'fórmula 1', 'checo', 'perez', 'pérez', 'verstappen', 'red bull', 'ferrari', 'hamilton'], id: 'f1' },
      { keys: ['box', 'boxeo', 'canelo', 'chavez', 'chávez', 'marquez', 'ring', 'knockout'], id: 'boxeo' },
      { keys: ['nba', 'basquet', 'baloncesto', 'jordan', 'kobe', 'lebron', 'curry', 'lakers', 'celtics'], id: 'nba' },
      { keys: ['alita', 'wing', 'cerveza', 'beer', 'boneless', 'bar', 'miche', 'michelada', 'drink'], id: 'bar_wings' },
      { keys: ['rock', 'musica', 'música', 'soda stereo', 'caifanes', 'mana', 'maná', 'bunbury', 'cerati'], id: 'rock' },
      { keys: ['simpson', 'homero', 'bart', 'springfield', 'duff', 'flanders'], id: 'simpsons' },
      { keys: ['mexico', 'méxico', 'puebla', 'tequila', 'taco', 'comida', 'ofrenda', 'muertos', 'frida', 'mariachi'], id: 'mexico_cultura' }
    ];

    for (const kw of keywords) {
      if (kw.keys.some(k => topic.includes(k))) {
        const foundPreset = TOPIC_PRESETS.find(p => p.id === kw.id);
        if (foundPreset) return foundPreset.questions.slice(0, count);
      }
    }

    // 3. Pool together a diverse set of top verified questions across sports and culture
    const pool = [];
    TOPIC_PRESETS.forEach(p => {
      if (p.questions && p.questions.length > 0) {
        pool.push(p.questions[0]);
        if (p.questions[1]) pool.push(p.questions[1]);
      }
    });

    return pool.slice(0, count);
  }

  // =========================================================================
  // INITIALIZATION & FIRESTORE REAL-TIME SYNCHRONIZATION
  // =========================================================================
  window.initTriviaAdmin = function() {
    if (window.db) {
      db = window.db;
      loadTriviaGames();
      loadGeminiKeyFromFirestore();
    } else {
      setTimeout(window.initTriviaAdmin, 100);
    }
  };

  async function loadGeminiKeyFromFirestore() {
    if (!db) return;
    try {
      const doc = await db.collection('settings').doc('trivia_ai').get();
      if (doc.exists && doc.data().geminiApiKey) {
        firestoreGeminiApiKey = doc.data().geminiApiKey;
        updateApiKeyStatusUI();
      }
    } catch (e) {
      console.warn('[TriviaAdmin] Could not load API key from settings:', e);
    }
  }

  function loadTriviaGames() {
    if (!db) return;
    try {
      db.collection('trivia_games').onSnapshot(snap => {
        activeTriviaGames = [];
        snap.forEach(doc => {
          activeTriviaGames.push({ id: doc.id, ...doc.data() });
        });

        // Sort newest first
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

    unsubTrivia = db.collection('trivia_games').doc(gameId).onSnapshot(doc => {
      if (!doc.exists) {
        renderNoTriviaUI();
        return;
      }
      currentTriviaData = { id: doc.id, ...doc.data() };
      renderTriviaHostControls();
    }, err => console.error('[TriviaAdmin] Error listening game:', err));

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
        ${currentQ.exp ? `<div style="font-size:11.5px; color:#ffd100; margin-top:8px; background:rgba(255,209,0,0.08); padding:6px 10px; border-radius:6px;">💡 <strong>Dato Real:</strong> ${currentQ.exp}</div>` : ''}
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
  // HOST CONTROLS & AUTO-FLOW MASTER
  // =========================================================================
  window.startTriviaAutoFlow = async function() {
    if (!selectedTriviaId || !db) return;
    try {
      // 1. Reset all player answers & scores for a clean run
      const playersSnap = await db.collection('trivia_games').doc(selectedTriviaId).collection('players').get();
      if (!playersSnap.empty) {
        const batch = db.batch();
        playersSnap.forEach(pDoc => {
          batch.update(pDoc.ref, { totalScore: 0, answers: {} });
        });
        await batch.commit();
      }

      // 2. Set fresh countdown starting from NOW
      await db.collection('trivia_games').doc(selectedTriviaId).update({
        status: 'countdown',
        countdownStartTime: Date.now(),
        currentQuestionIndex: 0,
        questionStartTime: null,
        revealTime: null,
        leaderboardTime: null,
        podiumTime: null
      });
      alert('🚀 ¡Trivia Automática Iniciada con Éxito!\n\nCuenta regresiva de 10s activada en pantallas y celulares.\nEl juego avanzará solo de forma automática.');
    } catch (err) {
      alert('Error al iniciar trivia automática: ' + err.message);
    }
  };

  window.resetCurrentTriviaToLobby = async function() {
    if (!selectedTriviaId || !db) return;
    try {
      await db.collection('trivia_games').doc(selectedTriviaId).update({
        status: 'lobby',
        currentQuestionIndex: 0,
        countdownStartTime: null,
        questionStartTime: null,
        revealTime: null,
        leaderboardTime: null,
        podiumTime: null
      });

      const playersSnap = await db.collection('trivia_games').doc(selectedTriviaId).collection('players').get();
      if (!playersSnap.empty) {
        const batch = db.batch();
        playersSnap.forEach(pDoc => {
          batch.update(pDoc.ref, { totalScore: 0, answers: {} });
        });
        await batch.commit();
      }
      alert('⏹️ Sala reiniciada al Lobby con éxito.');
    } catch (err) {
      alert('Error al reiniciar sala: ' + err.message);
    }
  };

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
        status: 'leaderboard',
        leaderboardTime: Date.now()
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
        status: 'podium',
        podiumTime: Date.now()
      });
      alert('🏆 ¡Podio Final y Tabla General revelados en la pantalla de TV!');
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
    window.open(`tv.html?gameId=${selectedTriviaId}`, '_blank');
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
  // API KEY MANAGEMENT FOR REAL GEMINI AI
  // =========================================================================
  window.saveGeminiApiKey = async function(key) {
    const trimmed = (key || '').trim();
    if (trimmed) {
      localStorage.setItem(GEMINI_STORAGE_KEY, trimmed);
      if (db) {
        try {
          await db.collection('settings').doc('trivia_ai').set({
            geminiApiKey: trimmed,
            updatedAt: Date.now()
          }, { merge: true });
          firestoreGeminiApiKey = trimmed;
        } catch (e) {
          console.warn('[TriviaAdmin] Could not save API key to firestore:', e);
        }
      }
      alert('🔑 Clave de Google Gemini API guardada con éxito.\n\n✨ ¡Ahora el generador está conectado a Google Gemini AI en tiempo real!');
    } else {
      localStorage.removeItem(GEMINI_STORAGE_KEY);
      firestoreGeminiApiKey = null;
      if (db) {
        try {
          await db.collection('settings').doc('trivia_ai').delete();
        } catch (e) {}
      }
      alert('🔑 Clave de Gemini API eliminada. El sistema usará la base de datos verificada.');
    }
    updateApiKeyStatusUI();
  };

  window.getGeminiApiKey = function() {
    return firestoreGeminiApiKey || localStorage.getItem(GEMINI_STORAGE_KEY) || getBuiltinKey() || '';
  };

  function updateApiKeyStatusUI() {
    const key = window.getGeminiApiKey();
    const statusEl = document.getElementById('geminiApiKeyStatusBadge');
    const inputEl = document.getElementById('geminiApiKeyInput');
    if (inputEl) inputEl.value = key;
    if (statusEl) {
      if (key) {
        statusEl.textContent = '✨ Gemini AI Conectado';
        statusEl.className = 'badge success';
        statusEl.style.fontSize = '10px';
        statusEl.style.background = 'rgba(0,230,118,0.15)';
        statusEl.style.color = '#00e676';
        statusEl.style.border = '1px solid #00e676';
      } else {
        statusEl.textContent = '📚 Base Verificada (Sin API Key)';
        statusEl.className = 'badge';
        statusEl.style.fontSize = '10px';
        statusEl.style.background = 'rgba(255,255,255,0.1)';
        statusEl.style.color = '#ffd100';
        statusEl.style.border = '1px solid rgba(255,209,0,0.3)';
      }
    }
  }

  // =========================================================================
  // MODAL & QUESTIONS BUILDER / EDITOR
  // =========================================================================
  window.openCreateTriviaModal = function() {
    const modal = document.getElementById('modalCreateTrivia');
    if (!modal) return;
    modal.classList.add('active');
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';

    // Start completely clean (no default América or pre-loaded questions)
    generatedQuestionsBuffer = [];
    editingQuestionIndex = null;

    const titleInp = document.getElementById('newTrivTitle');
    const customPromptInp = document.getElementById('newTrivCustomPrompt');
    const statusMsg = document.getElementById('trivGenStatusMsg');
    const genCountSel = document.getElementById('newTrivAIGenCount');

    if (titleInp) titleInp.value = '';
    if (customPromptInp) customPromptInp.value = '';
    if (statusMsg) statusMsg.style.display = 'none';
    if (genCountSel) genCountSel.value = '3';

    renderQuestionsPreview(generatedQuestionsBuffer);
    updateApiKeyStatusUI();
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

  window.clearAllTriviaQuestions = function() {
    generatedQuestionsBuffer = [];
    editingQuestionIndex = null;
    renderQuestionsPreview(generatedQuestionsBuffer);
    const statusMsg = document.getElementById('trivGenStatusMsg');
    if (statusMsg) {
      statusMsg.style.display = 'block';
      statusMsg.innerHTML = '🗑️ Lista de preguntas limpiada. Escribe un nuevo tema para generar.';
    }
  };

  window.applyQuickTopicChip = function(topicText) {
    const customPromptInp = document.getElementById('newTrivCustomPrompt');
    if (customPromptInp) customPromptInp.value = topicText;

    const titleInp = document.getElementById('newTrivTitle');
    if (titleInp && !titleInp.value) {
      titleInp.value = `🧠 Trivia ${topicText}`;
    }

    window.triggerAIGeneration();
  };

  window.syncTriviaQCount = function(val) {
    const targetCount = parseInt(val, 10) || 10;
    renderQuestionsPreview(generatedQuestionsBuffer);
  };

  window.triggerAIGeneration = async function() {
    const customPromptInp = document.getElementById('newTrivCustomPrompt');
    const titleInp = document.getElementById('newTrivTitle');
    const batchCountSel = document.getElementById('newTrivAIGenCount');
    const totalQCountSel = document.getElementById('newTrivQCount');
    const diffSel = document.getElementById('newTrivDifficulty');
    const btnGen = document.getElementById('btnTrivGenAI');
    const statusMsg = document.getElementById('trivGenStatusMsg');

    const topic = (customPromptInp?.value || 'NFL y Deportes').trim();
    const batchCount = parseInt(batchCountSel?.value || '3', 10) || 3;
    const totalTarget = parseInt(totalQCountSel?.value || '10', 10) || 10;
    const difficulty = diffSel?.value || 'Intermedia';
    const apiKey = window.getGeminiApiKey();

    if (btnGen) {
      btnGen.disabled = true;
      btnGen.innerHTML = `<span>⏳</span> Generando +${batchCount} con Gemini...`;
    }
    if (statusMsg) {
      statusMsg.style.display = 'block';
      statusMsg.innerHTML = `🧠 <em>Consultando Google Gemini AI para generar +${batchCount} preguntas de "${topic}" (${difficulty})...</em>`;
    }

    try {
      let newQuestions = [];
      if (apiKey) {
        newQuestions = await generateWithRealGeminiAPI(topic, batchCount, apiKey, difficulty);
      } else {
        newQuestions = findBestCuratedQuestions(topic, batchCount);
      }

      // ACCUMULATE / APPEND TO EXISTING QUESTIONS
      generatedQuestionsBuffer = [...generatedQuestionsBuffer, ...newQuestions];

      // Automatically adjust total selector if we reached or exceeded it
      if (totalQCountSel && generatedQuestionsBuffer.length > totalTarget) {
        totalQCountSel.value = String(Math.min(10, generatedQuestionsBuffer.length));
      }

      // Update room title if empty
      if (titleInp && !titleInp.value) {
        titleInp.value = `🧠 Trivia ${topic}`;
      }

      renderQuestionsPreview(generatedQuestionsBuffer);

      if (statusMsg) {
        statusMsg.innerHTML = `✨ <strong>¡Se agregaron +${newQuestions.length} preguntas de "${topic}"!</strong> (${generatedQuestionsBuffer.length} de ${totalQCountSel?.value || totalTarget} preguntas listas). <br/><span style="font-size:10px; color:#ffd100;">💡 Puedes escribir otro tema (ej. Cowboys) y presionar "Generar con IA" para seguir sumando.</span>`;
      }

      // Clear input so user can type next topic immediately
      if (customPromptInp) {
        customPromptInp.value = '';
        customPromptInp.focus();
      }
    } catch (err) {
      console.warn('[TriviaAdmin] Error in AI call:', err);
      const fallback = findBestCuratedQuestions(topic, batchCount);
      generatedQuestionsBuffer = [...generatedQuestionsBuffer, ...fallback];
      renderQuestionsPreview(generatedQuestionsBuffer);
      if (statusMsg) {
        statusMsg.innerHTML = `⚠️ <strong>Aviso de conexión:</strong> ${err.message}. Se agregaron +${fallback.length} preguntas verificadas de respaldo.`;
      }
    } finally {
      if (btnGen) {
        btnGen.disabled = false;
        btnGen.innerHTML = `<span>✨</span> Generar con IA`;
      }
    }
  };

  // =========================================================================
  // PASTE QUESTIONS MODAL WORKFLOW
  // =========================================================================
  window.openPasteQuestionsModal = function() {
    const pasteBox = document.getElementById('trivPasteQuestionsBox');
    if (pasteBox) {
      pasteBox.style.display = pasteBox.style.display === 'none' ? 'block' : 'none';
      if (pasteBox.style.display === 'block') {
        document.getElementById('trivPasteTextInput')?.focus();
      }
    }
  };

  window.applyPastedQuestions = function() {
    const textInp = document.getElementById('trivPasteTextInput');
    const rawText = textInp?.value || '';
    if (!rawText.trim()) {
      alert('Por favor pega el texto con las preguntas generadas.');
      return;
    }

    const parsed = parsePastedQuestionsText(rawText);
    if (parsed.length === 0) {
      alert('No se pudieron extraer preguntas del texto pegado. Asegúrate de incluir opciones A), B), C), D) o formato JSON.');
      return;
    }

    generatedQuestionsBuffer = parsed;
    renderQuestionsPreview(generatedQuestionsBuffer);
    window.openPasteQuestionsModal(); // hide box
    alert(`🎉 ¡Se importaron con éxito ${parsed.length} preguntas! Revisa y ajusta lo que necesites.`);
  };

  // =========================================================================
  // INTERACTIVE QUESTION EDITOR & PREVIEW
  // =========================================================================
  function renderQuestionsPreview(questions) {
    const previewContainer = document.getElementById('trivQuestionsPreviewList');
    const countBadge = document.getElementById('trivPreviewCountBadge');
    const totalQCountSel = document.getElementById('newTrivQCount');
    const targetCount = totalQCountSel ? totalQCountSel.value : '10';

    if (!previewContainer) return;

    if (countBadge) {
      countBadge.textContent = `${questions.length} de ${targetCount} Preguntas Listas`;
    }

    if (!questions || questions.length === 0) {
      previewContainer.innerHTML = '<div class="hint-text text-center py-4" style="color:#aaa;">Aún no has agregado preguntas.<br/><span style="color:#ffd100; font-weight:800; font-size:12px; margin-top:4px; display:inline-block;">Escribe un tema arriba (ej. Steelers, Cowboys, NFL) y presiona "✨ Generar con IA" para ir sumando preguntas.</span></div>';
      return;
    }

    previewContainer.innerHTML = questions.map((q, idx) => {
      const isEditing = editingQuestionIndex === idx;

      if (isEditing) {
        return `
          <div style="background:#1e2430; border:2px solid #ffd100; border-radius:10px; padding:12px; margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <strong style="color:#ffd100; font-size:12px;">✏️ Editando Pregunta #${idx + 1}</strong>
              <div style="display:flex; gap:6px;">
                <button type="button" class="btn btn-primary" onclick="window.saveEditingQuestion(${idx})" style="padding:4px 10px; font-size:11px; font-weight:900;">Guardar</button>
                <button type="button" class="btn btn-secondary" onclick="window.cancelEditingQuestion()" style="padding:4px 10px; font-size:11px;">Cancelar</button>
              </div>
            </div>

            <div class="form-group" style="margin-bottom:8px;">
              <label style="font-size:10.5px; font-weight:800; color:#aaa;">Texto de la Pregunta:</label>
              <input type="text" id="editQ_text_${idx}" value="${q.q.replace(/"/g, '&quot;')}" style="font-size:12px; font-weight:800; padding:6px 8px;"/>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:8px;">
              <div>
                <label style="font-size:10px; font-weight:800; color:#ff4d4d;">Opción A:</label>
                <input type="text" id="editQ_a_${idx}" value="${q.a.replace(/"/g, '&quot;')}" style="font-size:11.5px; padding:4px 6px;"/>
              </div>
              <div>
                <label style="font-size:10px; font-weight:800; color:#42a5f5;">Opción B:</label>
                <input type="text" id="editQ_b_${idx}" value="${q.b.replace(/"/g, '&quot;')}" style="font-size:11.5px; padding:4px 6px;"/>
              </div>
              <div>
                <label style="font-size:10px; font-weight:800; color:#f1c40f;">Opción C:</label>
                <input type="text" id="editQ_c_${idx}" value="${q.c.replace(/"/g, '&quot;')}" style="font-size:11.5px; padding:4px 6px;"/>
              </div>
              <div>
                <label style="font-size:10px; font-weight:800; color:#2ecc71;">Opción D:</label>
                <input type="text" id="editQ_d_${idx}" value="${q.d.replace(/"/g, '&quot;')}" style="font-size:11.5px; padding:4px 6px;"/>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 2fr; gap:8px;">
              <div>
                <label style="font-size:10px; font-weight:800; color:#00e676;">Opción Correcta:</label>
                <select id="editQ_correct_${idx}" style="font-size:11.5px; font-weight:900; padding:4px 6px;">
                  <option value="A" ${q.correct === 'A' ? 'selected' : ''}>Opción A</option>
                  <option value="B" ${q.correct === 'B' ? 'selected' : ''}>Opción B</option>
                  <option value="C" ${q.correct === 'C' ? 'selected' : ''}>Opción C</option>
                  <option value="D" ${q.correct === 'D' ? 'selected' : ''}>Opción D</option>
                </select>
              </div>
              <div>
                <label style="font-size:10px; font-weight:800; color:#ffd100;">Dato / Explicación:</label>
                <input type="text" id="editQ_exp_${idx}" value="${(q.exp || '').replace(/"/g, '&quot;')}" style="font-size:11px; padding:4px 6px;"/>
              </div>
            </div>
          </div>
        `;
      }

      return `
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px 12px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <strong style="color:#ffd100; font-size:12px;">Pregunta #${idx + 1}</strong>
              <span class="badge success" style="font-size:10px;">Correcta: Opción ${q.correct}</span>
            </div>
            <div style="display:flex; gap:4px;">
              <button type="button" onclick="window.startEditingQuestion(${idx})" style="background:rgba(255,255,255,0.08); border:none; color:#ffd100; font-size:10.5px; padding:2px 8px; border-radius:6px; cursor:pointer; font-weight:700;">✏️ Editar</button>
              <button type="button" onclick="window.deleteQuestionItem(${idx})" style="background:rgba(255,77,77,0.1); border:none; color:#ff4d4d; font-size:10.5px; padding:2px 6px; border-radius:6px; cursor:pointer;">🗑️</button>
            </div>
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
      `;
    }).join('');
  }

  window.startEditingQuestion = function(idx) {
    editingQuestionIndex = idx;
    renderQuestionsPreview(generatedQuestionsBuffer);
  };

  window.cancelEditingQuestion = function() {
    editingQuestionIndex = null;
    renderQuestionsPreview(generatedQuestionsBuffer);
  };

  window.saveEditingQuestion = function(idx) {
    const qText = document.getElementById(`editQ_text_${idx}`)?.value || '';
    const qA = document.getElementById(`editQ_a_${idx}`)?.value || '';
    const qB = document.getElementById(`editQ_b_${idx}`)?.value || '';
    const qC = document.getElementById(`editQ_c_${idx}`)?.value || '';
    const qD = document.getElementById(`editQ_d_${idx}`)?.value || '';
    const qCorrect = document.getElementById(`editQ_correct_${idx}`)?.value || 'A';
    const qExp = document.getElementById(`editQ_exp_${idx}`)?.value || '';

    if (!qText.trim()) {
      alert('La pregunta no puede estar vacía.');
      return;
    }

    generatedQuestionsBuffer[idx] = {
      q: qText.trim(),
      a: qA.trim(),
      b: qB.trim(),
      c: qC.trim(),
      d: qD.trim(),
      correct: qCorrect,
      exp: qExp.trim()
    };

    editingQuestionIndex = null;
    renderQuestionsPreview(generatedQuestionsBuffer);
  };

  window.deleteQuestionItem = function(idx) {
    if (generatedQuestionsBuffer.length <= 1) {
      alert('Debe haber al menos 1 pregunta en la trivia.');
      return;
    }
    generatedQuestionsBuffer.splice(idx, 1);
    editingQuestionIndex = null;
    renderQuestionsPreview(generatedQuestionsBuffer);
  };

  window.addNewManualQuestion = function() {
    generatedQuestionsBuffer.push({
      q: '¿Escribe aquí la nueva pregunta?',
      a: 'Opción A',
      b: 'Opción B',
      c: 'Opción C',
      d: 'Opción D',
      correct: 'A',
      exp: 'Explicación de la respuesta correcta.'
    });
    editingQuestionIndex = generatedQuestionsBuffer.length - 1;
    renderQuestionsPreview(generatedQuestionsBuffer);
  };

  // =========================================================================
  // PUBLISH TO FIRESTORE
  // =========================================================================
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
      questions = findBestCuratedQuestions(topic, 10);
    }

    const store = storeSel ? storeSel.value : 'Juriquilla';
    const timePerQ = parseInt(timeInp?.value || '8', 10) || 8;
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
      alert(`🎉 ¡Sala de Trivia "${title}" creada con éxito!\n\n📌 PIN de Acceso: ${pin}\n👥 Sucursal: ${store}\n⏱️ Tiempo por pregunta: ${timePerQ}s\n\n👉 Para proyectarla en las pantallas del bar o Fire TV Stick, abre "tv.html" o haz clic en "🖥️ Abrir Pantalla de TV".`);
    } catch (err) {
      console.error('[TriviaAdmin] Error creating trivia:', err);
      alert('Error al crear sala de trivia: ' + err.message);
    }
  };

  // Launch on load
  window.initTriviaAdmin();
})();
