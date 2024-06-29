import * as THREE from 'three';

const Ground = (scene) => {
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x2c3e50, shininess: 100 }); // Darker shade with shiny material
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    scene.add(ground);
};

export default Ground;

