import * as THREE from 'three';


const FogParticles = (scene) => {
    // 1. Define Particle Geometry and Material
    const particleGeometry = new THREE.BufferGeometry();
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.05,
        transparent: true,
        opacity: 0.2,
        color: 0xFFFFFF
    });

    // 2. Create Particle Positions
    const SIZE = 100;
    const PARTICLE_COUNT = 10000;

    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * SIZE;
        positions[i + 1] = (Math.random() - 0.5) * SIZE;
        positions[i + 2] = (Math.random() - 0.5) * SIZE;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // 3. Create Particle System
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    
    // Attach animation
    particleSystem.animate = () => {
        const positions = particleSystem.geometry.attributes.position.array;

        for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
            positions[i] += (Math.random() - 0.5) * 0.1;
            positions[i + 1] += (Math.random() - 0.5) * 0.1;
            positions[i + 2] += (Math.random() - 0.5) * 0.1;
        }

        particleSystem.geometry.attributes.position.needsUpdate = true;

        // Animate other children in the scene (if they have an animate function)
        scene.children.forEach(child => {
            if (child !== particleSystem && child.animate) child.animate();
        });
    };

    scene.add(particleSystem);
};

export default FogParticles;