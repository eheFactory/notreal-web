import * as THREE from 'three';


const EdgeCubesVolume = (scene) => {
    const cubeGroup = new THREE.Group();
    const SIZE = 50;
    const CUBE_COUNT = 1000;

    for (let i = 0; i < CUBE_COUNT; i++) {
        const geometry = new THREE.BoxBufferGeometry(1, 1, 1);
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0xffffff}));

        line.position.x = (Math.random() - 0.5) * SIZE;
        line.position.y = (Math.random() - 0.5) * SIZE;
        line.position.z = (Math.random() - 0.5) * SIZE;

        line.userData.originalScale = 1 + Math.random(); // store original scale
        line.userData.resizeDirection = Math.random() > 0.5 ? 1 : -1; // determine resize direction

        cubeGroup.add(line);
    }

    cubeGroup.animate = () => {
        cubeGroup.children.forEach(cube => {
            // Move cubes randomly
            cube.position.x += (Math.random() - 0.5) * 0.01;
            cube.position.y += (Math.random() - 0.5) * 0.01;
            cube.position.z += (Math.random() - 0.5) * 0.01 ;

            // Resize cubes
            cube.scale.x += cube.userData.resizeDirection * 0.05;
            cube.scale.y += cube.userData.resizeDirection * 0.05;
            cube.scale.z += cube.userData.resizeDirection * 0.05;

            if (cube.scale.x <= 0.5 || cube.scale.x >= cube.userData.originalScale * 2) {
                cube.userData.resizeDirection *= -1; // flip resize direction
            }

            // Rotate cubes
            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;
        });
    };

    scene.add(cubeGroup);
};


export default EdgeCubesVolume;