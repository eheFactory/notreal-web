import * as THREE from 'three';
import { BoxLineGeometry } from 'three/examples/jsm/geometries/BoxLineGeometry.js';

const Valley = (scene) => {
    const radius = 0.08;

    const valley = new THREE.LineSegments(
        new BoxLineGeometry(6, 6, 6, 10, 10, 10),  // Using BoxLineGeometry
        new THREE.LineBasicMaterial({ color: 0x808080 })
    );

    valley.name = 'valley';
    valley.geometry.translate(0, 3, 0);
    scene.add(valley);

    const geometry = new THREE.IcosahedronBufferGeometry(radius, 2);

    for (let i = 0; i < 1000; i++) {
        const object = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(Math.random(), 1, 0.5) })); // Holographic colors
        object.position.x = THREE.MathUtils.randFloat(-2, 2);
        object.position.y = THREE.MathUtils.randFloat(-2, 2);
        object.position.z = THREE.MathUtils.randFloat(-2, 2);
        valley.add(object);
    }

    const highlight = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide })
    );
    highlight.scale.set(1.2, 1.2, 1.2);
    scene.add(highlight);

    return valley;
}


export default Valley;