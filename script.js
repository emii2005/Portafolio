// GSAP Registration
gsap.registerPlugin(ScrollTrigger);

// Three.js Scene Setup
let scene, camera, renderer, cube;
let cubeGroup;

// --- Variables para control de Audio y Subtítulos ---
let currentAudio = null; // Para controlar qué audio se está reproduciendo
// audioEnabled es el estado GLOBAL de si el audio puede sonar o está bloqueado.
// Su valor inicial lo determinará initializeSession()
let audioEnabled = false; 

const subtitleContainer = document.getElementById('subtitleContainer');
const subtitleText = document.getElementById('subtitleText'); // Donde se muestra el texto del subtítulo
const soundToggleButton = document.getElementById('soundToggleButton');

// --- NUEVAS VARIABLES para la Lógica de Sesiones (NO BORRAR NADA) ---
const SESSION_NORMAL = 'normal';
const SESSION_IDIOTA = 'idiota'; // Cuando se ha clicado 12 veces y se reproduce la secuencia
const SESSION_ALTERADA = 'alterada'; // Cuando se recarga después de la secuencia idiota y bloqueo de audio
let currentSession = SESSION_NORMAL; // Estado inicial, será redefinido por initializeSession()

// Usamos sessionStorage para comunicar el estado de "audio bloqueado"
// y "sesión alterada" entre recargas de página dentro de la misma pestaña.
// sessionStorage se borra cuando el usuario cierra la pestaña/navegador.
const STORAGE_KEY_AUDIO_BLOCKED = 'audioBlockedByIdiota';
const STORAGE_KEY_IS_ALTERED_SESSION = 'isAlteredSession';

// Contadores de clics (projectsClickCount se mantiene del original)
let projectsClickCount = 0;
let nameClickCount = 0; // NUEVO: Contador para los clics en el nombre de Emiliano Méndez
let idiotaSequenceIndex = 0; // NUEVO: Índice para la secuencia de audios 'basta' y 'idiota'

// Versos aleatorios (no se reproducen automáticamente, solo con interacción del cubo)
const randomVerses = [
    { id: 'audioVersoColor', text: '¿Sabías que mi color favorito es el negro???' },
    { id: 'audioVersoIrritado', text: 'Ahhh, ¿cuándo te vas a ir, mi querido amigo? Ya jodés.' },
    { id: 'audioVersoRepetido', text: '¿Sabías que la mayoría de estos audios se repiten? Porque me da una paja hacer más audios, je.' },
    // AÑADIDO: El audio del cubo como un verso aleatorio
    { id: 'audioCuboSarcasmo', text: '¡Alto cubo, VISTE! Por favor, apreciado un montón. Me costó una hora y treinta minutos de mi vida. Cubo del ojete...' },
];
let lastVerseIndex = -1; // Para evitar repetir el último verso

let inactivityTimer; // Para el temporizador de versos aleatorios
let countdownInterval; // Nuevo: Para el contador regresivo en la consola
let remainingTimeSeconds = 0; // Nuevo: Para almacenar los segundos restantes

// NUEVO: Secuencia de audios "Basta"
const bastaAudios = [
    { id: 'audioBasta1', text: 'Basta uno. Ya te dije que basta.' },
    { id: 'audioBasta2', text: 'Basta dos. ¿No entendés?' },
    { id: 'audioBasta3', text: 'Basta tres. Me estás irritando.' },
    { id: 'audioBasta4', text: 'Basta cuatro. De verdad, para.' },
    { id: 'audioBasta5', text: 'Basta cinco. Te lo pido por favor.' },
];

// NUEVO: Audios "Idiota"
const idiotaAudiosRandom = [ // Audios que se eligen aleatoriamente antes del final
    { id: 'audioIdiota1', text: '¿En serio? ¿Todavía seguís? Ya es suficiente.' },
    { id: 'audioIdiota2', text: '¡Qué testarudez! No tenés remedio, seguís haciendo clic.' },
];
// Este audio ahora BLOQUEARÁ el sonido en la sesión actual al terminar
const idiotaAudioFinal = { id: 'audioIdiota3', text: '¡Sos un idiota! Conmigo no vas a escuchar más nada. Adiós a los sonidos de esta web.' };


