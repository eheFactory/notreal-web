import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory';
import Stats from 'three/examples/jsm/libs/stats.module'
import { BoxLineGeometry } from 'three/examples/jsm/geometries/BoxLineGeometry.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { SpotLightVolumetricMaterial } from './libs/SpotLightVolumetricMaterial';
import { CanvasUI } from './libs/CanvasUI';
// import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import {
    Constants as MotionControllerConstants,
    fetchProfile,
    MotionController
} from 'three/examples/jsm/libs/motion-controllers.module.js';
import { BufferGeometry } from 'three';

import { setupXR, handleController, updateGamepadState } from './libs/XRControllers.js';

import { AudioInterface } from './libs/AudioInterface.js';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const DEFAULT_PROFILES_PATH = 'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles';
// https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0.2/dist/profiles
// https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0.2/dist/profiles/oculus-touch/
const DEFAULT_PROFILE = 'generic-trigger';


/**
 * Generate a random number between the provided minimum and maximum values.
 * @param {number} min - The minimum value.
 * @param {number} max - The maximum value.
 * @returns {number} - The random number between min and max.
 */
const random = (min, max) => {
    // Generate a random number between 0 and 1, and scale it to the range between min and max
    return Math.random() * (max - min) + min;
}


/**
 * Creates a user interface (   ) panel for the application in the 3D scene.
 * The UI panel is a text-based panel with specific height and size.
 * 
 * @returns {CanvasUI} The CanvasUI instance representing the UI panel in the scene. This object's 'mesh' property, 
 * representing the 3D model of the panel, is directly added to the scene during this method's execution.
 *
 * @example
 * const ui = createUI();
 * ui.updateElement("body", "New text for the UI panel"); // Sample usage after creation
 */
const createUI = () => {
    // declare a constant named config, which is an object containing settings for a UI panel.
    const config = {
        panelSize: { 
            height: 3,
            width: 3
        },
        height: 1024,
        width: 2014,
        body: { type: "text" } //  the body of the UI will be of type 'text'
    }

    // create a new instance of the CanvasUI class.
    const ui = new CanvasUI({ body: "" }, config);
    ui.mesh.position.set(0, 1, -4);
    // this.scene.add(ui.mesh);
    return ui;
}


/**
 * Update the UI based on the button states.
 */
const updateUI = (ui, str) => {
    if(str === undefined){
        str = "enivicivokki"
    }
    // Convert the button states to a string
    str = JSON.stringify(str);

    ui.updateElement('body', str);
    ui.update();
    // Check if the string has changed since the last update
//     if (this.strStates === undefined || (str != this.strStates)) {
//         // Update the UI element with the new string
//         this.ui.updateElement('body', str);
//         this.ui.update();
//         // Store the new string for comparison in the next update
//         this.strStates = str;
//     }
}

class ObjectSet {
    constructor(origin=new THREE.Vector3(0,0,0)){
        this.origin = origin;
        this.group = new THREE.Group();
        this.group.position.set(0,0,0);
    }

    add(object, position=new THREE.Vector3(0,0,0)){
        object.position.copy(position.add(this.origin));
        this.group.add(object);
    }

    set(){
        return this.group;
    }


}

