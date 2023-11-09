import * as THREE from 'three';

const Cubes = (scene) => {
    // Create a group to hold the boxes
    const group = new THREE.Group();

    // Number of boxes to create
    const count = 100;
    for (let i = 0; i < count; i++) {
        const geometry = new THREE.BoxBufferGeometry(0.5, 0.5, 0.5);
        const mesh = new THREE.Mesh(geometry, new THREE.MeshNormalMaterial({ wireframe: true }));
        mesh.position.set(Math.random() * 5 - 2.5, Math.random() * 5 - 2.5, Math.random() * 5 - 2.5);
        group.add(mesh);
    }

    const clock = new THREE.Clock();

    // Animation logic for the group
    group.animate = () => {
        const time = clock.getElapsedTime();

        // Loop over each child and alter its properties for the weird motion
        group.children.forEach(child => {
            child.rotation.x += Math.sin(time * 0.5 + child.position.x) * 0.01;
            child.rotation.y += Math.cos(time * 0.5 + child.position.y) * 0.01;
            child.scale.x = 1 + 0.5 * Math.sin(time * 0.5 + child.position.x);
            child.scale.y = 1 + 0.5 * Math.cos(time * 0.5 + child.position.y);
            child.scale.z = 1 + 0.5 * Math.sin(time + child.position.z);
        });
    }

    // Add the group to the scene
    scene.add(group);
};
export default Cubes;