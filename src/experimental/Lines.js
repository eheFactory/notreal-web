import * as THREE from 'three';

const Lines = (scene) => {
    const spaghettiGroup = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, wireframe: true });

    const NUM_SPAGHETTIS = 100;
    const SPAGHETTI_LENGTH = 5;

    for (let i = 0; i < NUM_SPAGHETTIS; i++) {
        const points = [];
        for (let j = 0; j < SPAGHETTI_LENGTH; j++) {
            points.push(new THREE.Vector3(
                Math.random() * 20 - 10, 
                j, 
                Math.random() * 20 - 10
            ));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        const geometry = new THREE.TubeBufferGeometry(curve, 20, 0.1, 8, false);
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

export default Lines;