class Space {
    constructor() {
        this.interactionVolume = undefined;
        this.animateCallbacks = [];
        const container = document.createElement('div');
        document.body.appendChild(container);

        this.clock = new THREE.Clock();
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 5);
        // this.camera.position.set(0, 1.6, 3);
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x101010);

        // Add a hemisphere light to provide ambient lighting
        // const ambient = new THREE.HemisphereLight(0x606060, 0x404040);
        const ambient = new THREE.HemisphereLight(0x8e44ad, 0x3498db);
        this.scene.add(ambient);

        // Add axis helper
        const axesHelper = new THREE.AxesHelper(2);
        this.scene.add(axesHelper);

        // Add a directional light for illumination
        const light = new THREE.DirectionalLight(0xffffff);
        light.position.set(1, 1, 1).normalize();
        this.scene.add(light);

        // Create a WebGL renderer with antialiasing and set its size and pixel ratio
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.appendChild(this.renderer.domElement);

        // Create an instance of OrbitControls for camera manipulation
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 1.6, 0);
        this.controls.update();

        // Create a Stats panel for performance monitoring
        this.stats = new Stats();
        container.appendChild(this.stats.dom);

        this.composer = new EffectComposer(this.renderer);
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);
        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        this.bloomPass.threshold = 0.1;
        this.bloomPass.strength = 1.5;
        this.bloomPass.radius = 1;
        this.composer.addPass(this.bloomPass);

        // Resize event listener to handle window resizing
        window.addEventListener('resize', this.resize.bind(this));

        // Set the render loop using the render method
        this.renderer.setAnimationLoop(this.render.bind(this));
    }

    setInteractionVolume(interactionVolume){
        this.interactionVolume = interactionVolume;
        this.scene.add(interactionVolume);
    }
    /**
     * Resizes the renderer and updates the camera aspect ratio.
     */
    resize() {
        // this.updateUI();
        // Calculate the new aspect ratio based on the window size
        this.camera.aspect = window.innerWidth / window.innerHeight;
        // Update the projection matrix with the new aspect ratio
        this.camera.updateProjectionMatrix();
        // Resize the renderer to match the new window size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    render() {
        // space.render(space.scene, space.camera);
        // Get the time since the last frame
        const dt = this.clock.getDelta();
    
        this.scene.traverse((object) => {
            if(object instanceof THREE.Mesh && object.behavior){
                object.behavior();
            }
        })
    
        // Check if the renderer is in XR presenting mode
        if (this.renderer.xr.isPresenting) {
            if (this.xrControllers.controllers) {
                Object.values(this.xrControllers.controllers).forEach((value) => {
                    if(this.interactionVolume !== undefined){
                        handleController(value.controller, this, this.interactionVolume);
                    }
                });
            }
            // Update the gamepad state every 0.3 seconds
            if (this.elapsedTime === undefined) this.elapsedTime = 0;
            this.elapsedTime += dt;
            if (this.elapsedTime > 0.3) {
                if(this.interactionVolume !== undefined){
                    updateGamepadState(this);
                }    
                this.elapsedTime = 0;
            }
        }
        this.stats.update();
        // Render the scene with the camera
        this.renderer.render(this.scene, this.camera);
    }
}

export { Space };