// Referencias a elementos HTML para eventos de clic
const cubeContainer = document.getElementById('cube-container'); // Se mantiene para initThreeJS
const projectsTitle = document.getElementById('projects-title');
const aboutTitle = document.getElementById('about-title');
const aboutText1 = document.getElementById('about-text-1');
const aboutText2 = document.getElementById('about-text-2');
const heroNameClickable = document.querySelector('.hero-name'); // NUEVO: Elemento clickeable para el nombre


// --- Funciones de Audio y Subtítulos ---

/**
 * Detiene cualquier audio en reproducción y oculta los subtítulos.
 */
function stopCurrentAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0; // Reiniciar el audio
        currentAudio.onended = null; // Limpiar el evento onended
        currentAudio.ontimeupdate = null; // Limpiar el evento ontimeupdate
        currentAudio = null;
    }
    if (subtitleContainer) {
        subtitleContainer.classList.remove('show');
    }
    if (subtitleText) {
        subtitleText.textContent = '';
    }
    // Detener el contador visible en la consola
    clearInterval(countdownInterval);
    console.log("[Consola Debug] Contador del próximo audio detenido.");
}

/**
 * Reproduce un audio y muestra su subtítulo, dividiéndolo en chunks.
 * Asegura que solo un audio se reproduzca a la vez.
 * @param {string} audioId - El ID del elemento <audio> en el HTML.
 * @param {string} subtitleContent - El texto completo a mostrar como subtítulo.
 * @param {function} [onEndedCallback] - Función a ejecutar cuando el audio termina.
 */
function playAudioWithSubtitle(audioId, subtitleContent, onEndedCallback = null) {
    // MODIFICADO: Si el audio no está habilitado globalmente, NO se reproduce NADA.
    if (!audioEnabled) {
        console.log(`[Audio Debug] Intento de reproducir audio ${audioId} pero audioEnabled es false (audio bloqueado globalmente).`);
        if (onEndedCallback) onEndedCallback(); // Asegurar que el callback se ejecute si no se reproduce
        return;
    }

    stopCurrentAudio(); // Detener el audio actual antes de reproducir uno nuevo

    const audio = document.getElementById(audioId);
    if (audio) {
        currentAudio = audio;

        // Preparar los segmentos del subtítulo
        const words = subtitleContent.split(/\s+/);
        const minWordsPerChunk = 7; // Ajustado a 7 palabras por chunk para un flujo más rápido
        const chunks = [];
        let currentChunk = [];

        for (let i = 0; i < words.length; i++) {
            currentChunk.push(words[i]);
            if (currentChunk.length >= minWordsPerChunk || i === words.length - 1) {
                chunks.push(currentChunk.join(' '));
                currentChunk = [];
            }
        }
        
        let currentChunkIndex = 0;

        // Show the initial subtitle chunk
        if (subtitleContainer && subtitleText) {
            subtitleText.textContent = chunks[0] || '';
            subtitleContainer.classList.add('show');
        }

        audio.load(); // Forzar la carga del audio
        
        audio.play().then(() => {
            console.log(`[Audio Debug] Audio ${audioId} se reprodujo con éxito.`);

            // Manejar la actualización del subtítulo con el tiempo
            audio.ontimeupdate = () => {
                if (chunks.length > 1) {
                    const chunkDuration = audio.duration / chunks.length; 
                    const expectedChunkIndex = Math.floor(audio.currentTime / chunkDuration);

                    if (expectedChunkIndex !== currentChunkIndex && expectedChunkIndex < chunks.length) {
                        currentChunkIndex = expectedChunkIndex;
                        subtitleText.textContent = chunks[currentChunkIndex];
                    }
                }
            };

            audio.onended = () => {
                console.log(`[Audio Debug] Audio ${audioId} ha terminado.`);
                stopCurrentAudio(); // Esto también oculta subtítulos y limpia currentAudio
                if (onEndedCallback) { // MODIFICADO: Si hay un callback, se ejecuta
                    onEndedCallback();
                } else {
                    // MODIFICADO: Reiniciar el temporizador de inactividad solo si estamos en sesión Normal o Alterada
                    if (currentSession === SESSION_NORMAL || currentSession === SESSION_ALTERADA) {
                        toggleInactivityTimer(true); 
                    }
                }
            };
            
        }).catch(e => {
            console.error(`[Audio Error] Error al reproducir audio ${audioId}:`, e);
            console.warn(`[Audio Warn] Esto a menudo ocurre en móvil debido a políticas de autoplay. Asegúrate de que el usuario haga un primer clic en el botón 'Activar Sonido'.`);
            
            // MODIFICADO: Si el autoplay falla al inicio (solo en Normal/Alterada), ajustar audioEnabled y mostrar botón
            if ((currentSession === SESSION_NORMAL || currentSession === SESSION_ALTERADA) && audioId.includes('Bienvenida')) {
                audioEnabled = false; // Deshabilitar audio para forzar clic
                if (soundToggleButton) {
                    soundToggleButton.textContent = 'Activar Sonido';
                    soundToggleButton.style.display = 'block'; // Mostrar el botón
                }
            }
            stopCurrentAudio();
            if (onEndedCallback) onEndedCallback(); // Asegurar que el callback se ejecute incluso en error
        });
    } else {
        console.error(`[Audio Error] Elemento de audio con ID ${audioId} no encontrado.`);
        if (onEndedCallback) onEndedCallback(); // Asegurar que el callback se ejecute si el audio no existe
    }
}

