// GSAP Registration
gsap.registerPlugin(ScrollTrigger);

// Three.js Scene Setup
let scene, camera, renderer;
let cubeGroup; // Cambiado de 'cube' a 'cubeGroup' para mayor claridad

// --- Variables para control de Audio y Subtítulos ---
let currentAudio = null; // Para controlar qué audio se está reproduciendo
// audioEnabled es el estado GLOBAL de si el audio puede sonar.
// Se inicializa en false y se activa con el primer clic del usuario.
let audioEnabled = false; 

const subtitleContainer = document.getElementById('subtitleContainer');
const subtitleText = document.getElementById('subtitleText'); // Donde se muestra el texto del subtítulo
const soundToggleButton = document.getElementById('soundToggleButton');

// --- Contadores de clics ---
let projectsClickCount = 0;
let nameClickCount = 0; // Contador para los clics en el nombre de Emiliano Méndez (Easter Egg)
let idiotaSequenceIndex = 0; // Índice para la secuencia de audios 'idiota random'

// Versos aleatorios (se reproducen con el temporizador de inactividad)
const randomVerses = [
    { id: 'audioVersoColor', text: '¿Sabías que mi color favorito es el negro???' },
    { id: 'audioVersoIrritado', text: 'Ahhh, ¿cuándo te vas a ir, mi querido amigo? Ya jodés.' },
    { id: 'audioVersoRepetido', text: '¿Sabías que la mayoría de estos audios se repiten? Porque me da una paja hacer más audios, je.' },
    { id: 'audioCuboSarcasmo', text: '¡Alto cubo, VISTE! Por favor, apreciado un montón. Me costó una hora y treinta minutos de mi vida. Cubo del ojete...' },
];
let lastVerseIndex = -1; // Para evitar repetir el último verso

let inactivityTimer; // Para el temporizador de versos aleatorios
let countdownInterval; // Para el contador regresivo en la consola
let remainingTimeSeconds = 0; // Para almacenar los segundos restantes

// Secuencia de audios "Basta"
const bastaAudios = [
    { id: 'audioBasta1', text: 'Basta' },
    { id: 'audioBasta2', text: 'Basta' },
    { id: 'audioBasta3', text: 'BASTA YA.' },
    { id: 'audioBasta4', text: '¡Diosss! No te aguanto más. ¿Podrías irte? O algo mejor, ¡jugá con el cubo Rubik, así te entrenás un poco!' },
    { id: 'audioBasta5', text: '¡La puta madre! ¿Podés dejar de tocar mi nombre, hijo de puta? ¡Qué fastidio que sos, amigo! Andate de mi web.' },
];

// Audios "Idiota"
const idiotaAudiosRandom = [ // Audios que se eligen aleatoriamente antes del final (clic 6 al 11)
    { id: 'audioIdiota1', text: '¿SABÉS QUÉ? ¡QUE TE DEN! Ahora no vas a poder escuchar ningún audio de esta web.. Que te jodan. idiota.' },
    { id: 'audioIdiota2', text: '¿SABÉS QUÉ? ¡QUE TE DEN! Ahora no vas a poder escuchar ningún audio de esta web.. Que te jodan. idiota.' },
];
// Este audio ahora BLOQUEARÁ el sonido SOLO para la sesión actual del navegador
const idiotaAudioFinal = { id: 'audioIdiota3', text: '¡Sos un idiota! Conmigo no vas a escuchar más nada. Adiós a los sonidos de esta web.' };


