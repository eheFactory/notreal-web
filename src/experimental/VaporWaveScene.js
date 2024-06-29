import * as THREE from 'three';

const VaporWaveScene = (scene) => {
    // Background gradient color
    const gradientShader = {
        vertexShader: `
            void main() {
                gl_Position = vec4( position, 1.0 );
            }`,
        fragmentShader: `
            uniform vec2 iResolution;
            void main() {
                vec2 uv = gl_FragCoord.xy / iResolution.xy;
                gl_FragColor = mix(vec4(0.5, 0.0, 0.5, 1.0), vec4(1.0, 0.5, 1.0, 1.0), uv.y);
            }`,
        uniforms: {
            iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
        }
    };

    const background = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(2, 2, 0),
        new THREE.ShaderMaterial(gradientShader)
    );
    background.material.depthTest = false;
    background.material.depthWrite = false;
    background.renderOrder = 1;
    scene.add(background);

    // Grid floor
    const gridMaterial = new THREE.LineBasicMaterial({ color: 0x00FFAE });
    const gridSize = 50;
    const divisions = 10;
    const gridHelper = new THREE.GridHelper(gridSize, divisions, gridMaterial);
    scene.add(gridHelper);

    // Floating geometries
    const geometry = new THREE.TorusKnotGeometry(2, 0.5, 100, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0x94F0FF });
    const torusKnot = new THREE.Mesh(geometry, material);
    scene.add(torusKnot);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x595959); 
    scene.add(ambientLight);

    // Point light
    const pointLight = new THREE.PointLight(0xff0055, 1, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    torusKnot.animate = () => {
        torusKnot.rotation.x += 0.01;
        torusKnot.rotation.y += 0.02;
    }

    scene.add(torusKnot);
};

export default VaporWaveScene;