/**
 * Inicia o detiene el temporizador de versos aleatorios.
 */
function toggleInactivityTimer(start) {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }
    // Detener y limpiar el intervalo de conteo regresivo
    clearInterval(countdownInterval);
    console.log("[Consola Debug] Contador anterior para el próximo audio reiniciado.");

    // MODIFICADO: Solo iniciar el temporizador si el audio está habilitado globalmente
    // y si estamos en la sesión NORMAL o ALTERADA.
    if (start && audioEnabled && (currentSession === SESSION_NORMAL || currentSession === SESSION_ALTERADA)) {
        // Retraso aleatorio entre 30 y 60 segundos
        const delay = (Math.random() * 30 + 30) * 1000; 
        
        remainingTimeSeconds = Math.floor(delay / 1000); // Inicializar segundos restantes

        // Mostrar el tiempo inicial en consola
        console.log(`%c[Consola Debug] Próximo audio aleatorio en: ${remainingTimeSeconds} segundos.`, 'color: lightblue;');

        // Iniciar el contador regresivo en la consola
        countdownInterval = setInterval(() => {
            remainingTimeSeconds--;
            if (remainingTimeSeconds > 0) {
                console.log(`%c[Consola Debug] Tiempo restante para el próximo audio: ${remainingTimeSeconds} segundos.`, 'color: lightblue;');
            } else {
                clearInterval(countdownInterval);
                console.log("%c[Consola Debug] ¡Reproduciendo próximo audio aleatorio!", 'color: limegreen; font-weight: bold;');
            }
        }, 1000); // Actualizar cada segundo

        inactivityTimer = setTimeout(playRandomVerse, delay);
        console.log(`[Timer Debug] Temporizador de inactividad iniciado para ${delay / 1000} segundos.`);
    } else if (!start) {
        console.log("[Timer Debug] Temporizador de inactividad detenido.");
    }
}

/**
 * Reproduce un verso aleatorio que no sea el último.
 */
function playRandomVerse() {
    // MODIFICADO: Solo reproducir si el audio está habilitado globalmente y no hay otro audio sonando
    // y si estamos en la sesión NORMAL o ALTERADA.
    if (!audioEnabled || currentAudio || (currentSession !== SESSION_NORMAL && currentSession !== SESSION_ALTERADA)) { 
        console.log("[Random Verse Debug] No se reproduce verso aleatorio: audio deshabilitado, ya hay uno sonando, o no estamos en sesión normal/alterada.");
        // Reintentar si no se puede reproducir ahora y las condiciones lo permiten
        if (audioEnabled && (currentSession === SESSION_NORMAL || currentSession === SESSION_ALTERADA)) {
             toggleInactivityTimer(true); 
        }
        return;
    }

    let nextVerseIndex;
    do {
        nextVerseIndex = Math.floor(Math.random() * randomVerses.length);
    } while (nextVerseIndex === lastVerseIndex && randomVerses.length > 1);

    lastVerseIndex = nextVerseIndex;
    const verse = randomVerses[nextVerseIndex];
    console.log(`[Random Verse Debug] Reproduciendo verso aleatorio: ${verse.id}`);
    playAudioWithSubtitle(verse.id, verse.text);
}


// --- NUEVA Lógica de la Secuencia "Basta" e "Idiota" ---

/**
 * Finaliza la secuencia Idiota: reproduce el audio final y bloquea todo el sonido.
 */
