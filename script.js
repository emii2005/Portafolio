// GSAP Registration
gsap.registerPlugin(ScrollTrigger);

// Three.js Scene Setup
let scene, camera, renderer, cube;
let cubeGroup;

// --- Variables para control de Audio y Subtítulos ---
let currentAudio = null; // Para controlar qué audio se está reproduciendo
let audioEnabled = false; // Estado global del audio (inicialmente false, activado por interacción)

const subtitleContainer = document.getElementById('subtitleContainer');
const subtitleText = document.getElementById('subtitleText'); // Donde se muestra el texto del subtítulo
const soundToggleButton = document.getElementById('soundToggleButton');

// Contadores de clics
let cubeClickCount = 0;
let projectsClickCount = 0;

// Versos aleatorios con sus textos (ASEGÚRATE QUE LOS AUDIOS COINCIDAN CON ESTOS TEXTOS)
const randomVerses = [
    { id: 'audioVersoColor', text: '¿Sabías que mi color favorito es el negro???' },
    { id: 'audioVersoIrritado', text: 'Ahhh, ¿cuándo te vas a ir, mi querido amigo? Ya jodés.' },
    { id: 'audioVersoRepetido', text: '¿Sabías que la mayoría de estos audios se repiten? Porque me da una paja hacer más audios, je.' },
];
let lastVerseIndex = -1; // Para evitar repetir el último verso
let inactivityTimer; // Para el temporizador de versos aleatorios

// Referencias a elementos HTML para eventos de clic
const cubeContainer = document.getElementById('cube-container');
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
        currentAudio.ontimeupdate = null; // NEW: Limpiar el evento ontimeupdate
        currentAudio = null;
    }
    if (subtitleContainer) {
        subtitleContainer.classList.remove('show');
    }
    if (subtitleText) {
        subtitleText.textContent = '';
    }
    
    if (audioEnabled) {
        toggleInactivityTimer(true);
    }
}

/**
 * Reproduce un audio y muestra su subtítulo, dividiéndolo en chunks.
 * Asegura que solo un audio se reproduzca a la vez.
 * @param {string} audioId - El ID del elemento <audio> en el HTML.
 * @param {string} subtitleContent - El texto completo a mostrar como subtítulo.
 */
function playAudioWithSubtitle(audioId, subtitleContent) {
    if (!audioEnabled) return;

    stopCurrentAudio(); // Detener el audio actual antes de reproducir uno nuevo

    const audio = document.getElementById(audioId);
    if (audio) {
        currentAudio = audio;

        // NEW: Preparar los segmentos del subtítulo
        const words = subtitleContent.split(/\s+/); // Dividir por espacios
        const minWordsPerChunk = 10;
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
            subtitleText.textContent = chunks[0] || ''; // Muestra el primer chunk o vacío
            subtitleContainer.classList.add('show');
        }

        audio.play().then(() => {
            // NEW: Manejar la actualización del subtítulo con el tiempo
            audio.ontimeupdate = () => {
                // Estimación simple: divide la duración total del audio por el número de chunks.
                // Esto no es perfecto, un archivo VTT sería lo ideal para sincronización precisa.
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
                stopCurrentAudio(); // Ocultar subtítulo cuando el audio termine
            };
            
        }).catch(e => {
            console.error(`Error al reproducir audio ${audioId}:`, e);
            stopCurrentAudio();
        });

        toggleInactivityTimer(true);
    }
}

/**
 * Inicia o detiene el temporizador de versos aleatorios.
 */
function toggleInactivityTimer(start) {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }
    if (start && audioEnabled) {
        const randomDelay = (Math.random() * 60 + 60) * 1000; // entre 60 y 120 segundos
        inactivityTimer = setTimeout(playRandomVerse, randomDelay);
    }
}

/**
 * Reproduce un verso aleatorio que no sea el último.
 */
