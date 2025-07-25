// GSAP Registration
gsap.registerPlugin(ScrollTrigger);

// Three.js Scene Setup
let scene, camera, renderer, cube;
let cubeGroup;

function initThreeJS() {
    const container = document.getElementById('cube-container');
    
    // Scene
    scene = new THREE.Scene();
    
    // Camera
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(4, 4, 4);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true 
    });
    renderer.setSize(300, 300);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    // Lighting - Enhanced for better cube visibility
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
    
    // Create Rubik's Cube
    createRubiksCube();
    
    // Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1;
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        
        // Add subtle floating animation
        if (cubeGroup) {
            cubeGroup.rotation.y += 0.005;
            cubeGroup.position.y = Math.sin(Date.now() * 0.001) * 0.1;
        }
        
        renderer.render(scene, camera);
    }
    
    animate();
    
    // Handle resize
    function handleResize() {
        const size = window.innerWidth <= 768 ? 250 : 300;
        camera.aspect = 1;
        camera.updateProjectionMatrix();
        renderer.setSize(size, size);
        
        // Update container size
        container.style.width = size + 'px';
        container.style.height = size + 'px';
    }
    
    window.addEventListener('resize', handleResize);
    handleResize();
}

function createRubiksCube() {
    cubeGroup = new THREE.Group();
    
    // Create materials with better contrast - dark grays and subtle colors
    const materials = [
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.9, roughness: 0.1 }), // Dark gray
        new THREE.MeshStandardMaterial({ color: 0x404040, metalness: 0.8, roughness: 0.15 }), // Medium gray
        new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.9, roughness: 0.1 }), // Dark blue-gray
        new THREE.MeshStandardMaterial({ color: 0x2d2d3a, metalness: 0.8, roughness: 0.15 }), // Dark purple-gray
        new THREE.MeshStandardMaterial({ color: 0x3a2d2d, metalness: 0.9, roughness: 0.1 }), // Dark red-gray
        new THREE.MeshStandardMaterial({ color: 0x2d3a2d, metalness: 0.8, roughness: 0.15 })  // Dark green-gray
    ];
    
    // Create 3x3x3 cube structure with better spacing
    const cubeSize = 0.9;
    const gap = 0.1;
    
    for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
            for (let z = 0; z < 3; z++) {
                const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
                
                // Add rounded edges
                geometry.userData = { roundedEdges: true };
                
                const material = materials[Math.floor(Math.random() * materials.length)].clone();
                
                // Add more variation for better visibility
                material.metalness = 0.8 + Math.random() * 0.1;
                material.roughness = 0.05 + Math.random() * 0.1;
                
                const smallCube = new THREE.Mesh(geometry, material);
                
                smallCube.position.set(
                    (x - 1) * (cubeSize + gap),
                    (y - 1) * (cubeSize + gap),
                    (z - 1) * (cubeSize + gap)
                );
                
                smallCube.castShadow = true;
                smallCube.receiveShadow = true;
                
                // Add edge highlighting
                const edges = new THREE.EdgesGeometry(geometry);
                const edgeMaterial = new THREE.LineBasicMaterial({ 
                    color: 0x606060, 
                    transparent: true, 
                    opacity: 0.3 
                });
                const wireframe = new THREE.LineSegments(edges, edgeMaterial);
                smallCube.add(wireframe);
                
                cubeGroup.add(smallCube);
            }
        }
    }
    
    scene.add(cubeGroup);
}

// GSAP Animations
function initAnimations() {
    // Hero animations - Fix GSAP targeting
    gsap.set(".hero-name", { opacity: 0, x: -50 });
    gsap.set(".hero-subtitle", { opacity: 0, x: -30 });
    gsap.set("#cube-container", { opacity: 0, x: 50 });
    
    gsap.to(".hero-name", {
        opacity: 1,
        x: 0,
        duration: 1,
        ease: "power3.out",
        delay: 0.5
    });
    
    gsap.to(".hero-subtitle", {
        opacity: 1,
        x: 0,
        duration: 1,
        ease: "power3.out",
        delay: 0.8
    });
    
    gsap.to("#cube-container", {
        opacity: 1,
        x: 0,
        duration: 1,
        ease: "power3.out",
        delay: 1
    });
    
    // Scroll indicator animation
    gsap.fromTo(".scroll-indicator", 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1, delay: 1.5, ease: "power2.out" }
    );
    
    // Section animations
    gsap.utils.toArray(".section").forEach((section, index) => {
        const elements = section.querySelectorAll(".section-title, .about-text, .objective-text, .objective-quote");
        
        gsap.set(elements, { opacity: 0, y: 30 });
        
        ScrollTrigger.create({
            trigger: section,
            start: "top 80%",
            onEnter: () => {
                gsap.to(elements, {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    stagger: 0.2,
                    ease: "power3.out"
                });
            }
        });
    });
    
    // Project cards animation
    const projectCards = gsap.utils.toArray(".project-card");
    gsap.set(projectCards, { opacity: 0, scale: 0.8 });
    
    ScrollTrigger.create({
        trigger: ".projects-grid",
        start: "top 80%",
        onEnter: () => {
            gsap.to(projectCards, {
                opacity: 1,
                scale: 1,
                duration: 0.6,
                stagger: 0.2,
                ease: "back.out(1.7)"
            });
        }
    });
    
    // Footer animation
    ScrollTrigger.create({
        trigger: ".footer",
        start: "top 90%",
        onEnter: () => {
            gsap.fromTo(".contact-item", 
                { opacity: 0, y: 30 },
                { opacity: 1, y: 0, duration: 0.8, stagger: 0.2, ease: "power3.out" }
            );
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
    // Hide scroll indicator when scrolling
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
    // Hero parallax
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

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Three.js
    initThreeJS();
    
    // Initialize animations after a short delay to ensure Three.js is ready
    setTimeout(() => {
        initAnimations();
        initTilt();
        initSmoothScroll();
        initParallax();
    }, 100);
});

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Pause animations when tab is not visible
        if (renderer) {
            renderer.setAnimationLoop(null);
        }
    } else {
        // Resume animations when tab becomes visible
        if (renderer) {
            function animate() {
                requestAnimationFrame(animate);
                if (cubeGroup) {
                    cubeGroup.rotation.y += 0.005;
                    cubeGroup.position.y = Math.sin(Date.now() * 0.001) * 0.1;
                }
                renderer.render(scene, camera);
            }
            animate();
        }
    }
});

// Performance optimization: reduce animations on low-end devices
if (navigator.hardwareConcurrency <= 2 || navigator.deviceMemory <= 4) {
    // Disable some heavy animations for low-end devices
    document.documentElement.style.setProperty('--transition-smooth', 'all 0.2s ease');
}