function finishIdiotaSequence() {
    playAudioWithSubtitle(idiotaAudioFinal.id, idiotaAudioFinal.text, () => {
        console.log("[Idiota Sequence] Audio final 'Sos un idiota' terminado. Desactivando todo el audio de la web por esta sesión.");
        
        audioEnabled = false; // Deshabilitar audio globalmente
        stopCurrentAudio(); // Asegurar que no quede nada sonando
        toggleInactivityTimer(false); // Detener el temporizador de audios aleatorios
        
        // Marcar en sessionStorage que el audio fue bloqueado por la secuencia idiota
        sessionStorage.setItem(STORAGE_KEY_AUDIO_BLOCKED, 'true');
        // Marcar que la sesión debe ser "alterada" en la próxima carga
        sessionStorage.setItem(STORAGE_KEY_IS_ALTERED_SESSION, 'true');

        // Actualizar el botón para que indique que el sonido está desactivado y hacerlo visible
        if (soundToggleButton) {
            soundToggleButton.textContent = 'Sonido Desactivado'; // Cambiar texto
            soundToggleButton.style.display = 'block'; // Asegurar que el botón sea visible
            soundToggleButton.disabled = true; // Deshabilitar el botón
            soundToggleButton.style.opacity = '0.5'; // Indicar que está deshabilitado
            soundToggleButton.style.cursor = 'not-allowed';
        }
        currentSession = SESSION_IDIOTA; // Establecer la sesión como IDIOTA
    });
}


// --- Inicialización de Three.js (sin cambios) ---
function initThreeJS() {
    const container = document.getElementById('cube-container');
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(4, 4, 4);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(300, 300);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    const pointLight1 = new THREE.PointLight(0xffffff, 0.8, 100);
    pointLight1.position.set(-5, 5, 5);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x8080ff, 0.4, 50);
    pointLight2.position.set(5, -5, -5);
    scene.add(pointLight2);
    
    createRubiksCube();
    
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1;
    
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        if (cubeGroup) {
            cubeGroup.rotation.y += 0.005;
            cubeGroup.position.y = Math.sin(Date.now() * 0.001) * 0.1;
        }
        renderer.render(scene, camera);
    }
    animate();
    
    function handleResize() {
        const size = window.innerWidth <= 768 ? 250 : 300;
        camera.aspect = 1;
        camera.updateProjectionMatrix();
        renderer.setSize(size, size);
        container.style.width = size + 'px';
        container.style.height = size + 'px';
    }
    window.addEventListener('resize', handleResize);
    handleResize();
}

function createRubiksCube() {
    cubeGroup = new THREE.Group();
    const materials = [
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.9, roughness: 0.1 }),
        new THREE.MeshStandardMaterial({ color: 0x404040, metalness: 0.8, roughness: 0.15 }),
        new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.9, roughness: 0.1 }),
        new THREE.MeshStandardMaterial({ color: 0x2d2d3a, metalness: 0.8, roughness: 0.15 }),
        new THREE.MeshStandardMaterial({ color: 0x3a2d2d, metalness: 0.9, roughness: 0.1 }),
        new THREE.MeshStandardMaterial({ color: 0x2d3a2d, metalness: 0.8, roughness: 0.15 })
    ];
    const cubeSize = 0.9;
    const gap = 0.1;
    for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
            for (let z = 0; z < 3; z++) {
                const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
                geometry.userData = { roundedEdges: true };
                const material = materials[Math.floor(Math.random() * materials.length)].clone();
                material.metalness = 0.8 + Math.random() * 0.1;
                material.roughness = 0.05 + Math.random() * 0.1;
                const smallCube = new THREE.Mesh(geometry, material);
                smallCube.position.set((x - 1) * (cubeSize + gap), (y - 1) * (cubeSize + gap), (z - 1) * (cubeSize + gap));
                smallCube.castShadow = true;
                smallCube.receiveShadow = true;
                const edges = new THREE.EdgesGeometry(geometry);
                const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x606060, transparent: true, opacity: 0.3 });
                const wireframe = new THREE.LineSegments(edges, edgeMaterial);
                smallCube.add(wireframe);
                cubeGroup.add(smallCube);
            }
        }
    }
    scene.add(cubeGroup);
}

