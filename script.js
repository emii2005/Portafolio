// GSAP Registration
gsap.registerPlugin(ScrollTrigger);

// Three.js Scene Setup
let scene, camera, renderer;
let cubeGroup; // Cambiado de 'cube' a 'cubeGroup' para mayor claridad

// --- Variables para control de Audio y Subtítulos ---
let currentAudio = null; // Para controlar qué audio se está reproduciendo
// audioEnabled es el estado GLOBAL de si el audio puede sonar o está bloqueado.
// Su valor inicial lo determinará initializeSession()
let audioEnabled = false; 

const subtitleContainer = document.getElementById('subtitleContainer');
const subtitleText = document.getElementById('subtitleText'); // Donde se muestra el texto del subtítulo
const soundToggleButton = document.getElementById('soundToggleButton');

// --- NUEVAS VARIABLES para la Lógica de Sesiones ---
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
let idiotaSequenceIndex = 0; // NUEVO: Índice para la secuencia de audios 'idiota random'

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

// NUEVO: Secuencia de audios "Basta" (CON TRADUCCIONES ACTUALIZADAS)
const bastaAudios = [
    { id: 'audioBasta1', text: 'Basta' },
    { id: 'audioBasta2', text: 'Basta' },
    { id: 'audioBasta3', text: 'BASTA YA.' },
    { id: 'audioBasta4', text: '¡Diosss! No te aguanto más. ¿Podrías irte? O algo mejor, ¡jugá con el cubo Rubik, así te entrenás un poco!' },
    { id: 'audioBasta5', text: '¡La puta madre! ¿Podés dejar de tocar mi nombre, hijo de puta? ¡Qué fastidio que sos, amigo! Andate de mi web.' },
];

// NUEVO: Audios "Idiota" (CON TRADUCCIONES ACTUALIZADAS)
const idiotaAudiosRandom = [ // Audios que se eligen aleatoriamente antes del final (clic 6 al 11)
    { id: 'audioIdiota1', text: '¿SABÉS QUÉ? ¡QUE TE DEN! Ahora no vas a poder escuchar ningún audio de esta web.. Que te jodan. idiota.' },
    { id: 'audioIdiota2', text: '¿SABÉS QUÉ? ¡QUE TE DEN! Ahora no vas a poder escuchar ningún audio de esta web.. Que te jodan. idiota.' },
];
// Este audio ahora BLOQUEARÁ el sonido en la sesión actual al terminar (clic 12)
const idiotaAudioFinal = { id: 'audioIdiota3', text: '¡Sos un idiota! Conmigo no vas a escuchar más nada. Adiós a los sonidos de esta web.' }; // Mantengo este texto para el audio final que bloquea


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
    // Esto es CRÍTICO para el bloqueo del audio.
    if (!audioEnabled) {
        console.log(`%c[Audio Debug] Intento de reproducir audio ${audioId} BLOQUEADO. audioEnabled es false.`, 'color: orange;');
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

        audio.load(); // Forzar la carga del audio (útil para Chrome y para asegurar la reproducción)
        
        audio.play().then(() => {
            console.log(`%c[Audio Debug] Audio ${audioId} se reprodujo con éxito.`, 'color: green;');

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
                console.log(`%c[Audio Debug] Audio ${audioId} ha terminado.`, 'color: green;');
                stopCurrentAudio(); // Esto también oculta subtítulos y limpia currentAudio
                if (onEndedCallback) { // MODIFICADO: Si hay un callback, se ejecuta
                    onEndedCallback();
                } else {
                    // MODIFICADO: Reiniciar el temporizador de inactividad solo si estamos en sesión Normal o Alterada
                    // Y si audioEnabled sigue siendo true (no fue deshabilitado por la secuencia Idiota)
                    if (audioEnabled && (currentSession === SESSION_NORMAL || currentSession === SESSION_ALTERADA)) {
                        toggleInactivityTimer(true); 
                    }
                }
            };
            
        }).catch(e => {
            console.error(`%c[Audio Error] Error al reproducir audio ${audioId}:`, 'color: red;', e);
            console.warn(`%c[Audio Warn] Esto a menudo ocurre debido a políticas de autoplay. Asegúrate de que el usuario haga un primer clic en el botón 'Activar Sonido' o en algún lugar de la página.`, 'color: yellow;');
            
            // MODIFICADO: Si el autoplay falla al inicio (solo en Normal/Alterada), ajustar audioEnabled y mostrar botón
            // Esto solo debería pasar con la bienvenida inicial.
            if ((currentSession === SESSION_NORMAL || currentSession === SESSION_ALTERADA) && audioId.includes('Bienvenida')) {
                audioEnabled = false; // Deshabilitar audio para forzar clic explícito
                if (soundToggleButton) {
                    soundToggleButton.textContent = 'Activar Sonido';
                    soundToggleButton.style.display = 'block'; // Mostrar el botón si estaba oculto
                    soundToggleButton.disabled = false; // Asegurarse de que esté habilitado para que el usuario pueda hacer clic
                    soundToggleButton.style.opacity = '1';
                    soundToggleButton.style.cursor = 'pointer';
                }
            }
            stopCurrentAudio();
            if (onEndedCallback) onEndedCallback(); // Asegurar que el callback se ejecute incluso en error
        });
    } else {
        console.error(`%c[Audio Error] Elemento de audio con ID ${audioId} no encontrado. Asegúrate de que el ID esté bien y el archivo esté cargado en el HTML.`, 'color: red;');
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
    console.log("%c[Consola Debug] Contador anterior para el próximo audio reiniciado.", 'color: lightblue;');

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
        console.log(`%c[Timer Debug] Temporizador de inactividad iniciado para ${delay / 1000} segundos.`, 'color: darkcyan;');
    } else if (!start) {
        console.log("%c[Timer Debug] Temporizador de inactividad detenido.", 'color: darkcyan;');
    }
}

