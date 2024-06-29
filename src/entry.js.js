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

const main = () => {

    const space = new Space();
    // const xrControllers = setupXR(space);
    const audioInterface  = new AudioInterface();
    const { analyser, dataArray } = audioInterface;

    // VaporWaveScene(space.scene);
    Cubes(space.scene);

    window.app = space;
}
document.addEventListener("DOMContentLoaded", main);