// --- GSAP Animations (sin cambios) ---
function initAnimations() {
    gsap.set(".hero-name", { opacity: 0, x: -50 });
    gsap.set(".hero-subtitle", { opacity: 0, x: -30 });
    gsap.set("#cube-container", { opacity: 0, x: 50 });
    gsap.to(".hero-name", { opacity: 1, x: 0, duration: 1, ease: "power3.out", delay: 0.5 });
    gsap.to(".hero-subtitle", { opacity: 1, x: 0, duration: 1, ease: "power3.out", delay: 0.8 });
    gsap.to("#cube-container", { opacity: 1, x: 0, duration: 1, ease: "power3.out", delay: 1 });
    gsap.fromTo(".scroll-indicator", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, delay: 1.5, ease: "power2.out" });
    
    gsap.utils.toArray(".section").forEach((section) => {
        const elementsToAnimate = section.querySelectorAll(
            ".section-title, .about-text, .objective-text, .objective-quote"
        );
        gsap.set(elementsToAnimate, { opacity: 0, y: 30 });
        ScrollTrigger.create({
            trigger: section,
            start: "top 80%",
            onEnter: () => {
                gsap.to(elementsToAnimate, { opacity: 1, y: 0, duration: 0.8, stagger: 0.2, ease: "power3.out" });
            }
        });
    });

    const projectCards = gsap.utils.toArray(".project-card");
    gsap.set(projectCards, { opacity: 0, scale: 0.8 });
    ScrollTrigger.create({
        trigger: ".projects-grid",
        start: "top 80%",
        onEnter: () => {
            gsap.to(projectCards, { opacity: 1, scale: 1, duration: 0.6, stagger: 0.2, ease: "back.out(1.7)" });
        }
    });

    ScrollTrigger.create({
        trigger: ".footer",
        start: "top 90%",
        onEnter: () => {
            gsap.fromTo(".contact-item", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.2, ease: "power3.out" });
        }
    });
}

// VanillaTilt initialization (sin cambios)
function initTilt() {
    VanillaTilt.init(document.querySelectorAll(".project-card"), {
        max: 15,
        speed: 1000,
        glare: true,
        "max-glare": 0.2,
    });
}

// Smooth scrolling for navigation (sin cambios)
function initSmoothScroll() {
    ScrollTrigger.create({
        trigger: "body",
        start: "top top",
        end: "+=100",
        onUpdate: (self) => {
            const opacity = 1 - self.progress;
            gsap.to(".scroll-indicator", { opacity: opacity, duration: 0.3 });
        }
    });
}

// Parallax effects (sin cambios)
function initParallax() {
    gsap.to(".hero-left", {
        yPercent: -50,
        ease: "none",
        scrollTrigger: {
            trigger: ".hero-section",
            start: "top bottom",
            end: "bottom top",
            scrub: true
        }
    });
    gsap.to("#cube-container", {
        yPercent: -30,
        rotation: 360,
        ease: "none",
        scrollTrigger: {
            trigger: ".hero-section",
            start: "top bottom",
            end: "bottom top",
            scrub: true
        }
    });
}

// --- Gestión del Sonido Global y Sesiones (MODIFICADO Y NUEVO) ---

/**
 * Función central para manejar la reproducción del audio de bienvenida.
 * Considera la sesión actual (Normal o Alterada).
 * @param {boolean} fromManualClick - Indica si la llamada viene de un clic manual en el botón.
 */
function handleWelcomeAudioPlayback(fromManualClick = false) {
    let welcomeAudioId;
    let welcomeSubtitleText;

    if (currentSession === SESSION_ALTERADA) {
        welcomeAudioId = 'audioBienvenidaIdiota';
        welcomeSubtitleText = "¡Oh, veo que has vuelto! Pensabas que todo volvería a la normalidad, ¿verdad? Pues no del todo... La bienvenida es diferente ahora, jeje.";
        console.log("[Welcome Audio] Reproduciendo bienvenida de Sesión Alterada.");
    } else { // SESSION_NORMAL
        welcomeAudioId = 'audioBienvenidaCasual';
        welcomeSubtitleText = "Ahg, otra vez vos... ¿Qué onda? ¿Qué hacés acá? Sí, la web está en español, pero el audio en inglés porque me da paja grabar mi voz, je. Soy argentino por si querés saber.";
        console.log("[Welcome Audio] Reproduciendo bienvenida de Sesión Normal.");
    }

    const bienvenidaAudio = document.getElementById(welcomeAudioId);

    if (bienvenidaAudio) {
        // Solo reproducir si no se ha reproducido antes en esta carga de página
        // o si es un clic manual en el botón (que debe intentar activarlo)
        if (!bienvenidaAudio.dataset.played || fromManualClick) {
             playAudioWithSubtitle(welcomeAudioId, welcomeSubtitleText, () => {
                bienvenidaAudio.dataset.played = 'true'; // Marcar como reproducido
                // Iniciar el temporizador solo si el audio está habilitado
                if (audioEnabled) {
                    toggleInactivityTimer(true);
                }
            });
            // Si viene de un clic manual, ya se sabe que el audio debe estar habilitado
            if (fromManualClick) {
                audioEnabled = true;
                soundToggleButton.textContent = 'Desactivar Sonido';
                soundToggleButton.style.display = 'block'; // Asegurarse de que esté visible
            }
        } else {
            // Si la bienvenida ya se reprodujo y no es un clic manual, solo iniciar el temporizador
            console.log("[Welcome Audio] Audio de bienvenida ya se reprodujo. Iniciando temporizador.");
            if (audioEnabled) { // Solo si el audio está habilitado
                toggleInactivityTimer(true);
            }
        }
    } else {
        console.error(`[Sound Debug] Audio de bienvenida (${welcomeAudioId}) no encontrado.`);
        // Si no hay audio de bienvenida, pero el audio debería estar habilitado, iniciar el temporizador.
        if (audioEnabled) {
             toggleInactivityTimer(true);
        }
    }
}


