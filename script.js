// GSAP Registration
gsap.registerPlugin(ScrollTrigger);

// Three.js Scene Setup
let scene, camera, renderer, cube;
let cubeGroup;

// --- Variables de Control Globales ---
let currentAudio = null; // Para controlar qué audio se está reproduciendo
// audioEnabled comienza en true para intentar el autoplay de bienvenida normal.
// Si el autoplay falla (común en algunos navegadores/móviles), se ajustará a false y el botón se hará visible como "Activar Sonido".
let audioEnabled = true; 

// ¡Eliminamos idiotaWelcomeTriggered! El efecto es solo en la sesión actual.

const subtitleContainer = document.getElementById('subtitleContainer');
const subtitleText = document.getElementById('subtitleText');
const soundToggleButton = document.getElementById('soundToggleButton');

// Contadores de clics e índices de secuencia
let projectsClickCount = 0;
let nameClickCount = 0; // Contador para los clics en el nombre

// Versos aleatorios (incluye el antiguo audio del cubo)
const randomVerses = [
    { id: 'audioVersoColor', text: '¿Sabías que mi color favorito es el negro???' },
    { id: 'audioVersoIrritado', text: 'Ahhh, ¿cuándo te vas a ir, mi querido amigo? Ya jodés.' },
    { id: 'audioVersoRepetido', text: '¿Sabías que la mayoría de estos audios se repiten? Porque me da una paja hacer más audios, je.' },
    { id: 'audioCuboSarcasmo', text: '¡Alto cubo, VISTE! Por favor, apreciado un montón. Me costó una hora y treinta minutos de mi vida. Cubo del ojete...' },
];
let lastVerseIndex = -1; // Para evitar repetir el último verso

let inactivityTimer; // Para el temporizador de versos aleatorios
let countdownInterval; // Nuevo: Para el contador regresivo en la consola
let remainingTimeSeconds = 0; // Nuevo: Para almacenar los segundos restantes

// Secuencia de audios "Basta"
const bastaAudios = [
    { id: 'audioBasta1', text: 'Basta uno. Ya te dije que basta.' },
    { id: 'audioBasta2', text: 'Basta dos. ¿No entendés?' },
    { id: 'audioBasta3', text: 'Basta tres. Me estás irritando.' },
    { id: 'audioBasta4', text: 'Basta cuatro. De verdad, para.' },
    { id: 'audioBasta5', text: 'Basta cinco. Te lo pido por favor.' },
];

// Secuencia de audios "Idiota"
const idiotaAudiosRandom = [
    { id: 'audioIdiota1', text: '¿En serio? ¿Todavía seguís? Ya es suficiente.' },
    { id: 'audioIdiota2', text: '¡Qué testarudez! No tenés remedio, seguís haciendo clic.' },
];
// Este audio ahora BLOQUEARÁ el sonido en la sesión actual al terminar
const idiotaAudioFinal = { id: 'audioIdiota3', text: '¡Sos un idiota! Conmigo no vas a escuchar más nada. Adiós a los sonidos de esta web.' };