function playRandomVerse() {
    if (!audioEnabled || currentAudio) {
        toggleInactivityTimer(true);
        return;
    }

    let nextVerseIndex;
    do {
        nextVerseIndex = Math.floor(Math.random() * randomVerses.length);
    } while (nextVerseIndex === lastVerseIndex && randomVerses.length > 1);

    lastVerseIndex = nextVerseIndex;
    const verse = randomVerses[nextVerseIndex];
    playAudioWithSubtitle(verse.id, verse.text);
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

// --- Gestión del Sonido Global ---
function setupSoundToggleButton() {
    if (!soundToggleButton) {
        console.error("soundToggleButton not found. Make sure an element with id 'soundToggleButton' exists in your HTML.");
        return;
    }

    soundToggleButton.addEventListener('click', () => {
        audioEnabled = !audioEnabled;
        soundToggleButton.textContent = audioEnabled ? 'Desactivar Sonido' : 'Activar Sonido';
        stopCurrentAudio();
        
        if (audioEnabled) {
            const bienvenidaAudio = document.getElementById('audioBienvenidaCasual');
            if (bienvenidaAudio && !bienvenidaAudio.dataset.played) {
                 playAudioWithSubtitle('audioBienvenidaCasual', "Ahg, otra vez vos... ¿Qué onda? ¿Qué hacés acá? Sí, la web está en español, pero el audio en inglés porque me da paja grabar mi voz, je. Soy argentino por si querés saber.");
                 bienvenidaAudio.dataset.played = 'true';
            }
            toggleInactivityTimer(true);
        } else {
            toggleInactivityTimer(false);
        }
    });

    const bienvenidaAudio = document.getElementById('audioBienvenidaCasual');
    if (bienvenidaAudio) {
        bienvenidaAudio.play()
            .then(() => {
                audioEnabled = true;
                soundToggleButton.textContent = 'Desactivar Sonido';
                soundToggleButton.style.display = 'none';
                toggleInactivityTimer(true);
                console.log("Audio de bienvenida reproducido automáticamente.");
            })
            .catch(e => {
                console.warn("Autoplay de bienvenida bloqueado. El botón 'Activar Sonido' está visible.");
                soundToggleButton.style.display = 'block';
                audioEnabled = false;
            });
    }
}


// --- Inicialización de Eventos para Interacciones de Voz ---
function initVoiceInteractions() {
    // 1. Voz en off al entrar a la web: Manejado por setupSoundToggleButton()

    // 2. Voz al tocar el cubo más de 3 veces
    if (cubeContainer) {
        cubeContainer.addEventListener('click', () => {
            if (!audioEnabled) {
                console.log("El sonido está desactivado. Haz clic en el botón 'Activar Sonido' para habilitarlo.");
                return;
            }
            cubeClickCount++;
            if (cubeClickCount >= 3) {
                playAudioWithSubtitle('audioCuboSarcasmo', "¡Alto cubo, VISTE! Por favor, apreciado un montón. Me costó una hora y treinta minutos de mi vida. Cubo del ojete...");
                cubeClickCount = 0;
            }
        });
    }

    // 3. Voz al tocar el título "Proyectos" más de 3 veces
    if (projectsTitle) {
        projectsTitle.addEventListener('click', () => {
            if (!audioEnabled) {
                console.log("El sonido está desactivado. Haz clic en el botón 'Activar Sonido' para habilitarlo.");
                return;
            }
            projectsClickCount++;
            if (projectsClickCount >= 3) {
                playAudioWithSubtitle('audioProyectosBurlon', "Ah, ¿esos son los proyectos en mente? ¡No jodas, nene, andá a otra sección! No hay ningún proyecto por ahora.");
                projectsClickCount = 0;
            }
        });
    }

    // 4. Voz al tocar "Sobre mí", describe todo lo que dice
    if (aboutTitle) {
        aboutTitle.addEventListener('click', () => {
            if (!audioEnabled) {
                console.log("El sonido está desactivado. Haz clic en el botón 'Activar Sonido' para habilitarlo.");
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

    // 5. Versos aleatorios - manejado por toggleInactivityTimer y playRandomVerse
    // Resetear el temporizador de inactividad con cualquier interacción del usuario
    document.addEventListener('mousemove', () => toggleInactivityTimer(true));
    document.addEventListener('keypress', () => toggleInactivityTimer(true));
    document.addEventListener('scroll', () => toggleInactivityTimer(true));
}


// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupSoundToggleButton();
    initThreeJS();
    
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
        toggleInactivityTimer(true);
    }
});