/**
 * Inicializa la sesión del usuario al cargar la página.
 * Verifica si el audio fue bloqueado en una sesión anterior o si está en sesión alterada.
 * Esta función es CRÍTICA y debe ejecutarse al inicio.
 */
function initializeSession() {
    // Primero, revisamos si el audio fue bloqueado permanentemente por la secuencia "idiota".
    const wasAudioBlocked = sessionStorage.getItem(STORAGE_KEY_AUDIO_BLOCKED) === 'true';
    const wasAlteredSession = sessionStorage.getItem(STORAGE_KEY_IS_ALTERED_SESSION) === 'true';

    if (wasAudioBlocked) {
        // Si el audio estaba bloqueado, entramos en sesión IDIOTA y deshabilitamos todo el sonido.
        currentSession = SESSION_IDIOTA;
        audioEnabled = false; // El audio está globalmente desactivado
        console.log("[Session Init] Sesión iniciada como IDIOTA (audio bloqueado permanentemente).");

        if (soundToggleButton) {
            soundToggleButton.textContent = 'Sonido Desactivado';
            soundToggleButton.style.display = 'block'; // Asegurarse de que el botón sea visible
            soundToggleButton.disabled = true; // Deshabilitar el botón
            soundToggleButton.style.opacity = '0.5';
            soundToggleButton.style.cursor = 'not-allowed';
        }
        // No se reproduce bienvenida ni se activa temporizador.
    } else if (wasAlteredSession) {
        // Si no estaba bloqueado, pero la sesión anterior era alterada, volvemos a la sesión alterada.
        currentSession = SESSION_ALTERADA;
        audioEnabled = true; // Por defecto, el audio en sesión alterada está activado, pero puede fallar el autoplay.
        console.log("[Session Init] Sesión iniciada como ALTERADA.");
        handleWelcomeAudioPlayback(false); // Reproducir bienvenida alterada
    } else {
        // Sesión normal por defecto
        currentSession = SESSION_NORMAL;
        audioEnabled = false; // En sesión normal, el audio está deshabilitado hasta un primer clic.
        console.log("[Session Init] Sesión iniciada como NORMAL (esperando interacción para audio).");
        // El botón se mostrará si el autoplay inicial falla o si no hay bienvenida auto.
        setupSoundToggleButton(); // Llama a la configuración del botón para intentar autoplay o mostrarlo
    }
}