/**
 * Reproduce un verso aleatorio que no sea el último.
 */
function playRandomVerse() {
    // MODIFICADO: Solo reproducir si el audio está habilitado globalmente y no hay otro audio sonando
    // y si estamos en la sesión NORMAL o ALTERADA.
    if (!audioEnabled || currentAudio || (currentSession !== SESSION_NORMAL && currentSession !== SESSION_ALTERADA)) { 
        console.log("%c[Random Verse Debug] No se reproduce verso aleatorio: audio deshabilitado, ya hay uno sonando, o no estamos en sesión normal/alterada.", 'color: orange;');
        // Reintentar si no se puede reproducir ahora y las condiciones lo permiten
        if (audioEnabled && (currentSession === SESSION_NORMAL || currentSession === SESSION_ALTERADA)) {
             toggleInactivityTimer(true); // Reintentar establecer el temporizador
        }
        return;
    }

    let nextVerseIndex;
    do {
        nextVerseIndex = Math.floor(Math.random() * randomVerses.length);
    } while (nextVerseIndex === lastVerseIndex && randomVerses.length > 1);

    lastVerseIndex = nextVerseIndex;
    const verse = randomVerses[nextVerseIndex];
    console.log(`%c[Random Verse Debug] Reproduciendo verso aleatorio: ${verse.id}`, 'color: purple;');
    playAudioWithSubtitle(verse.id, verse.text);
}


// --- NUEVA Lógica de la Secuencia "Basta" e "Idiota" ---

/**
 * Finaliza la secuencia Idiota: reproduce el audio final y bloquea todo el sonido.
 */