// Referencias a elementos HTML para eventos de clic
const heroNameClickable = document.getElementById('hero-name-clickable'); 
const projectsTitle = document.getElementById('projects-title');
const aboutTitle = document.getElementById('about-title');
const aboutText1 = document.getElementById('about-text-1'); // Asumo que tienes un elemento con este ID para el texto del "Sobre mí"
const aboutText2 = document.getElementById('about-text-2'); // Y este también, si el texto está dividido


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
    // Si el audio no está habilitado, NO se reproduce NADA.
    if (!audioEnabled) { 
        console.log(`[Audio Debug] Intento de reproducir audio ${audioId} pero audioEnabled es false.`);
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

        if (subtitleContainer && subtitleText) {
            subtitleText.textContent = chunks[0] || '';
            subtitleContainer.classList.add('show');
        }

        audio.load(); // Forzar la carga del audio
        
        audio.play().then(() => {
            console.log(`[Audio Debug] Audio ${audioId} se reprodujo con éxito.`);

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
                if (onEndedCallback) {
                    onEndedCallback();
                } else {
                    // Reiniciar el temporizador de inactividad si no hay un callback específico
                    toggleInactivityTimer(true); 
                }
            };
            
        }).catch(e => {
            console.error(`[Audio Error] Error al reproducir audio ${audioId}:`, e);
            console.warn(`[Audio Warn] Autoplay puede ser bloqueado por el navegador. Ajustando audioEnabled a false y mostrando botón.`);
            audioEnabled = false; // Deshabilitar audio si autoplay falla
            if (soundToggleButton) {
                soundToggleButton.textContent = 'Activar Sonido';
                soundToggleButton.style.display = 'block'; // Mostrar el botón
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
    clearInterval(countdownInterval);
    console.log("[Consola Debug] Contador anterior para el próximo audio reiniciado.");

    // Solo iniciar el temporizador si el audio está habilitado.
    if (start && audioEnabled) {
        const delay = (Math.random() * 30 + 30) * 1000; // Retraso aleatorio entre 30 y 60 segundos
        
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
        console.log(`[Timer Debug] Temporizador de inactividad iniciado para ${delay / 1000} segundos.`);
    } else if (!start) {
        console.log("[Timer Debug] Temporizador de inactividad detenido.");
    }
}

/**
 * Reproduce un verso aleatorio que no sea el último.
 */
function playRandomVerse() {
    if (!audioEnabled || currentAudio) { // Siempre verificar audioEnabled
        console.log("[Random Verse Debug] No se reproduce verso aleatorio: audio deshabilitado o ya hay uno sonando.");
        if (audioEnabled) toggleInactivityTimer(true); // Reiniciar timer si el audio está habilitado pero no se pudo reproducir
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


// --- Lógica de la Secuencia "Basta" e "Idiota" ---

/**
 * Inicia la secuencia "idiota": reproduce un aleatorio, luego el final.
 */
function startIdiotaSequence() {
    const randomIdiota = idiotaAudiosRandom[Math.floor(Math.random() * idiotaAudiosRandom.length)];
    
    playAudioWithSubtitle(randomIdiota.id, randomIdiota.text, () => {
        // Callback: Cuando el audio randomIdiota termina, reproducir idiotaAudioFinal
        playAudioWithSubtitle(idiotaAudioFinal.id, idiotaAudioFinal.text, () => {
            // Callback: Cuando idiotaAudioFinal termina
            console.log("[Idiota Sequence] Audio final 'Sos un idiota' terminado. Desactivando todo el audio de la web por esta sesión.");
            
            // --- CRUCIAL: Desactivar todo el audio de la web por el resto de la sesión actual ---
            audioEnabled = false; 
            stopCurrentAudio(); // Asegurar que no quede nada sonando
            toggleInactivityTimer(false); // Detener el temporizador de versos aleatorios

            // Actualizar el botón para que indique que el sonido está desactivado y hacerlo visible
            if (soundToggleButton) {
                soundToggleButton.textContent = 'Activar Sonido';
                soundToggleButton.style.display = 'block'; // Asegurar que el botón sea visible
            }
            nameClickCount = 0; // Reiniciar el contador de clics del nombre
        });
    });
}


// --- Inicialización de Three.js (sin cambios significativos en esta lógica) ---
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

// --- GSAP Animations ---
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

// VanillaTilt initialization
function initTilt() {
    VanillaTilt.init(document.querySelectorAll(".project-card"), {
        max: 15,
        speed: 1000,
        glare: true,
        "max-glare": 0.2,
    });
}

// Smooth scrolling for navigation
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

// Parallax effects
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

// --- Gestión del Sonido Global y Bienvenida ---
function setupSoundToggleButton() {
    if (!soundToggleButton) {
        console.error("soundToggleButton not found. Make sure an element with id 'soundToggleButton' exists in your HTML.");
        return;
    }

    // Inicialmente, el botón estará oculto si el autoplay funciona.
    // Si el autoplay falla, se mostrará como "Activar Sonido".
    soundToggleButton.style.display = 'none'; 
    soundToggleButton.disabled = false;
    soundToggleButton.style.opacity = '1';
    soundToggleButton.style.cursor = 'pointer';

    // Establecer el texto inicial del botón basándose en el estado de audioEnabled.
    // Aunque oculto, su texto interno ya debe reflejar su estado lógico.
    soundToggleButton.textContent = audioEnabled ? 'Desactivar Sonido' : 'Activar Sonido';

    soundToggleButton.addEventListener('click', () => {
        // Al hacer clic, se invierte el estado de audioEnabled
        audioEnabled = !audioEnabled;
        soundToggleButton.textContent = audioEnabled ? 'Desactivar Sonido' : 'Activar Sonido';
        stopCurrentAudio(); // Detener cualquier audio al cambiar el estado
        console.log(`[Sound Toggle] audioEnabled ahora es: ${audioEnabled}`); 
        
        if (audioEnabled) {
            // Si el audio se acaba de activar por el usuario, intentamos reproducir la bienvenida casual
            // (Solo si no se ha reproducido ya en esta sesión por el autoplay inicial fallido)
            handleWelcomeAudioPlayback(true); // Pasar 'true' para indicar que es un click manual
            soundToggleButton.style.display = 'none'; // Si lo activó, ocultar de nuevo
        } else {
            // Si el audio se desactiva manualmente
            toggleInactivityTimer(false); // Detener el temporizador de audios aleatorios
            soundToggleButton.style.display = 'block'; // Mostrar el botón
        }
    });
}

/**
 * Función central para manejar la reproducción del audio de bienvenida.
 * Siempre reproduce la bienvenida casual en esta versión.
 * @param {boolean} fromManualClick - Indica si la llamada viene de un clic manual en el botón.
 */
function handleWelcomeAudioPlayback(fromManualClick = false) {
    const welcomeAudioId = 'audioBienvenidaCasual';
    const welcomeSubtitleText = "Ahg, otra vez vos... ¿Qué onda? ¿Qué hacés acá? Sí, la web está en español, pero el audio en inglés porque me da paja grabar mi voz, je. Soy argentino por si querés saber.";
    
    const currentWelcomeAudio = document.getElementById(welcomeAudioId);

    // Solo reproducir la bienvenida si existe y no se ha reproducido ya en esta sesión.
    if (currentWelcomeAudio && !currentWelcomeAudio.dataset.played) {
        playAudioWithSubtitle(welcomeAudioId, welcomeSubtitleText, () => {
            // Callback después de reproducir el audio de bienvenida
            toggleInactivityTimer(true); // Iniciar el temporizador de audios aleatorios después de la bienvenida
        });
        currentWelcomeAudio.dataset.played = 'true'; // Marcar como reproducido para esta sesión
        if (soundToggleButton && !fromManualClick) { // Si no viene de un click manual, y el autoplay funciona, ocultar el botón
            soundToggleButton.textContent = 'Desactivar Sonido'; // Poner el botón en estado 'Desactivar'
            soundToggleButton.style.display = 'none'; // Ocultar el botón si el autoplay fue exitoso
        }
    } else if (!currentWelcomeAudio) {
        console.error(`[Sound Debug] Audio de bienvenida (${welcomeAudioId}) no encontrado. Asegúrate de tenerlo en tu HTML.`);
        audioEnabled = false; // Deshabilitar audio si no se encuentra el archivo de bienvenida
        if (soundToggleButton) {
            soundToggleButton.textContent = 'Activar Sonido';
            soundToggleButton.style.display = 'block'; // Mostrar el botón
        }
        toggleInactivityTimer(false); // No iniciar temporizador si no hay audio de bienvenida
    } else if (fromManualClick) { 
        // Si ya se reprodujo en esta sesión (por autoplay) y ahora se activa manualmente,
        // o si el autoplay falló pero el usuario hizo clic después.
        console.log(`[Sound Debug] Audio de bienvenida (${welcomeAudioId}) ya se reprodujo o intentó reproducir en esta sesión.`);
        toggleInactivityTimer(true); // Iniciar el temporizador (si audioEnabled es true y no hay audio sonando)
        soundToggleButton.style.display = 'none'; // Si se activó manualmente, ocultar el botón
    } else {
        // Caso: Autoplay ya se intentó (con éxito o fallo), y no es un click manual.
        // Si audioEnabled es false, el botón ya debería estar visible.
        if (!audioEnabled && soundToggleButton.style.display === 'none') {
            soundToggleButton.style.display = 'block';
            soundToggleButton.textContent = 'Activar Sonido';
        }
        toggleInactivityTimer(true); // Siempre intenta iniciar el timer si audioEnabled es true
    }
}


// --- Inicialización de Eventos para Interacciones de Voz ---
function initVoiceInteractions() {

    // 1. Lógica para la secuencia "Basta" e "Idiota" al hacer clic en el nombre
    if (heroNameClickable) {
        heroNameClickable.addEventListener('click', () => {
            console.log(`[Name Click Debug] Clic en el nombre. Clicks: ${nameClickCount + 1}. AudioEnabled: ${audioEnabled}.`);
            
            // Si el audio no está habilitado por el usuario (o por el modo idiota), salir.
            if (!audioEnabled) {
                console.log("[Name Click] El sonido está desactivado. Haz clic en el botón 'Activar Sonido' para habilitarlo (si aplica).");
                return;
            }

            nameClickCount++;

            if (nameClickCount >= 7 && nameClickCount <= 11) {
                // Secuencia "Basta"
                const currentBastaAudio = bastaAudios[nameClickCount - 7]; 
                if (currentBastaAudio) {
                    playAudioWithSubtitle(currentBastaAudio.id, currentBastaAudio.text);
                } else {
                    console.warn(`[Name Click] No hay audio definido para basta${nameClickCount - 6}. Asegúrate de tener los audios basta1 a basta5.`);
                }
            } else if (nameClickCount === 12) {
                // Iniciar secuencia "Idiota"
                console.log("[Name Click] ¡Límite de clics alcanzado! Iniciando secuencia 'Idiota' y bloqueando audio al finalizar.");
                startIdiotaSequence();
            } else if (nameClickCount > 12) {
                // Una vez que la secuencia "idiota" se activó, este listener no debería hacer nada más
                console.log("[Name Click] La secuencia 'Idiota' ya se ha activado para esta sesión. Clics ignorados.");
                nameClickCount = 12; // Mantenerlo en 12 para que no siga contando innecesariamente
            }
        });
    }

    // 2. Voz al tocar el título "Proyectos" más de 3 veces
    if (projectsTitle) {
        projectsTitle.addEventListener('click', () => {
            if (!audioEnabled) { // Verificar audioEnabled
                console.log("[Projects Click] El sonido está desactivado.");
                return;
            }
            projectsClickCount++;
            if (projectsClickCount >= 3) {
                playAudioWithSubtitle('audioProyectosBurlon', "Ah, ¿esos son los proyectos en mente? ¡No jodas, nene, andá a otra sección! No hay ningún proyecto por ahora.");
                projectsClickCount = 0; 
            }
        });
    }

    // 3. Voz al tocar "Sobre mí", describe todo lo que dice
    if (aboutTitle) {
        aboutTitle.addEventListener('click', () => {
            if (!audioEnabled) { // Verificar audioEnabled
                console.log("[About Click] El sonido está desactivado.");
                return;
            }
            let fullAboutText = '';
            // Asegúrate que los IDs de estos elementos de texto existan en tu HTML
            if (aboutText1) {
                fullAboutText += aboutText1.textContent.trim();
            }
            if (aboutText2) { // Si tienes un segundo párrafo
                fullAboutText += " " + aboutText2.textContent.trim();
            }
            // Utiliza audios_sobre_mi_descripcion.mp3 para este audio
            playAudioWithSubtitle('audios_sobre_mi_descripcion', fullAboutText);
        });
    }
}


// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupSoundToggleButton(); // Configura el botón y su estado inicial

    // Intentar reproducir el audio de bienvenida casual automáticamente al cargar la página
    handleWelcomeAudioPlayback(); 

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
        if (audioEnabled && !currentAudio) { 
            toggleInactivityTimer(true); 
        }
        console.log(`[Visibility Debug] Página visible. Audio y temporizador reanudados si audioEnabled: ${audioEnabled}.`);
    }
});