// Referencias a elementos HTML para eventos de clic
const cubeContainer = document.getElementById('cube-container');
const projectsTitle = document.getElementById('projects-title');
const aboutTitle = document.getElementById('about-title');
const aboutText1 = document.getElementById('about-text-1');
const aboutText2 = document.getElementById('about-text-2');
const heroNameClickable = document.querySelector('.hero-name'); // Elemento clickeable para el nombre


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
    // Si el audio no está habilitado globalmente, NO se reproduce NADA.
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
        const minWordsPerChunk = 7; 
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

        // Mostrar el primer chunk del subtítulo
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
                if (onEndedCallback) { // Si hay un callback, se ejecuta
                    onEndedCallback();
                } else {
                    // Reiniciar el temporizador de inactividad solo si audioEnabled sigue siendo true
                    if (audioEnabled) {
                        toggleInactivityTimer(true); 
                    }
                }
            };
            
        }).catch(e => {
            console.error(`%c[Audio Error] Error al reproducir audio ${audioId}:`, 'color: red;', e);
            console.warn(`%c[Audio Warn] Esto a menudo ocurre debido a políticas de autoplay. Asegúrate de que el usuario haga un primer clic en el botón 'Activar Sonido' o en algún lugar de la página.`, 'color: yellow;');
            // Si el autoplay falla, asegurar que el audioEnabled esté en false y el botón sea visible.
            if (audioId.includes('Bienvenida')) { // Solo para el audio de bienvenida inicial
                audioEnabled = false; 
                if (soundToggleButton) {
                    soundToggleButton.textContent = 'Activar Sonido';
                    soundToggleButton.style.display = 'block'; 
                    soundToggleButton.disabled = false;
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
    clearInterval(countdownInterval);
    console.log("%c[Consola Debug] Contador anterior para el próximo audio reiniciado.", 'color: lightblue;');

    // Solo iniciar el temporizador si el audio está habilitado globalmente
    if (start && audioEnabled) {
        const delay = (Math.random() * 30 + 30) * 1000; 
        
        remainingTimeSeconds = Math.floor(delay / 1000); 
        console.log(`%c[Consola Debug] Próximo audio aleatorio en: ${remainingTimeSeconds} segundos.`, 'color: lightblue;');

        countdownInterval = setInterval(() => {
            remainingTimeSeconds--;
            if (remainingTimeSeconds > 0) {
                console.log(`%c[Consola Debug] Tiempo restante para el próximo audio: ${remainingTimeSeconds} segundos.`, 'color: lightblue;');
            } else {
                clearInterval(countdownInterval);
                console.log("%c[Consola Debug] ¡Reproduciendo próximo audio aleatorio!", 'color: limegreen; font-weight: bold;');
            }
        }, 1000); 

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
    // Solo reproducir si el audio está habilitado globalmente y no hay otro audio sonando
    if (!audioEnabled || currentAudio) { 
        console.log("%c[Random Verse Debug] No se reproduce verso aleatorio: audio deshabilitado o ya hay uno sonando.", 'color: orange;');
        if (audioEnabled) { // Reintentar si no se puede reproducir ahora pero el audio está activo
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
    console.log(`%c[Random Verse Debug] Reproduciendo verso aleatorio: ${verse.id}`, 'color: purple;');
    playAudioWithSubtitle(verse.id, verse.text);
}


// --- Lógica del Bloqueo de Audio por la Secuencia "Idiota" ---

/**
 * Finaliza la secuencia Idiota: reproduce el audio final y bloquea todo el sonido
 * para la **sesión actual del navegador**.
 */
function finishIdiotaSequence() {
    playAudioWithSubtitle(idiotaAudioFinal.id, idiotaAudioFinal.text, () => {
        console.log("%c[Idiota Sequence] Audio final 'Sos un idiota' terminado. Desactivando todo el audio de la web para esta carga de página.", 'color: red; font-weight: bold;');
        
        audioEnabled = false; // Deshabilitar audio globalmente y permanentemente para ESTA CARGA DE PÁGINA
        stopCurrentAudio(); // Asegurar que no quede nada sonando
        toggleInactivityTimer(false); // Detener el temporizador de audios aleatorios
        
        // Actualizar el botón para que indique que el sonido está desactivado y hacerlo visible
        if (soundToggleButton) {
            soundToggleButton.textContent = 'Sonido Desactivado'; 
            soundToggleButton.style.display = 'block'; 
            soundToggleButton.disabled = true; // Deshabilitar el botón
            soundToggleButton.style.opacity = '0.5'; 
            soundToggleButton.style.cursor = 'not-allowed';
            console.log("%c[Idiota Sequence] Botón 'Activar Sonido' deshabilitado.", 'color: red;');
        }
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

// --- Gestión del Sonido Global ---

/**
 * Función para reproducir el audio de bienvenida cuando el usuario activa el sonido.
 */
function playWelcomeAudio() {
    const welcomeAudio = document.getElementById('audioBienvenidaCasual');
    const welcomeSubtitleText = "Ahg, otra vez vos... ¿Qué onda? ¿Qué hacés acá? Sí, la web está en español, pero el audio en inglés porque me da paja grabar mi voz, je. Soy argentino por si querés saber.";
    
    if (welcomeAudio) {
        // Solo reproducir si no se ha reproducido antes en esta carga de página
        if (!welcomeAudio.dataset.played) {
            playAudioWithSubtitle('audioBienvenidaCasual', welcomeSubtitleText, () => {
                welcomeAudio.dataset.played = 'true'; // Marcar como reproducido para esta carga
                if (audioEnabled) { // Solo si el audio sigue habilitado después de la bienvenida
                    toggleInactivityTimer(true);
                }
            });
        } else {
            console.log("%c[Welcome Audio] Audio de bienvenida ya se reprodujo en esta carga. Iniciando temporizador (si audio está habilitado).", 'color: blue;');
            if (audioEnabled) {
                toggleInactivityTimer(true);
            }
        }
    } else {
        console.error("%c[Sound Debug] Audio de bienvenida casual no encontrado. Asegúrate de que el ID esté bien y el archivo esté cargado en el HTML.", 'color: red;');
        if (audioEnabled) {
             toggleInactivityTimer(true); // Si no hay bienvenida, pero el audio está activo, iniciar temporizador.
        }
    }
}


/**
 * Configura el botón de activar/desactivar sonido.
 */
function setupSoundToggleButton() {
    if (!soundToggleButton) {
        console.error("soundToggleButton not found. Make sure an element with id 'soundToggleButton' exists in your HTML.");
        return;
    }

    // Al inicio, el botón debe ser visible y pedir al usuario que active el sonido
    soundToggleButton.textContent = 'Activar Sonido';
    soundToggleButton.style.display = 'block';
    soundToggleButton.disabled = false;
    soundToggleButton.style.opacity = '1';
    soundToggleButton.style.cursor = 'pointer';

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
            playWelcomeAudio(); // Reproducir bienvenida solo si el usuario lo activa
        } else {
            toggleInactivityTimer(false); // Si el usuario desactiva el sonido, detener el temporizador
        }
    });
}


// --- Inicialización de Eventos para Interacciones de Voz ---
function initVoiceInteractions() {
    // 1. Lógica para el clic en el nombre "Emiliano Méndez" (hero-name) (Easter Egg)if (heroNameClickable) {
    let nameClickCount = 0;
    let nameClickTimeout = null;

    heroNameClickable.addEventListener('click', () => {
        if (!audioEnabled) {
            console.log("%c[Name Click Debug] Audio deshabilitado.", 'color: orange;');
            return;
        }

        nameClickCount++;
        console.log(`%c[Name Click Debug] Clic #${nameClickCount}`, 'color: brown;');

        // Reiniciar si el usuario se tarda más de 2 segundos entre clics
        clearTimeout(nameClickTimeout);
        nameClickTimeout = setTimeout(() => {
            console.log('%c[Name Click Debug] Se reinició el contador por inactividad', 'color: gray;');
            nameClickCount = 0;
        }, 2000);

        if (nameClickCount === 12) {
            console.log('%c[Name Click Debug] Se activó el Easter Egg después de 12 clics seguidos', 'color: limegreen;');

            const sequence = [...bastaAudios, ...idiotaAudiosRandom, idiotaAudioFinal];
            playAudioSequence(sequence);
            nameClickCount = 0;
            clearTimeout(nameClickTimeout);
        }
    });
}

// Función para reproducir una secuencia de audios uno tras otro
function playAudioSequence(audios, index = 0) {
    if (index >= audios.length) return;

    const audio = audios[index];
    playAudioWithSubtitle(audio.id, audio.text, () => {
        playAudioSequence(audios, index + 1);
    });
}
    

            // Si el audio está deshabilitado, no reproducimos nada
            if (!audioEnabled) {
                console.log("%c[Name Click Debug] Audio deshabilitado. Haz clic en el botón 'Activar Sonido' para habilitarlo.", 'color: orange;');
                return;
            }
            
            nameClickCount++;

            // Secuencia "Basta" (clics 1 al 5)
            if (nameClickCount >= 1 && nameClickCount <= bastaAudios.length) {
                const audioData = bastaAudios[nameClickCount - 1];
                playAudioWithSubtitle(audioData.id, audioData.text);
            } 
            // Audios aleatorios "Idiota" (del clic 6 al 11)
            else if (nameClickCount > bastaAudios.length && nameClickCount < 12) {
                let nextIdiotaIndex;
                do {
                    nextIdiotaIndex = Math.floor(Math.random() * idiotaAudiosRandom.length);
                } while (idiotaAudiosRandom.length > 1 && nextIdiotaIndex === idiotaSequenceIndex);
                
                idiotaSequenceIndex = nextIdiotaIndex; 
                const audioData = idiotaAudiosRandom[idiotaSequenceIndex];
                playAudioWithSubtitle(audioData.id, audioData.text);

            } 
            // Audio final "Sos un idiota" y bloqueo (al clic 12)
            else if (nameClickCount === 12) {
                finishIdiotaSequence();
                nameClickCount = 0; // Reinicia el contador para una nueva "sesión" si el usuario recarga
            }
        });
    }

    // 2. Voz al tocar el título "Proyectos" más de 3 veces
    if (projectsTitle) {
        projectsTitle.addEventListener('click', () => {
            console.log(`%c[Projects Click Debug] Clic en Proyectos. audioEnabled: ${audioEnabled}, projectsClickCount: ${projectsClickCount + 1}.`, 'color: lightcoral;');
            
            if (!audioEnabled) {
                console.log("%c[Projects Click Debug] Audio desactivado. No se reproduce audio de Proyectos.", 'color: orange;');
                return;
            }
            projectsClickCount++;
            if (projectsClickCount >= 3) {
                playAudioWithSubtitle('audioProyectosBurlon', "Ah, ¿esos son los proyectos en mente? ¡No jodas, nene, andá a otra sección! No hay ningún proyecto por ahora.");
                projectsClickCount = 0; // Reinicia el contador para poder volver a activarlo
            }
        });
    }

    // 3. Voz al tocar "Sobre mí", describe todo lo que dice
    if (aboutTitle) {
        aboutTitle.addEventListener('click', () => {
            console.log(`%c[About Click Debug] Clic en Sobre mí. audioEnabled: ${audioEnabled}.`, 'color: mediumpurple;');
            
            if (!audioEnabled) {
                console.log("%c[About Click Debug] Audio desactivado. No se reproduce audio de Sobre mí.", 'color: orange;');
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


// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupSoundToggleButton(); // Configura el botón de sonido al cargar.
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

// Handle page visibility changes
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
        // Solo reanudar el temporizador si el audio está habilitado Y no hay un audio reproduciéndose
        if (audioEnabled && !currentAudio) { 
            toggleInactivityTimer(true); 
        }
        console.log(`%c[Visibility Debug] Página visible. Audio y temporizador reanudados si audioEnabled: ${audioEnabled}.`, 'color: grey;');
    }
});