function finishIdiotaSequence() {
    playAudioWithSubtitle(idiotaAudioFinal.id, idiotaAudioFinal.text, () => {
        console.log("%c[Idiota Sequence] Audio final 'Sos un idiota' terminado. Desactivando todo el audio de la web por esta sesión y futuras cargas de página.", 'color: red; font-weight: bold;');
        
        audioEnabled = false; // Deshabilitar audio globalmente y permanentemente para esta sesión
        stopCurrentAudio(); // Asegurar que no quede nada sonando
        toggleInactivityTimer(false); // Detener el temporizador de audios aleatorios
        
        // Marcar en sessionStorage que el audio fue bloqueado por la secuencia idiota
        sessionStorage.setItem(STORAGE_KEY_AUDIO_BLOCKED, 'true');
        // Marcar que la sesión debe ser "alterada" en la próxima carga (aunque el audio esté bloqueado)
        sessionStorage.setItem(STORAGE_KEY_IS_ALTERED_SESSION, 'true'); // Esto se usará para la "bienvenida idiota" si el bloqueo es temporal

        // Actualizar el botón para que indique que el sonido está desactivado y hacerlo visible
        if (soundToggleButton) {
            soundToggleButton.textContent = 'Sonido Desactivado'; // Cambiar texto
            soundToggleButton.style.display = 'block'; // Asegurar que el botón sea visible
            soundToggleButton.disabled = true; // Deshabilitar el botón
            soundToggleButton.style.opacity = '0.5'; // Indicar que está deshabilitado
            soundToggleButton.style.cursor = 'not-allowed';
            console.log("%c[Idiota Sequence] Botón 'Activar Sonido' deshabilitado.", 'color: red;');
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

    // TRADUCCIONES ACTUALIZADAS
    if (currentSession === SESSION_ALTERADA) {
        welcomeAudioId = 'audioBienvenidaIdiota';
        welcomeSubtitleText = "¡Naaa, no puedo creer que reiniciaste la web para escuchar los audios, inútil!";
        console.log("%c[Welcome Audio] Reproduciendo bienvenida de Sesión Alterada.", 'color: blue;');
    } else { // SESSION_NORMAL
        welcomeAudioId = 'audioBienvenidaCasual';
        welcomeSubtitleText = "Ahg, otra vez vos... ¿Qué onda? ¿Qué hacés acá? Sí, la web está en español, pero el audio en inglés porque me da paja grabar mi voz, je. Soy argentino por si querés saber.";
        console.log("%c[Welcome Audio] Reproduciendo bienvenida de Sesión Normal.", 'color: blue;');
    }

    const bienvenidaAudio = document.getElementById(welcomeAudioId);

    if (bienvenidaAudio) {
        // Solo reproducir si no se ha reproducido antes en esta carga de página (dataset.played)
        // o si es un clic manual en el botón (fromManualClick = true)
        if (!bienvenidaAudio.dataset.played || fromManualClick) {
             playAudioWithSubtitle(welcomeAudioId, welcomeSubtitleText, () => {
                bienvenidaAudio.dataset.played = 'true'; // Marcar como reproducido
                // Iniciar el temporizador solo si el audio está habilitado DESPUÉS de la bienvenida
                if (audioEnabled) {
                    toggleInactivityTimer(true);
                }
            });
            // Si viene de un clic manual, ya se sabe que el audio debe estar habilitado
            // Esto asegura que audioEnabled sea true si el usuario hace clic.
            if (fromManualClick) {
                audioEnabled = true; // Habilitar audio globalmente
                if (soundToggleButton) {
                    soundToggleButton.textContent = 'Desactivar Sonido';
                    soundToggleButton.style.display = 'block'; // Asegurarse de que esté visible
                    soundToggleButton.disabled = false; // Asegurar que no esté deshabilitado si el usuario lo activó
                    soundToggleButton.style.opacity = '1';
                    soundToggleButton.style.cursor = 'pointer';
                }
            }
        } else {
            // Si la bienvenida ya se reprodujo en esta carga y no es un clic manual, solo iniciar el temporizador
            console.log("%c[Welcome Audio] Audio de bienvenida ya se reprodujo en esta carga. Iniciando temporizador (si audio está habilitado).", 'color: blue;');
            if (audioEnabled) { // Solo si el audio está habilitado
                toggleInactivityTimer(true);
            }
        }
    } else {
        console.error(`%c[Sound Debug] Audio de bienvenida (${welcomeAudioId}) no encontrado. Asegúrate de que el ID esté bien y el archivo esté cargado en el HTML.`, 'color: red;');
        // Si no hay audio de bienvenida, pero el audio debería estar habilitado, iniciar el temporizador.
        if (audioEnabled) {
             toggleInactivityTimer(true);
        }
    }
}


/**
 * Inicializa la sesión del usuario al cargar la página.
 * Verifica si el audio fue bloqueado en una sesión anterior o si está en sesión alterada.
 * Esta función es CRÍTICA y debe ejecutarse al inicio de `DOMContentLoaded`.
 */
function initializeSession() {
    // Primero, revisamos si el audio fue bloqueado permanentemente por la secuencia "idiota"
    // en una sesión PREVIA.
    const wasAudioBlocked = sessionStorage.getItem(STORAGE_KEY_AUDIO_BLOCKED) === 'true';
    const wasAlteredSession = sessionStorage.getItem(STORAGE_KEY_IS_ALTERED_SESSION) === 'true';

    console.log(`%c[Session Init] Estado inicial: wasAudioBlocked=${wasAudioBlocked}, wasAlteredSession=${wasAlteredSession}`, 'color: darkgreen; font-weight: bold;');

    if (wasAudioBlocked) {
        // Caso 1: El audio estaba BLOQUEADO de una sesión anterior (Idiota finalizada).
        // La sesión actual es IDIOTA. TODO el sonido permanece deshabilitado.
        currentSession = SESSION_IDIOTA;
        audioEnabled = false; // El audio está globalmente desactivado
        console.log("%c[Session Init] Sesión iniciada como IDIOTA (audio bloqueado permanentemente).", 'color: red; font-weight: bold;');

        if (soundToggleButton) {
            soundToggleButton.textContent = 'Sonido Desactivado';
            soundToggleButton.style.display = 'block'; // Asegurarse de que el botón sea visible
            soundToggleButton.disabled = true; // Deshabilitar el botón
            soundToggleButton.style.opacity = '0.5';
            soundToggleButton.style.cursor = 'not-allowed';
        }
        // Limpiamos la bandera de sesión alterada si el audio está bloqueado, para que no se active de nuevo por error.
        sessionStorage.removeItem(STORAGE_KEY_IS_ALTERED_SESSION); 
        // No se reproduce bienvenida ni se activa temporizador. No hay interacción de audio.
    } else if (wasAlteredSession) {
        // Caso 2: El audio NO estaba bloqueado PERO la sesión anterior fue marcada como "alterada".
        // Esto significa que se recargó después de la secuencia idiota, pero sin el bloqueo PERMANENTE.
        // La sesión es ALTERADA. El audio está habilitado por defecto, pero el autoplay puede fallar.
        currentSession = SESSION_ALTERADA;
        audioEnabled = true; // En sesión alterada, el audio ESTÁ habilitado.
        console.log("%c[Session Init] Sesión iniciada como ALTERADA (audio habilitado, se intenta bienvenida alterada).", 'color: blue; font-weight: bold;');
        
        // Limpiamos la bandera de sesión alterada para la próxima recarga
        sessionStorage.removeItem(STORAGE_KEY_IS_ALTERED_SESSION);

        handleWelcomeAudioPlayback(false); // Reproducir bienvenida alterada (false porque no es un clic manual).
        // Si el autoplay falla aquí, handleWelcomeAudioPlayback lo manejará y mostrará el botón.

        // El botón debe reflejar el estado actual:
        if (soundToggleButton) {
            soundToggleButton.textContent = 'Desactivar Sonido'; // En alterada el audio está ON por defecto
            soundToggleButton.style.display = 'block'; // Siempre visible para dar control
        }

    } else {
        // Caso 3: Es una sesión completamente normal (primera vez o reinicio limpio).
        currentSession = SESSION_NORMAL;
        audioEnabled = false; // Por defecto, el audio está deshabilitado hasta una interacción.
        console.log("%c[Session Init] Sesión iniciada como NORMAL (esperando interacción para audio).", 'color: green; font-weight: bold;');
        // Se intentará el autoplay de la bienvenida en setupSoundToggleButton,
        // o el botón "Activar Sonido" aparecerá.
        setupSoundToggleButton(); 
    }
}


/**
 * Configura el botón de activar/desactivar sonido.
 * Esta función es llamada desde initializeSession.
 */
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
            console.log("%c[Sound Toggle] No se puede cambiar el estado mientras un audio se reproduce.", 'color: orange;');
            return;
        }

        audioEnabled = !audioEnabled; // Cambiar el estado global del audio
        soundToggleButton.textContent = audioEnabled ? 'Desactivar Sonido' : 'Activar Sonido';
        stopCurrentAudio(); // Detener cualquier cosa que pudiera estar sonando

        console.log(`%c[Sound Toggle] audioEnabled ahora es: ${audioEnabled}`, 'color: deepskyblue;');
        
        if (audioEnabled) {
            // Si el usuario activa el sonido manualmente, intentamos reproducir la bienvenida
            // y activamos el temporizador.
            handleWelcomeAudioPlayback(true); // El 'true' indica que viene de un clic manual
        } else {
            // Si el usuario desactiva el sonido, detener el temporizador
            toggleInactivityTimer(false); 
        }
    });

    // Lógica para el intento inicial de autoplay y mostrar el botón si falla
    if (currentSession === SESSION_NORMAL) {
        const bienvenidaAudio = document.getElementById('audioBienvenidaCasual');
        if (bienvenidaAudio) {
            // Intento de reproducción automática. Esto puede fallar en muchos navegadores.
            bienvenidaAudio.play()
                .then(() => {
                    audioEnabled = true; // Autoplay exitoso
                    soundToggleButton.textContent = 'Desactivar Sonido';
                    soundToggleButton.style.display = 'none'; // Ocultar el botón si el autoplay funciona
                    console.log("%c[Sound Debug] Audio de bienvenida NORMAL reproducido automáticamente. Botón oculto.", 'color: green;');
                    bienvenidaAudio.dataset.played = 'true';
                    toggleInactivityTimer(true); // Iniciar temporizador si el autoplay tuvo éxito
                })
                .catch(e => {
                    console.warn("%c[Sound Warn] Autoplay de bienvenida NORMAL bloqueado. El botón 'Activar Sonido' está visible para interacción del usuario.", 'color: yellow;', e);
                    soundToggleButton.style.display = 'block'; // Mostrar el botón si el autoplay falla
                    audioEnabled = false; // Asegurarse de que el audio esté deshabilitado si el autoplay falla
                    soundToggleButton.disabled = false; // Asegurar que el botón esté habilitado para el clic
                    soundToggleButton.style.opacity = '1';
                    soundToggleButton.style.cursor = 'pointer';
                });
        } else {
            console.error("%c[Sound Debug] Audio de bienvenida NORMAL no encontrado en HTML.", 'color: red;');
            soundToggleButton.style.display = 'block'; // Mostrar el botón si no hay audio
            audioEnabled = false;
        }
    } 
    // Para SESSION_ALTERADA, la bienvenida ya se maneja en initializeSession directamente,
    // y el botón debe estar visible para permitir desactivar/activar el sonido.
    else if (currentSession === SESSION_ALTERADA) {
        soundToggleButton.textContent = 'Desactivar Sonido'; // En alterada el audio está ON por defecto
        soundToggleButton.style.display = 'block'; // Siempre visible
        soundToggleButton.disabled = false;
        soundToggleButton.style.opacity = '1';
        soundToggleButton.style.cursor = 'pointer';
    }
}


