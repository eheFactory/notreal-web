import * as THREE from 'three';

const RetroArcadeEffect = (scene) => {
    // Parameters for the grid
    const size = 50;
    const divisions = 100;

    // Create a grid helper
    const gridHelper = new THREE.GridHelper(size, divisions, 0xff00ff, 0x00ffff);
    
    // Lay the grid on the XZ plane
    gridHelper.rotation.x = Math.PI / 2;
    
    // Add the grid to the scene
    scene.add(gridHelper);

    // If you wish to add more retro arcade elements, like glowing spheres or cubes, you can continue here.
    // For example, let's add some floating cubes:

    const cubeGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true });

    for(let i = 0; i < 50; i++) {
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.position.set((Math.random() - 0.5) * 50, Math.random() * 5, (Math.random() - 0.5) * 50);
        
        cube.animate = () => {
            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;
        }

        scene.add(cube);
    }
};

export default RetroArcadeEffect;