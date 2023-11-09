import * as THREE from 'three';


const FractalCube = (scene, depth = 3, position = new THREE.Vector3(0, 0, 0), size = 1) => {
    if (depth === 0) return;

    const geometry = new THREE.BoxGeometry(size, size, size);
    const edges = new THREE.EdgesGeometry(geometry);
    const mesh = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00FFFF })); // Cyan color

    mesh.position.copy(position);

    mesh.animate = () => {
        mesh.rotation.x += 0.01;
        mesh.rotation.y += 0.01;
        mesh.scale.set(1 + 0.2 * Math.sin(2 * Math.PI * space.clock.elapsedTime), 1 + 0.2 * Math.sin(2 * Math.PI * space.clock.elapsedTime), 1 + 0.2 * Math.sin(2 * Math.PI * space.clock.elapsedTime));
    }

    scene.add(mesh);

    const offset = size * 1.25;
    for (let x = -1; x <= 1; x += 2) {
        for (let y = -1; y <= 1; y += 2) {
            for (let z = -1; z <= 1; z += 2) {
                FractalCube(scene, depth - 1, position.clone().add(new THREE.Vector3(x * offset, y * offset, z * offset)), size * 0.5);
            }
        }
    }
};


export default FractalCube;