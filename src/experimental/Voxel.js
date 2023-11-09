import * as THREE from 'three';

const Voxel = (scene) => {
    const spaghettiGroup = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, wireframe: true });

    const NUM_SPAGHETTIS = 100;
    const SPAGHETTI_LENGTH = 5;
    const SPAGHETTI_RADIUS = 0.3;  // Increase this value for bolder spaghetti strands

    for (let i = 0; i < NUM_SPAGHETTIS; i++) {
        const points = [];
        for (let j = 0; j < SPAGHETTI_LENGTH; j++) {
            // Use noise or some sort of function here to make it more potato-like
            points.push(new THREE.Vector3(
                Math.sin(j * 0.5) * (4 + Math.random() * 2),
                Math.sin(j + i * 0.1) * (4 + Math.random() * 2),
                Math.cos(j * 0.5) * (4 + Math.random() * 2)
            ));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        const geometry = new THREE.TubeBufferGeometry(curve, 20, SPAGHETTI_RADIUS, 8, false);
        const mesh = new THREE.Mesh(geometry, material);
        spaghettiGroup.add(mesh);
    }

    spaghettiGroup.animate = () => {
        spaghettiGroup.children.forEach((child, index) => {
            const positions = child.geometry.attributes.position.array;
            for(let i = 0; i < positions.length; i += 3) {
                positions[i] += Math.sin(positions[i + 1] + Date.now() * 0.001 + index) * 0.1;
                positions[i + 2] += Math.cos(positions[i + 1] + Date.now() * 0.001 + index) * 0.1;
            }
            child.geometry.attributes.position.needsUpdate = true;
        });
    };

    scene.add(spaghettiGroup);
};


export default Voxel;