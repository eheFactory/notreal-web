import * as THREE from 'three';

const EdgeCube = (scene) => {
    const geometry = new THREE.BoxGeometry();
    const edges = new THREE.EdgesGeometry(geometry);
    const mesh = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00FFFF })); // Cyan color

    mesh.animate = () => {
        mesh.rotation.x += 0.01;
        mesh.rotation.y += 0.01;
        mesh.rotation.x += 0.01;
        mesh.rotation.y += 0.01;
        mesh.scale.set(1 + 0.5 * Math.sin(space.clock.elapsedTime), 1 + 0.5 * Math.sin(space.clock.elapsedTime), 1 + 0.5 * Math.sin(space.clock.elapsedTime));
    }
    scene.add(mesh);    
};


export default EdgeCube;