function setupSoundToggleButton() {
    if (!soundToggleButton) {
        console.error("soundToggleButton not found. Make sure an element with id 'soundToggleButton' exists in your HTML.");
        return;
    }

    // Si ya estamos en sesión IDIOTA (audio bloqueado), el botón ya está deshabilitado y no hace nada
    if (currentSession === SESSION_IDIOTA) {
        soundToggleButton.textContent = 'Sonido Desactivado';
        soundToggleButton.style.display = 'block';
        soundToggleButton.disabled = true;
        soundToggleButton.style.opacity = '0.5';
        soundToggleButton.style.cursor = 'not-allowed';
        return; // Salir, ya está configurado
    }

    // Comportamiento para sesiones NORMAL y ALTERADA
    soundToggleButton.addEventListener('click', () => {
        // Ignorar clic si ya estamos reproduciendo un audio (para evitar interrupciones bruscas)
        if (currentAudio) {
            console.log("[Sound Toggle] No se puede cambiar el estado mientras un audio se reproduce.");
            return;
        }

        audioEnabled = !audioEnabled;
        soundToggleButton.textContent = audioEnabled ? 'Desactivar Sonido' : 'Activar Sonido';
        stopCurrentAudio(); // Detener cualquier cosa que pudiera estar sonando

        console.log(`[Sound Toggle] audioEnabled ahora es: ${audioEnabled}`);
        
        if (audioEnabled) {
            // Si el usuario activa el sonido manualmente, intentamos reproducir la bienvenida
            // y activamos el temporizador.
            handleWelcomeAudioPlayback(true);
        } else {
            // Si el usuario desactiva el sonido, detener el temporizador
            toggleInactivityTimer(false); 
        }
    });

    // MODIFICADO: Intento de autoplay SOLO para la sesión NORMAL (si la bandera de sesión alterada no está presente)
    // o para la sesión ALTERADA.
    // El autoplay del audio de bienvenida "casual" se intenta aquí inicialmente
    // Si la sesión es ALTERADA, handleWelcomeAudioPlayback ya maneja su propio autoplay.
    if (currentSession === SESSION_NORMAL) {
        const bienvenidaAudio = document.getElementById('audioBienvenidaCasual');
        if (bienvenidaAudio) {
            bienvenidaAudio.play()
                .then(() => {
                    audioEnabled = true;
                    soundToggleButton.textContent = 'Desactivar Sonido';
                    soundToggleButton.style.display = 'none'; // Ocultar el botón si el autoplay funciona
                    console.log("[Sound Debug] Audio de bienvenida NORMAL reproducido automáticamente.");
                    bienvenidaAudio.dataset.played = 'true';
                    toggleInactivityTimer(true); // Iniciar temporizador si el autoplay tuvo éxito
                })
                .catch(e => {
                    console.warn("[Sound Warn] Autoplay de bienvenida NORMAL bloqueado. El botón 'Activar Sonido' está visible.", e);
                    soundToggleButton.style.display = 'block';
                    audioEnabled = false; // Asegurarse de que el audio esté deshabilitado si el autoplay falla
                });
        } else {
            console.error("[Sound Debug] Audio de bienvenida NORMAL no encontrado.");
            soundToggleButton.style.display = 'block'; // Mostrar el botón si no hay audio
            audioEnabled = false;
        }
    } else if (currentSession === SESSION_ALTERADA) {
        // En sesión ALTERADA, el autoplay ya se maneja en initializeSession a través de handleWelcomeAudioPlayback
        // El botón debe reflejar el estado inicial de audioEnabled (que en Alterada es true)
        soundToggleButton.textContent = 'Desactivar Sonido';
        soundToggleButton.style.display = 'none'; // Asumimos que autoplay podría funcionar o lo gestiona handleWelcomeAudioPlayback
    }
}


