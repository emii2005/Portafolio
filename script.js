// GSAP Registration
gsap.registerPlugin(ScrollTrigger);

// Three.js Scene Setup
let scene, camera, renderer, cube;
let cubeGroup;

// --- Variables de Control Globales ---
let currentAudio = null; // Para controlar qué audio se está reproduciendo
let audioEnabled = false; // Estado global del audio (inicialmente false, activado por interacción)

// Bandera para el modo idiota persistente en localStorage para una sesión
let idiotaWelcomeTriggered = localStorage.getItem('idiotaWelcomeTriggered') === 'true'; 
// ELIMINADA: allAudioPermanentlyDisabled ya no es necesaria para este flujo.
// La deshabilitación permanente solo era para el flujo anterior.

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
const idiotaAudioFinal = { id: 'audioIdiota3', text: '¡Sos un idiota! Conmigo no vas a escuchar más nada. Adiós a los sonidos de esta web.' };


// Referencias a elementos HTML para eventos de clic
const heroNameClickable = document.getElementById('hero-name-clickable'); 
const projectsTitle = document.getElementById('projects-title');
const aboutTitle = document.getElementById('about-title');
const aboutText1 = document.getElementById('about-text-1');
const aboutText2 = document.getElementById('about-text-2');


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
    // CAMBIO CLAVE: Ya no verificamos allAudioPermanentlyDisabled aquí.
    // La reproducción solo depende de audioEnabled.
    if (!audioEnabled) {
        console.log(`[Audio Debug] Intento de reproducir audio ${audioId} pero audioEnabled es false.`);
        if (onEndedCallback) onEndedCallback();
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
            console.warn(`[Audio Warn] Esto a menudo ocurre en móvil debido a políticas de autoplay. Asegúrate de que el usuario haga un primer clic en el botón 'Activar Sonido'.`);
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

    // CAMBIO CLAVE: Solo iniciar el temporizador si el audio está habilitado.
    // Ya no hay una "deshabilitación permanente" que lo impida.
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
    // CAMBIO CLAVE: Ya no verificamos allAudioPermanentlyDisabled aquí.
    if (!audioEnabled || currentAudio) {
        console.log("[Random Verse Debug] No se reproduce verso aleatorio: audio deshabilitado o ya hay uno sonando.");
        if (audioEnabled) toggleInactivityTimer(true); 
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

// ELIMINADA: La función disableAllAudioPermanently() ya no es necesaria.

/**
 * Inicia la secuencia "idiota": reproduce un aleatorio, luego el final.
 */
function startIdiotaSequence() {
    // CAMBIO CLAVE: No hay allAudioPermanentlyDisabled que impida esto.
    const randomIdiota = idiotaAudiosRandom[Math.floor(Math.random() * idiotaAudiosRandom.length)];
    
    playAudioWithSubtitle(randomIdiota.id, randomIdiota.text, () => {
        // Callback: Cuando el audio randomIdiota termina, reproducir idiotaAudioFinal
        playAudioWithSubtitle(idiotaAudioFinal.id, idiotaAudioFinal.text, () => {
            // Callback: Cuando idiotaAudioFinal termina
            localStorage.setItem('idiotaWelcomeTriggered', 'true'); // Marca para la *próxima* sesión
            console.log("[localStorage] Bandera 'idiotaWelcomeTriggered' establecida a true.");
            nameClickCount = 0; // Reiniciar el contador de clics del nombre
            // CAMBIO CLAVE: No deshabilitamos el audio aquí. Sigue funcionando.
            // El botón de sonido tampoco se deshabilita ni cambia de texto.
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

// --- Gestión del Sonido Global y Bienvenida Condicional ---
function setupSoundToggleButton() {
    if (!soundToggleButton) {
        console.error("soundToggleButton not found. Make sure an element with id 'soundToggleButton' exists in your HTML.");
        return;
    }

    // CAMBIO CLAVE: El botón nunca se deshabilita permanentemente.
    soundToggleButton.disabled = false;
    soundToggleButton.style.opacity = '1';
    soundToggleButton.style.cursor = 'pointer';

    soundToggleButton.addEventListener('click', () => {
        audioEnabled = !audioEnabled;
        soundToggleButton.textContent = audioEnabled ? 'Desactivar Sonido' : 'Activar Sonido';
        stopCurrentAudio(); // Detener cualquier audio al cambiar el estado
        console.log(`[Sound Toggle] audioEnabled ahora es: ${audioEnabled}`); 
        
        if (audioEnabled) {
            // Si el audio se activa manualmente y NO estamos en modo idiota por localStorage
            if (!idiotaWelcomeTriggered) {
                const bienvenidaAudio = document.getElementById('audioBienvenidaCasual');
                if (bienvenidaAudio && !bienvenidaAudio.dataset.played) {
                     playAudioWithSubtitle('audioBienvenidaCasual', "Ahg, otra vez vos... ¿Qué onda? ¿Qué hacés acá? Sí, la web está en español, pero el audio en inglés porque me da paja grabar mi voz, je. Soy argentino por si querés saber.");
                     bienvenidaAudio.dataset.played = 'true'; 
                } else if (!bienvenidaAudio) {
                     console.error("[Sound Debug] Audio de bienvenida casual no encontrado.");
                     toggleInactivityTimer(true); 
                } else {
                    // Si la bienvenida ya se reprodujo, pero se activa el sonido, inicia el temporizador
                    toggleInactivityTimer(true);
                }
            } else {
                // Si idiotaWelcomeTriggered es true, la bienvenida idiota se maneja al inicio,
                // así que solo iniciar el temporizador si no hay audio sonando.
                if (!currentAudio) {
                    toggleInactivityTimer(true);
                }
            }
        } else {
            toggleInactivityTimer(false); // Detener el temporizador si el audio se desactiva
        }
    });

    // --- Lógica de Bienvenida al cargar la página ---
    const bienvenidaCasual = document.getElementById('audioBienvenidaCasual');
    const bienvenidaIdiota = document.getElementById('audioBienvenidaIdiota');

    if (idiotaWelcomeTriggered) {
        // Si el modo idiota se activó en la sesión anterior, reproducir la bienvenida idiota
        if (bienvenidaIdiota) {
            audioEnabled = true; // Habilitamos el audio para esta reproducción
            soundToggleButton.textContent = 'Desactivar Sonido';
            soundToggleButton.style.display = 'block'; // Aseguramos que el botón sea visible
            
            playAudioWithSubtitle('audioBienvenidaIdiota', "¡Volviste, idiota! ¿No te bastó con lo que pasó antes? Ya te advertí.", () => {
                // Callback: Cuando el audio de bienvenida idiota termina
                audioEnabled = true; // Mantenemos audioEnabled true si el usuario no lo desactiva manualmente
                localStorage.removeItem('idiotaWelcomeTriggered'); // CAMBIO CLAVE: Eliminar la bandera AHORA
                console.log("[localStorage] Bandera 'idiotaWelcomeTriggered' eliminada. Próxima recarga será normal.");
                toggleInactivityTimer(true); // Reiniciar el temporizador de inactividad
            });
            bienvenidaIdiota.dataset.played = 'true'; 
        } else {
            console.error("[Sound Debug] Audio de bienvenida idiota no encontrado.");
            localStorage.removeItem('idiotaWelcomeTriggered'); // Limpiamos la bandera si el audio no existe
            soundToggleButton.style.display = 'block'; // Mostrar botón
            audioEnabled = false; // El audio sigue deshabilitado
        }
    } else {
        // Comportamiento normal si no está el modo idiota activado
        if (bienvenidaCasual) {
            bienvenidaCasual.play()
                .then(() => {
                    audioEnabled = true;
                    soundToggleButton.textContent = 'Desactivar Sonido';
                    soundToggleButton.style.display = 'none'; // Ocultar si se reproduce auto
                    console.log("[Sound Debug] Audio de bienvenida casual reproducido automáticamente.");
                    bienvenidaCasual.dataset.played = 'true'; 
                    toggleInactivityTimer(true); // Iniciar temporizador después de bienvenida automática
                })
                .catch(e => {
                    console.warn("[Sound Warn] Autoplay de bienvenida casual bloqueado. El botón 'Activar Sonido' está visible.", e);
                    soundToggleButton.style.display = 'block'; // Mostrar botón si autoplay falla
                    audioEnabled = false;
                });
        }
    }
}


// --- Inicialización de Eventos para Interacciones de Voz ---
function initVoiceInteractions() {

    // 1. Lógica para la secuencia "Basta" e "Idiota" al hacer clic en el nombre
    if (heroNameClickable) {
        heroNameClickable.addEventListener('click', () => {
            console.log(`[Name Click Debug] Clic en el nombre. Clicks: ${nameClickCount + 1}. AudioEnabled: ${audioEnabled}.`);
            
            // Si el audio no está habilitado por el usuario, informarle y salir.
            if (!audioEnabled) {
                console.log("[Name Click] El sonido está desactivado. Haz clic en el botón 'Activar Sonido' para habilitarlo.");
                return;
            }

            nameClickCount++;

            if (nameClickCount >= 7 && nameClickCount <= 11) {
                // Secuencia "Basta"
                const currentBastaAudio = bastaAudios[nameClickCount - 7]; 
                if (currentBastaAudio) {
                    playAudioWithSubtitle(currentBastaAudio.id, currentBastaAudio.text);
                } else {
                    console.warn(`[Name Click] No hay audio definido para basta${nameClickCount - 6}.`);
                }
            } else if (nameClickCount === 12) {
                // Iniciar secuencia "Idiota"
                console.log("[Name Click] ¡Límite de clics alcanzado! Iniciando secuencia 'Idiota'.");
                startIdiotaSequence();
            } else if (nameClickCount > 12) {
                // Una vez que la secuencia "idiota" se activó, este listener no debería hacer nada más
                console.log("[Name Click] La secuencia 'Idiota' ya se ha activado. Clics ignorados.");
                nameClickCount = 12; // Mantenerlo en 12 para que no siga contando innecesariamente
            }
        });
    }

    // 2. Voz al tocar el título "Proyectos" más de 3 veces
    if (projectsTitle) {
        projectsTitle.addEventListener('click', () => {
            // CAMBIO CLAVE: Ya no verificamos allAudioPermanentlyDisabled aquí.
            if (!audioEnabled) {
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
            // CAMBIO CLAVE: Ya no verificamos allAudioPermanentlyDisabled aquí.
            if (!audioEnabled) {
                console.log("[About Click] El sonido está desactivado.");
                return;
            }
            let fullAboutText = '';
            if (aboutText1) {
                fullAboutText += aboutText1.textContent.trim();
            }
            playAudioWithSubtitle('audioSobreMiNarrativo', fullAboutText);
        });
    }
}


// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupSoundToggleButton();
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
        // CAMBIO CLAVE: Ya no verificamos allAudioPermanentlyDisabled aquí.
        if (audioEnabled && !currentAudio) { 
            toggleInactivityTimer(true); 
        }
        console.log(`[Visibility Debug] Página visible. Audio y temporizador reanudados si audioEnabled: ${audioEnabled}.`);
    }
});