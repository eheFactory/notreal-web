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
    

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
    // Rotating Torus
    const torusGeometry = new THREE.TorusGeometry( 1, 0.5, 32, 200 ); 
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
    const collidersOrigin = new THREE.Vector3(0, 0, 0);
    const collidersSet = new ObjectSet(collidersOrigin)
    space.scene.add(collidersSet.set());
    const boxGeometry = new THREE.BoxGeometry(5, 5, 5);
    const boxMaterial = new THREE.MeshPhongMaterial({ color: 0x00FFF0 });
    boxMaterial.transparent = false;
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
            if (x == 0 && z == 0) continue;
            const box = new THREE.Mesh(boxGeometry, boxMaterial);
            const edge = boxLine.clone();
            collidersSet.add(edge, new THREE.Vector3(x, 2.5, z));
            collidersSet.add(box, new THREE.Vector3(x, 2.5, z));
        }
    }
    

    const dolly = new THREE.Object3D();
    dolly.position.z = 5;
    dolly.add(space.camera);
    space.scene.add(dolly);
    //
    const dummyCam = new THREE.Object3D();
    space.camera.add(dummyCam);
    // const animate = () => {
    // }
    // space.renderer.setAnimationLoop(animate);

    window.app = space;
}
document.addEventListener("DOMContentLoaded", main);