// --- Inicialización de Eventos para Interacciones de Voz (MODIFICADO Y NUEVO) ---
function initVoiceInteractions() {
    // ELIMINADO: La interacción de clic/touch con el cubo ya no está aquí.

    // NUEVO: 1. Lógica para el clic en el nombre "Emiliano Méndez" (hero-name)
    if (heroNameClickable) {
        heroNameClickable.addEventListener('click', () => {
            console.log(`[Name Click Debug] Clic en el nombre. nameClickCount: ${nameClickCount + 1}. Sesión: ${currentSession}. AudioEnabled: ${audioEnabled}.`);

            // Si la sesión es IDIOTA, no hacemos nada.
            if (currentSession === SESSION_IDIOTA) {
                console.log("[Name Click Debug] Sesión IDIOTA activa. Ignorando clics en el nombre.");
                return;
            }

            // Si el audio está deshabilitado por el usuario, no reproducimos nada
            if (!audioEnabled) {
                console.log("[Name Click Debug] Audio deshabilitado. Haz clic en el botón 'Activar Sonido' para habilitarlo.");
                return;
            }
            
            nameClickCount++;

            if (nameClickCount <= 5) {
                // Secuencia "Basta"
                const audioData = bastaAudios[nameClickCount - 1];
                playAudioWithSubtitle(audioData.id, audioData.text);
            } else if (nameClickCount >= 6 && nameClickCount <= 11) {
                // Audios aleatorios "Idiota"
                // Asegurarse de que no se repita el último si hay suficientes
                let nextIdiotaIndex;
                do {
                    nextIdiotaIndex = Math.floor(Math.random() * idiotaAudiosRandom.length);
                } while (nextIdiotaIndex === idiotaSequenceIndex && idiotaAudiosRandom.length > 1);
                
                idiotaSequenceIndex = nextIdiotaIndex;
                const audioData = idiotaAudiosRandom[idiotaSequenceIndex];
                playAudioWithSubtitle(audioData.id, audioData.text);

            } else if (nameClickCount === 12) {
                // Audio final "Sos un idiota" y bloqueo
                finishIdiotaSequence();
                nameClickCount = 0; // Resetear para evitar más triggers
            }
        });
    }

    // 3. Voz al tocar el título "Proyectos" más de 3 veces (MODIFICADO)
    if (projectsTitle) {
        projectsTitle.addEventListener('click', () => {
            console.log(`[Projects Click Debug] Clic en Proyectos. audioEnabled: ${audioEnabled}, projectsClickCount: ${projectsClickCount + 1}, currentSession: ${currentSession}`);
            
            // Solo se activa si el audio está habilitado y NO estamos en la sesión IDIOTA
            if (!audioEnabled || currentSession === SESSION_IDIOTA) {
                console.log("[Projects Click Debug] Audio desactivado o sesión IDIOTA. No se reproduce audio de Proyectos.");
                return;
            }
            projectsClickCount++;
            if (projectsClickCount >= 3) {
                playAudioWithSubtitle('audioProyectosBurlon', "Ah, ¿esos son los proyectos en mente? ¡No jodas, nene, andá a otra sección! No hay ningún proyecto por ahora.");
                projectsClickCount = 0;
            }
        });
    }

    // 4. Voz al tocar "Sobre mí", describe todo lo que dice (MODIFICADO)
    if (aboutTitle) {
        aboutTitle.addEventListener('click', () => {
            console.log(`[About Click Debug] Clic en Sobre mí. audioEnabled: ${audioEnabled}, currentSession: ${currentSession}`);
            
            // Solo se activa si el audio está habilitado y NO estamos en la sesión IDIOTA
            if (!audioEnabled || currentSession === SESSION_IDIOTA) {
                console.log("[About Click Debug] Audio desactivado o sesión IDIOTA. No se reproduce audio de Sobre mí.");
                return;
            }
            let fullAboutText = '';
            if (aboutText1) {
                fullAboutText += aboutText1.textContent.trim();
            }
            if (aboutText2) {
                fullAboutText += " " + aboutText2.textContent.trim();
            }
            playAudioWithSubtitle('audioSobreMiNarrativo', fullAboutText);
        });
    }
}


// Initialize everything when DOM is loaded (MODIFICADO)
document.addEventListener('DOMContentLoaded', function() {
    initializeSession(); // NUEVO: Inicializar la sesión primero
    initThreeJS();
    
    // Un pequeño retraso para asegurar que todos los elementos estén renderizados
    setTimeout(() => {
        initAnimations();
        initTilt();
        initSmoothScroll();
        initParallax();
        initVoiceInteractions(); 
    }, 100);
});

// Handle page visibility changes (MODIFICADO)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        if (renderer) { renderer.setAnimationLoop(null); }
        stopCurrentAudio();
        toggleInactivityTimer(false); 
        console.log("[Visibility Debug] Página oculta. Audio y temporizador detenidos.");
    } else {
        if (renderer) {
            function animateLoop() {
                requestAnimationFrame(animateLoop);
                if (cubeGroup) {
                    cubeGroup.rotation.y += 0.005;
                    cubeGroup.position.y = Math.sin(Date.now() * 0.001) * 0.1;
                }
                renderer.render(scene, camera);
            }
            renderer.setAnimationLoop(animateLoop);
        }
        // Solo reanudar el temporizador si el audio está habilitado Y no hay un audio reproduciéndose actualmente
        // y si la sesión NO es IDIOTA.
        if (audioEnabled && !currentAudio && currentSession !== SESSION_IDIOTA) { 
            toggleInactivityTimer(true); 
        }
        console.log(`[Visibility Debug] Página visible. Audio y temporizador reanudados si audioEnabled: ${audioEnabled} y currentSession: ${currentSession}.`);
    }
});