// --- Inicialización de Eventos para Interacciones de Voz (MODIFICADO Y NUEVO) ---
function initVoiceInteractions() {
    // NUEVO: 1. Lógica para el clic en el nombre "Emiliano Méndez" (hero-name)
    if (heroNameClickable) {
        heroNameClickable.addEventListener('click', () => {
            console.log(`%c[Name Click Debug] Clic en el nombre. nameClickCount: ${nameClickCount + 1}. Sesión: ${currentSession}. AudioEnabled: ${audioEnabled}.`, 'color: brown;');

            // Si la sesión es IDIOTA (audio bloqueado), no hacemos nada.
            if (currentSession === SESSION_IDIOTA) {
                console.log("%c[Name Click Debug] Sesión IDIOTA activa. Ignorando clics en el nombre.", 'color: red;');
                return;
            }

            // Si el audio está deshabilitado por el usuario (desde el botón), no reproducimos nada
            if (!audioEnabled) {
                console.log("%c[Name Click Debug] Audio deshabilitado por el usuario. Haz clic en el botón 'Activar Sonido' para habilitarlo.", 'color: orange;');
                return;
            }
            
            // Incrementar el contador solo si el audio está habilitado
            nameClickCount++;

            // Secuencia "Basta" (clics 1 al 5)
            if (nameClickCount >= 1 && nameClickCount <= bastaAudios.length) {
                const audioData = bastaAudios[nameClickCount - 1];
                playAudioWithSubtitle(audioData.id, audioData.text);
            } 
            // Audios aleatorios "Idiota" (del clic 6 al 11)
            else if (nameClickCount > bastaAudios.length && nameClickCount < 12) {
                // Asegurarse de que no se repita el último si hay suficientes audios aleatorios
                let nextIdiotaIndex;
                do {
                    nextIdiotaIndex = Math.floor(Math.random() * idiotaAudiosRandom.length);
                } while (idiotaAudiosRandom.length > 1 && nextIdiotaIndex === idiotaSequenceIndex);
                
                idiotaSequenceIndex = nextIdiotaIndex; // Actualiza el índice del último idiota random reproducido
                const audioData = idiotaAudiosRandom[idiotaSequenceIndex];
                playAudioWithSubtitle(audioData.id, audioData.text);

            } 
            // Audio final "Sos un idiota" y bloqueo (al clic 12)
            else if (nameClickCount === 12) {
                finishIdiotaSequence();
                // Opcional: Podrías resetear nameClickCount aquí si quieres que la secuencia pueda repetirse
                // después de un reinicio de sesión alterada, pero el bloqueo de audio ya lo impide para esta sesión.
                nameClickCount = 0; // Reinicia para futuras sesiones alteradas o si el bloqueo no es persistente.
            }
        });
    }

    // 3. Voz al tocar el título "Proyectos" más de 3 veces (MODIFICADO)
    if (projectsTitle) {
        projectsTitle.addEventListener('click', () => {
            console.log(`%c[Projects Click Debug] Clic en Proyectos. audioEnabled: ${audioEnabled}, projectsClickCount: ${projectsClickCount + 1}, currentSession: ${currentSession}`, 'color: lightcoral;');
            
            // Solo se activa si el audio está habilitado y NO estamos en la sesión IDIOTA
            if (!audioEnabled || currentSession === SESSION_IDIOTA) {
                console.log("%c[Projects Click Debug] Audio desactivado o sesión IDIOTA. No se reproduce audio de Proyectos.", 'color: orange;');
                return;
            }
            projectsClickCount++;
            if (projectsClickCount >= 3) {
                playAudioWithSubtitle('audioProyectosBurlon', "Ah, ¿esos son los proyectos en mente? ¡No jodas, nene, andá a otra sección! No hay ningún proyecto por ahora.");
                projectsClickCount = 0; // Reinicia el contador para poder volver a activarlo
            }
        });
    }

    // 4. Voz al tocar "Sobre mí", describe todo lo que dice (MODIFICADO)
    if (aboutTitle) {
        aboutTitle.addEventListener('click', () => {
            console.log(`%c[About Click Debug] Clic en Sobre mí. audioEnabled: ${audioEnabled}, currentSession: ${currentSession}`, 'color: mediumpurple;');
            
            // Solo se activa si el audio está habilitado y NO estamos en la sesión IDIOTA
            if (!audioEnabled || currentSession === SESSION_IDIOTA) {
                console.log("%c[About Click Debug] Audio desactivado o sesión IDIOTA. No se reproduce audio de Sobre mí.", 'color: orange;');
                return;
            }
            let fullAboutText = '';
            if (aboutText1) {
                fullAboutText += aboutText1.textContent.trim();
            }
            if (aboutText2) { // Si hay un segundo párrafo, se incluye
                fullAboutText += " " + aboutText2.textContent.trim();
            }
            playAudioWithSubtitle('audioSobreMiNarrativo', fullAboutText);
        });
    }
}


// Initialize everything when DOM is loaded (MODIFICADO)
document.addEventListener('DOMContentLoaded', function() {
    initializeSession(); // NUEVO: CRÍTICO - Inicializar la sesión primero.
    initThreeJS();
    
    // Un pequeño retraso para asegurar que todos los elementos estén renderizados
    // y para permitir que initializeSession termine su trabajo.
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
        console.log("%c[Visibility Debug] Página oculta. Audio y temporizador detenidos.", 'color: grey;');
    } else {
        if (renderer) {
            // Reanudar la animación del cubo
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
        // y si la sesión NO es IDIOTA (es decir, si el audio no está bloqueado permanentemente).
        if (audioEnabled && !currentAudio && currentSession !== SESSION_IDIOTA) { 
            toggleInactivityTimer(true); 
        }
        console.log(`%c[Visibility Debug] Página visible. Audio y temporizador reanudados si audioEnabled: ${audioEnabled} y currentSession: ${currentSession}.`, 'color: grey;');
    }
});