const main = () => {

    const space = new Space();
    const xrControllers = setupXR(space);
    const audioInterface  = new AudioInterface();
    const { analyser, dataArray } = audioInterface;
    //
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
    // Voxel Audio Visualizer
    const voxelOrigin = new THREE.Vector3(0,0,0);
    const voxelSet = new ObjectSet(voxelOrigin)
    space.scene.add(voxelSet.set());
    const voxelRADIUS = 50;
    // Create a sphere of tetrahedron edges
    for (let phi = 0; phi < Math.PI; phi += 0.1) {
        for (let theta = 0; theta < 2 * Math.PI; theta += 0.1) {
            const geometry = new THREE.TetrahedronGeometry(1);
            const edges = new THREE.EdgesGeometry(geometry);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));

            let line_z = voxelRADIUS * Math.sin(phi) * Math.cos(theta);
            let line_y = voxelRADIUS * Math.sin(phi) * Math.sin(theta);
            let line_x = voxelRADIUS * Math.cos(phi);
            voxelSet.add(line, new THREE.Vector3(line_x, line_y, line_z));
        }
    }
    voxelSet.behavior = function(){
        analyser.getByteFrequencyData(dataArray);

        voxelSet.set().children.forEach(line => {
            const phi = Math.acos(line.position.z / voxelRADIUS);
            let frequencyPercentage;
      
            if (phi < 0.2 || phi > Math.PI - 0.2) {
                frequencyPercentage = 0.1;
            } else {
                frequencyPercentage = (line.position.y + voxelRADIUS) / (2 * voxelRADIUS);
            }
      
            let dataIndex = Math.floor(frequencyPercentage * dataArray.length);
      
            if (frequencyPercentage < 0.15) {
                line.material.color.set(0x8A2BE2);
            } else if (frequencyPercentage < 0.3) {
                line.material.color.set(0x4B0082);
            } else if (frequencyPercentage < 0.45) {
                line.material.color.set(0x00FFFF);
            } else if (frequencyPercentage < 0.6) {
                line.material.color.set(0x00FF00);
            } else if (frequencyPercentage < 0.75) {
                line.material.color.set(0xFF69B4);
            } else if (frequencyPercentage < 0.9) {
                line.material.color.set(0xFF4500);
            } else {
                line.material.color.set(0x9400D3);
            }
      
            const scaleValue = (dataArray[dataIndex] + 3) / 20;
            line.scale.set(scaleValue, scaleValue, scaleValue);
            line.rotation.x += 0.005;
            line.rotation.y += 0.005;
        });
        voxelSet.set().rotation.y += 0.002;
    }
    //
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
    // Spectrogram Audio Visualizer
    const spectrogramOrigin = new THREE.Vector3(0,0,0);
    const spectrogramSet = new ObjectSet(spectrogramOrigin);
    space.scene.add(spectrogramSet.set());
    const spectrogramRADIUS = 50;
    const barGeometry = new THREE.BoxGeometry(1,1,1);
    const barMaterials = [];
    space.scene.add
    for (let i = 0; i < dataArray.length; i++) {
        const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
        barMaterials.push(material);
        const bar = new THREE.Mesh(barGeometry, material);
        
        // Position bars in a circular manner
        const theta = (i / dataArray.length) * 2 * Math.PI;
        let bar_x = spectrogramRADIUS * Math.sin(theta);
        let bar_z = spectrogramRADIUS * Math.cos(theta);

        spectrogramSet.add(bar, new THREE.Vector3(bar_x, 0, bar_z));
    }
    spectrogramSet.behavior = function(){
        // Get frequency data
        analyser.getByteFrequencyData(dataArray);

        for (let i = 0; i < dataArray.length; i++) {
            const barHeight = dataArray[i] / 255;  // normalize to [0, 1]
            const bar = spectrogramSet.set().children[i];
            bar.scale.y = barHeight * 5;  // Scale the bar height
            bar.position.y = barHeight * 2.5;  // Adjust position due to scale

            // Set the color based on height
            const r = Math.floor(barHeight * 255);
            const g = Math.floor(255 * (i / dataArray.length));
            const b = 50;
            barMaterials[i].color.setRGB(r / 255, g / 255, b / 255);
        }
    }
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
    // Shader Cube
    // Vertex Shader
    const cubeVertexShader = `
        varying vec3 vUv; 
        void main() {
            vUv = position; 
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
    `;
    // Fragment Shader
    const cubeFragmentShader = `
        varying vec3 vUv;
        void main() {
            gl_FragColor = vec4(vUv * 0.5 + 0.5, 1.0);
        }
    `;
    // Create a cube with the custom shader material
    const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
    const cubeMaterial = new THREE.ShaderMaterial({
        vertexShader: cubeVertexShader,
        fragmentShader: cubeFragmentShader
    });
    const shaderCube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    shaderCube.position.set(-5,2,0)
    space.scene.add(shaderCube);
    shaderCube.behavior = function () {
        // Update audio data
        analyser.getByteFrequencyData(dataArray);
        const avgFrequency = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;

        // Scale cube based on audio data
        const scaleValue = avgFrequency / 255 + 1;
        shaderCube.scale.set(scaleValue, scaleValue, scaleValue);

        shaderCube.rotation.x -= 0.01;
        shaderCube.rotation.y -= 0.01;
    }
    //
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
    // Shader Particle Sphere
    const particleCount  = 1000000;
    const particleGeometry = new THREE.BufferGeometry();
    const spsPositions = new Float32Array(particleCount*3);
    const spsColors = new Float32Array(particleCount*3);
    const spsOriginalPositions = new Float32Array(particleCount*3);
    // Initialize particle positions in a spherical distribution
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const radius = 5;
        const phi = Math.acos(2 * Math.random() - 1) - Math.PI / 2;
        const theta = 2 * Math.PI * Math.random();
        
        spsPositions[i3] = radius * Math.cos(phi) * Math.cos(theta);
        spsPositions[i3 + 1] = radius * Math.sin(phi);
        spsPositions[i3 + 2] = radius * Math.cos(phi) * Math.sin(theta);

        // Storing the original positions
        spsOriginalPositions[i3] = spsPositions[i3];
        spsOriginalPositions[i3 + 1] = spsPositions[i3 + 1];
        spsOriginalPositions[i3 + 2] = spsPositions[i3 + 2];

        spsColors[i3] = Math.random();
        spsColors[i3 + 1] = Math.random();
        spsColors[i3 + 2] = Math.random();
    }
    particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(spsPositions, 3));
    particleGeometry.setAttribute('originalPosition', new THREE.Float32BufferAttribute(spsOriginalPositions, 3));
    particleGeometry.setAttribute('color', new THREE.Float32BufferAttribute(spsColors, 3));
    const spsVertexShader = `
        uniform float time;
        attribute vec3 originalPosition;
        varying vec3 vColor;
        void main() {
            vColor = color;
            vec3 newPosition = position + 0.01 * vec3(sin(originalPosition.x + time), sin(originalPosition.y + time), sin(originalPosition.z + time));
            vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
            gl_PointSize = 5.0 * (1.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `;
    const spsFragmentShader = `
        varying vec3 vColor;
        void main() {
            // gl_FragColor = vec4(vColor, 1.0);
            gl_FragColor = vec4(1.0, 0.7529, 0.7961, 1.0);  // #ffc0cb in normalized RGB
        }
    `;
    const spsMaterial = new THREE.ShaderMaterial({
        vertexShader: spsVertexShader,
        fragmentShader: spsFragmentShader,
        vertexColors: true,
        uniforms: {
            time: { value: 0.0 },
            amplitude: { value: 0.0 }
        }
    });
    const particles = new THREE.Points(particleGeometry, spsMaterial);
    space.scene.add(particles)
    particles.behavior = function() {    
        // Update particles based on audio or any other dynamic data
        spsMaterial.uniforms.time.value += 0.05;
    
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
    
        const avgAmplitude = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length / 255;
        const positions = particleGeometry.attributes.position.array;
        const originalPositions = particleGeometry.attributes.originalPosition.array;
    
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            const distanceFromCenter = Math.sqrt(originalPositions[i3] * originalPositions[i3] + originalPositions[i3 + 1] * originalPositions[i3 + 1] + originalPositions[i3 + 2] * originalPositions[i3 + 2]);
            const newDistance = distanceFromCenter * (1.0 + avgAmplitude * 2);
    
            const ratio = newDistance / distanceFromCenter;
            positions[i3] = originalPositions[i3] * ratio;
            positions[i3 + 1] = originalPositions[i3 + 1] * ratio;
            positions[i3 + 2] = originalPositions[i3 + 2] * ratio;
        }
    
        particleGeometry.attributes.position.needsUpdate = true;
    
        particles.rotation.x += 0.01;
        particles.rotation.y += 0.01;
    }
    //
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
    // Dark Audio Visualizer
    const darkOrigin = new THREE.Vector3(0,0,0);
    const darkSet = new ObjectSet(darkOrigin);
    space.scene.add(darkSet.set());
    const darkRADIUS = 20;
    analyser.fftSize = 2048;
    const shapes = ["Cube", "Tetrahedron", "Sphere"];
    // Darker colors for contrast against a black background
    const colors = [
        0xAAAAAA, // Dark Gray
        0xBBBBBB, // Medium Gray
        0xCCCCCC, // Light Gray
        0xDDDDDD, // Lighter Gray
        0xEEEEEE, // Off White
        0xFFFFFF, // White
    ]; 
    // Create the shapes
    for (let phi = 0; phi < Math.PI; phi += 0.2) {
        for (let theta = 0; theta < 2 * Math.PI; theta += 0.2) {
          const shapeType = shapes[Math.floor(Math.random() * shapes.length)];
          let geometry;
    
          // Pick the geometry based on the shape type
          if (shapeType === "Cube") {
            geometry = new THREE.BoxGeometry(1, 1, 1);
          } else if (shapeType === "Tetrahedron") {
            geometry = new THREE.TetrahedronGeometry(1);
          } else { // "Sphere"
            geometry = new THREE.SphereGeometry(1, 4, 4);
          }
    
          const color = colors[Math.floor(Math.random() * colors.length)];
          const material = new THREE.MeshBasicMaterial({ color: color });
    
          const mesh = new THREE.Mesh(geometry, material);
          let meshPosition = new THREE.Vector3(
            darkRADIUS * Math.sin(phi) * Math.cos(theta),
            darkRADIUS * Math.sin(phi) * Math.sin(theta) - 150,
            darkRADIUS * Math.cos(phi)
          );
    
          darkSet.add(mesh, meshPosition);
        }
    }
    darkSet.behavior = function () {
        analyser.getByteFrequencyData(dataArray);
  
        darkSet.set().children.forEach((mesh, index) => {
            // Scale the mesh based on the frequency data
            const dataIndex = Math.floor(index / darkSet.set().children.length * dataArray.length);
            const frequencyValue = dataArray[dataIndex] / 255;
            const scale = frequencyValue + 1; // Scale based on frequency plus some base scale
            mesh.scale.set(scale, scale, scale);
  
            // Rotate the mesh
            mesh.rotation.x += 0.01;
            mesh.rotation.y += 0.01;
        });
  
        // Rotate the entire group
        darkSet.set().rotation.x += 0.007;
        darkSet.set().rotation.y += 0.007;
        darkSet.set().rotation.z += 0.007;
    };
    //
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
    // Tetrahedron Audio Visualizer
    // const tetrahedronOrigin = new THREE.Vector3(0,0,0);
    // const tetrahedronSet = new ObjectSet(tetrahedronOrigin);
    // const bufferLength = analyser.frequencyBinCount;
    // space.scene.add(tetrahedronSet.set());
    // const tetrahedronRADIUS = 50;
    // // Create a sphere of tetrahedron edges
    // for (let phi = 0; phi < Math.PI; phi += 0.1) {
    //     for (let theta = 0; theta < 2 * Math.PI; theta += 0.1) {
    //         const geometry = new THREE.TetrahedronGeometry(1);
    //         const edges = new THREE.EdgesGeometry(geometry);
    //         const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0xffffff}));

    //         let lineInitialPosition = new THREE.Vector3(
    //             tetrahedronRADIUS * Math.sin(phi) * Math.cos(theta),
    //             tetrahedronRADIUS * Math.sin(phi) * Math.sin(theta),
    //             tetrahedronRADIUS * Math.cos(phi)
    //         );
    //         line.initialPosition = lineInitialPosition;
    //         tetrahedronSet.add(line, lineInitialPosition);
    //     }
    // }
    // tetrahedronSet.behavior = function (){
    //     analyser.getByteFrequencyData(dataArray);

    //     tetrahedronSet.set().children.forEach(line => {
    //         const phi = Math.acos(line.initialPosition.z / tetrahedronRADIUS);

    //         let frequencyPercentage;
            
    //         if (phi < 0.2 || phi > Math.PI - 0.2) {
    //             frequencyPercentage = 0.1;
    //         } else {
    //             frequencyPercentage = (line.initialPosition.y + tetrahedronRADIUS) / (2 * tetrahedronRADIUS);
    //         }

    //         let dataIndex = Math.floor(frequencyPercentage * bufferLength);
            
    //         // Use audio data to update line positions
    //         const lerpFactor = (dataArray[dataIndex] / 255);
    //         line.position.lerp(new THREE.Vector3(0, 0, 0), lerpFactor);  // Lerp towards the center when sound level decreases

    //         // Futuristic gradient colors based on spectrum
    //         if (frequencyPercentage < 0.15) {
    //             line.material.color.set(0x8A2BE2); // Deep purple
    //         } else if (frequencyPercentage < 0.3) {
    //             line.material.color.set(0x4B0082); // Indigo
    //         } else if (frequencyPercentage < 0.45) {
    //             line.material.color.set(0x00FFFF); // Bright cyan
    //         } else if (frequencyPercentage < 0.6) {
    //             line.material.color.set(0x00FF00); // Bright green
    //         } else if (frequencyPercentage < 0.75) {
    //             line.material.color.set(0xFF69B4); // Bright pink
    //         } else if (frequencyPercentage < 0.9) {
    //             line.material.color.set(0xFF4500); // Bright orange
    //         } else {
    //             line.material.color.set(0x9400D3); // Violet
    //         }

    //         const scaleValue = (dataArray[dataIndex] + 1)/2;
    //         line.scale.set(scaleValue, scaleValue, scaleValue);

    //         line.rotation.x += 0.005;
    //         line.rotation.y += 0.005;
    //     });
    //     tetrahedronSet.set().rotation.x += 0.001;
    //     tetrahedronSet.set().rotation.y += 0.002;
    // }
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
    // Voxel Sphere Flat - Expansion
    const voxelFlatOrigin = new THREE.Vector3(0,0,0);
    const voxelFlatSet = new ObjectSet(voxelFlatOrigin)
    space.scene.add(voxelFlatSet.set());
    const voxelFlatRADIUS = 50;
    // Create a sphere of tetrahedron edges
    for (let phi = 0; phi < Math.PI; phi += 0.1) {
        for (let theta = 0; theta < 2 * Math.PI; theta += 0.1) {
            const geometry = new THREE.TetrahedronGeometry(1);
            const edges = new THREE.EdgesGeometry(geometry);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));

            let line_z = voxelFlatRADIUS * Math.sin(phi) * Math.cos(theta);
            let line_y = voxelFlatRADIUS * Math.sin(phi) * Math.sin(theta);
            let line_x = voxelFlatRADIUS * Math.cos(phi);

            voxelFlatSet.add(line, new THREE.Vector3(line_x, line_y, line_z));
        }
    }
    voxelFlatSet.behavior = function (){
        analyser.getByteFrequencyData(dataArray);

        voxelFlatSet.set().children.forEach(line => {
            const phi = Math.acos(line.position.z / voxelFlatRADIUS);

            let frequencyPercentage;
            
            if (phi < 0.2 || phi > Math.PI - 0.2) {
                frequencyPercentage = 0.1;
            } else {
                frequencyPercentage = (line.position.y + voxelFlatRADIUS) / (2 * voxelFlatRADIUS);
            }

            let dataIndex = Math.floor(frequencyPercentage * dataArray.length);

            // Futuristic gradient colors based on spectrum
            if (frequencyPercentage < 0.15) {
                line.material.color.set(0x8A2BE2);
            } else if (frequencyPercentage < 0.3) {
                line.material.color.set(0x4B0082);
            } else if (frequencyPercentage < 0.45) {
                line.material.color.set(0x00FFFF);
            } else if (frequencyPercentage < 0.6) {
                line.material.color.set(0x00FF00);
            } else if (frequencyPercentage < 0.75) {
                line.material.color.set(0xFF69B4);
            } else if (frequencyPercentage < 0.9) {
                line.material.color.set(0xFF4500);
            } else {
                line.material.color.set(0x9400D3);
            }

            const barHeight = dataArray[dataIndex] / 255;
            voxelFlatSet.set().scale.y = barHeight * 5;
            voxelFlatSet.set().position.y = barHeight * 2.5;

            const scaleValue = (dataArray[dataIndex] + 1) / 25;
            line.scale.set(scaleValue, scaleValue, scaleValue);
            line.rotation.x += 0.005;
            line.rotation.y += 0.005;
        });

        voxelFlatSet.set().rotation.y += 0.002;
        voxelFlatSet.set().rotation.x += 0.001;
    };
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
    // Audio Interface callback
    audioInterface.on('dataUpdate', () => {
        voxelSet.behavior();
        spectrogramSet.behavior();
        particles.behavior();
        voxelFlatSet.behavior();
        // tetrahedronSet.behavior();
        darkSet.behavior();
    });
    //
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
    // Rotating Torus
    const torusGeometry = new THREE.TorusGeometry( 1, 0.5, 16, 100 ); 
    const torusMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true} ); 
    const torus = new THREE.Mesh( torusGeometry, torusMaterial);
    torus.position.set(0,2,0)
    torus.behavior = function(){
        this.rotateX(0.01);
        this.rotateY(0.01);
        this.rotateZ(0.01);
    }
    space.scene.add(torus)
    //
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
    // Ground
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshPhongMaterial({ color: 0x555555, depthWrite: false }));
    ground.rotation.x = -Math.PI/2;
    ground.position.set(0,0,0);
    ground.transparent = false;
    space.scene.add(ground);
    //
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
    // Grid
    const grid = new THREE.GridHelper(200, 80, 0x0000FF, 0x00FF00);
    grid.material.opacity = 0.6;
    grid.material.transparent = true;
    space.scene.add(grid);
    //
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -     
    // colliders
    const collidersOrigin = new THREE.Vector3(0, -5, 0);
    const collidersSet = new ObjectSet(collidersOrigin)
    space.scene.add(collidersSet.set());
    const boxGeometry = new THREE.BoxGeometry(5, 5, 5);
    const boxMaterial = new THREE.MeshPhongMaterial({ color: 0x00FFF0 });
    boxMaterial.transparent = true;
    boxMaterial.opacity = 0.5;
    const boxEdges = new THREE.EdgesGeometry(boxGeometry);
    // Create colliders represented by boxes and their corresponding edges
    const boxLine = new THREE.LineSegments(
        boxEdges,
        new THREE.LineBasicMaterial({
            color: 0xFF0F0F,
            linewidth: 100
        })
    );
    for (let x = -100; x < 100; x += 10) {
        for (let z = -100; z < 100; z += 10) {
            // if (x == 0 && z == 0) continue;
            const box = new THREE.Mesh(boxGeometry, boxMaterial);
            const edge = boxLine.clone();
            collidersSet.add(edge, new THREE.Vector3(x, 2.5, z));
            collidersSet.add(box, new THREE.Vector3(x, 2.5, z));
        }
    }
    //
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -     
    //
    const uiElement = createUI();
    let uiStr = `Etiam et est tortor. Phasellus fringilla tempus orci ac bibendum.
    Curabitur varius lorem vitae purus posuere lobortis eu sed massa. Morbi dictum
    leo mi, nec suscipit dolor venenatis sit amet. Mauris laoreet porttitor sollicitudin.
    Phasellus semper scelerisque justo in egestas. Praesent pharetra vel est at fermentum.
    Phasellus pulvinar ante lectus, ut dignissim lectus iaculis sed. Donec enim nibh, 
    maximus eu interdum aliquet, lacinia eleifend felis. Nullam accumsan ullamcorper 
    accumsan. Integer sed nisl mi. Vestibulum ante ipsum primis in faucibus orci luctus 
    et ultrices posuere cubilia curae; Cras eget mattis diam. Sed mattis magna at dolor 
    pretium, quis fermentum quam iaculis. Pellentesque pharetra nunc vel magna pulvinar,
    at pretium leo pharetra. Duis ac suscipit nisi. Sed est diam, auctor fermentum faucibus
    interdum, tristique sed velit. Vivamus orci turpis, tincidunt non odio sagittis, venenatis
    tincidunt odio. Sed et condimentum ex. Nulla facilisi. Vivamus non rutrum metus. Nulla odio
    justo, vehicula eu hendrerit a, commodo vel nulla. Cras eget dolor sem. Aliquam egestas ex
    eget felis porttitor, eu vulputate urna consequat. Nunc sed magna semper, sodales risus in,
    accumsan turpis. Quisque gravida dolor in dui ultrices consectetur in nec nisi. Praesent
    justo est, finibus et ligula vitae, venenatis iaculis velit. Quisque eget feugiat magna.
    Nunc ullamcorper velit vel sollicitudin condimentum. Vestibulum nisl nibh, consectetur
    sed auctor nec, cursus at mauris. In blandit rutrum ex, ut iaculis dui varius et.
    Pellentesque mollis hendrerit felis, sit amet commodo quam egestas sed. Proin pulvinar,
    libero in interdum tristique, odio mi maximus lacus, sit amet laoreet eros leo et mauris.
    Ut aliquet nisl quis purus tempus semper. Proin mattis cursus tortor, sed tempus augue
    commodo eget. Nulla nulla ligula, varius id risus id, vehicula eleifend purus. Mauris
    tellus justo, blandit sed tincidunt non, pharetra at augue. Lorem ipsum dolor sit amet,
    consectetur adipiscing elit. Donec vitae diam tempor, fringilla ante eget, rhoncus elit.
    Duis nec dolor eget eros placerat fringilla. Proin ultrices eros a eleifend aliquam. 
    Donec eu scelerisque enim. Praesent in nibh vitae nisl faucibus sagittis. Proin vel 
    blandit dui. Cras laoreet massa non viverra rutrum. Aliquam rhoncus ipsum est. Aenean 
    ac quam eget nunc dapibus euismod. Nam sit amet tortor sed ante hendrerit congue. Sed
    hendrerit massa quis erat vehicula, sit amet gravida tortor convallis. Sed velit ligula,
    vehicula vel tempor vitae, ullamcorper in ipsum. Curabitur nibh nulla, sollicitudin non
    dui non, posuere elementum purus. Aliquam egestas sed orci non finibus. Vivamus sit amet
    libero metus. Donec quam est, ultricies eget rhoncus id, accumsan non arcu. Donec sodales
    nunc nisl, nec suscipit est hendrerit non. Integer luctus justo ac porttitor porttitor.
    Ut in ante mi. Interdum et malesuada fames ac ante ipsum primis in faucibus. Nulla vulputate
    id orci a viverra. Quisque dapibus urna at velit interdum, ac laoreet ex sodales. Curabitur
    eget risus in dolor pulvinar feugiat.`
    
    updateUI(uiElement, uiStr);
    space.scene.add(uiElement.mesh);   
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
    // Room
    const roomSetOrigin = new THREE.Vector3(0,0.5,0)
    const roomSet = new ObjectSet(roomSetOrigin);
    space.scene.add(roomSet.set());
    space.setInteractionVolume(roomSet.set());
    const radius = 0.5;
    const room = new THREE.LineSegments(
        // new THREE.BoxGeometry(6,6,6,10,10,10),
        new BoxLineGeometry(6, 6, 6, 10, 10, 10),
        new THREE.LineBasicMaterial({ color: 0x808080 })
    );
    // room.geometry.translate(0, 3 + 2.5, 0);
    roomSet.add(room, new THREE.Vector3(roomSetOrigin.x+0, roomSetOrigin.y+5.5, roomSetOrigin.z+0))
    const geometry = new THREE.IcosahedronGeometry(radius, 2);
    // Randomly place objects in the room
    for (let i = 0; i < 200; i++) {
        const object = new THREE.Mesh(
            geometry,
            new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff })
        );
        const objectPosition = new THREE.Vector3(
            random(roomSetOrigin.x-20, roomSetOrigin.x+20),
            3 + 2.5 + random(roomSetOrigin.y-2, roomSetOrigin.y+2),
            random(roomSetOrigin.z-2, roomSetOrigin.z+2)
        )       
        roomSet.add(object, objectPosition);
    }
    //
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
    // simple universe example
    // const uGroup = new THREE.Group();
    // const uPlaneGeometry = new THREE.PlaneGeometry(100, 100);
    // const uPlaneMaterial = new THREE.MeshBasicMaterial({color: 0xFFFFFF});
    // const uPlane =  new THREE.Mesh(uPlaneGeometry, uPlaneMaterial);
    
    // uPlane.position.set(0, 0, 0);
    // uPlane.rotation.x = -0.5 * Math.PI;
    // uGroup.add(uPlane);
    // space.scene.add(uGroup);
    //
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
    // Dolly
    // Create a dolly object to move the camera
    const dolly = new THREE.Object3D();
    dolly.position.z = 5;
    dolly.add(space.camera);
    space.scene.add(dolly);
    // Create a dummy object for camera manipulation
    const dummyCam = new THREE.Object3D();
    space.camera.add(dummyCam);
    
    space.camera.behavior = function(){
        const raycaster = new THREE.Raycaster();
        const workingMatrix = new THREE.Matrix4();
        const workingVector = new THREE.Vector3();
        const origin = new THREE.Vector3();
        const wallLimit = 5;
        // (which is usually a camera controller, or some kind of entity that moves around in the 3D space).
        let pos = this.dolly.position.clone();
        // increases the y-position (vertical position) of the "dolly"
        pos.y += 1;
        // set the speed which dolly moves at.
        const speed = 2.0;
        // clone the current rotation of the dolly, stored as a quaternion.
        const quaternion = this.dolly.quaternion.clone();
        // update the dolly's rotation to match the dummy camera's world rotation.
        this.dolly.quaternion.copy(this.camera.dummyCam.getWorldQuaternion(new THREE.Quaternion()));
        // retrieve the direction in which the dolly is currently facing and stores it in this.workingVector.
        this.dolly.getWorldDirection(workingVector);
        // flip  the direction stored in workingVector to its opposite.
        workingVector.negate();
        // set the origin and direction for a raycaster. 
        // A raycaster is used for picking 
        // (finding out what objects in the 3D scene are under the mouse cursor) 
        // or for collision detection.
        raycaster.set(pos, workingVector);
        // This declares a flag variable blocked, initially set to false. 
        // This flag is used to track whether the dolly's movement is blocked by something.
        let blocked = false;
        // This declares a flag variable blocked, initially set to false. 
        // This flag is used to track whether the dolly's movement is blocked by something.
        let intersect = raycaster.intersectObjects(colliders);
        if(intersect.length > 0){
        // If there are one or more intersections...
            if(intersect[0].distance < wallLimit){
            //  If the distance to the closest intersecting object is less than wallLimit
    
                //  Then the dolly is considered blocked.
                blocked = true;
            }
        }
        if(!blocked){
        //  If the dolly is not blocked..
            // Then the dolly moves forward (in the z direction) at a rate proportional to dt, 
            // which is likely the time since the last frame was rendered.
            this.dolly.translateZ(-speed * dt);
        }
        //  reset the y position of the dolly, effectively keeping it at ground level.
        this.dolly.position.y = 0;
        // restore the original rotation of the dolly.
        this.dolly.quaternion.copy(quaternion);
    }
    
    // const animate = () => {
    // }
    // space.renderer.setAnimationLoop(animate);

    window.app = space;
}
document.addEventListener("DOMContentLoaded", main);