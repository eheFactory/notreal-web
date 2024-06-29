import * as THREE from 'three'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'dat.gui'

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { SavePass } from 'three/examples/jsm/postprocessing/SavePass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { BlendShader } from 'three/examples/jsm/shaders/BlendShader.js'
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js'

import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';

// animation params
const localData = {
    timestamp: 0,
    timeDiff: 0,
    frame: null,
};
const localFrameOpts = {
    data: localData,
};

let messageType = 'tick';

const frameEvent = new MessageEvent(messageType, localFrameOpts);

class TickManager extends EventTarget {
    constructor() {
        super();
        this.animations = [];
    }
    startLoop(composer, controls, stats, gui, camera, renderer, scene) {
        this.composer = composer;
        this.controls = controls;
        this.stats = stats;
        this.gui = gui;
        this.camera = camera;
        this.renderer = renderer;
        this.scene = scene;

        if (!this.renderer) {
            throw new Error('Updating Frame Failed : Uninitialized Renderer');
        }

        let lastTimestamp = 0;

        const animate = (timestamp) => {
            if (!lastTimestamp) lastTimestamp = timestamp;
            let timeDiff = timestamp - lastTimestamp;
            lastTimestamp = timestamp;

            for (let i = 0; i < this.animations.length; i++) {
                this.animations[i](timestamp, timeDiff);
            };

            // execute animations in animations array
            this.animations.forEach((animation) => {
                animation(timestamp, timeDiff);
            });
        
            controls.update();
            composer.render(this.scene, this.camera);
            this.tick(timestamp, timeDiff); // Update to correctly create and dispatch event inside tick
            stats.update();
        };

        // renderer.setAnimationLoop(animate);
        
        this.renderer.setAnimationLoop(animate);

    }

    
    tick(timestamp, timeDiff) {
        // Create and dispatch the 'tick' event with updated data each frame
        const frameEvent = new MessageEvent('tick', { data: { timestamp, timeDiff } });
        this.dispatchEvent(frameEvent);
    }
}

const renderTickManager = new TickManager();

const main = () => {
    // include all required threejs objects and render a cube 
    const scene = new THREE.Scene();

    let renderWidth = window.innerWidth;
    let renderHeight = window.innerHeight;
    let renderAspectRatio = renderWidth / renderHeight;
    let fieldOfView = 75;
    let nearPlane = 0.1;
    let farPlane = 1000;

    const camera = new THREE.PerspectiveCamera(fieldOfView, renderAspectRatio, nearPlane, farPlane);
    // camera.position.z = 20;
    // camera.position.y = 8;
    // camera.position.x = 8;
    // camera.rotateX(-);

    // rotate camera around x-axis at contant  speed angle
    function animateCamera(timestamp, timeDiff) {
        const radius = 20; // Distance from the center
        const speed = 0.0001; // Rotation speed
        // Calculate the camera's new position
        const x = Math.sin(Date.now() * speed) * radius;
        const z = Math.cos(Date.now() * speed) * radius;
        camera.position.set(x, camera.position.y, z);
        camera.lookAt(0, 0, 0); // Look at the origin
    }
    renderTickManager.animations.push(animateCamera);


    const renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(renderWidth, renderHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const target = new THREE.WebGLRenderTarget(renderWidth, renderHeight, {samples: 8});

    const composer = new EffectComposer(renderer, target);
    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)
    composer.addPass(renderPass)
    composer.addPass(renderPass)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    const stats = new Stats();
    document.body.appendChild(stats.dom);

 

    const gui = new GUI();

    window.addEventListener(
        'resize',
        () => {
            renderWidth = window.innerWidth
            renderHeight = window.innerHeight
            renderAspectRatio = renderWidth / renderHeight

            renderer.setPixelRatio(window.devicePixelRatio * 2)

            camera.aspect = renderAspectRatio
            camera.updateProjectionMatrix()

            renderer.setSize(renderWidth, renderHeight)
            composer.setSize(renderWidth, renderHeight)
        },
        false
    )
    
    // settings
    // const MOTION_BLUR_AMOUNT = 0.725
    const MOTION_BLUR_AMOUNT = 0.5

    // lighting
    const dirLight = new THREE.DirectionalLight('#ffffff', 0.75)
    dirLight.position.set(5, 5, 5)

    const ambientLight = new THREE.AmbientLight('#ffffff', 0.2)
    scene.add(dirLight, ambientLight)

    function animateLight(timestamp, timeDiff) {
        dirLight.rotation.x += 0.0001 * timeDiff
        dirLight.rotation.y += 0.0001 * timeDiff
    }
    
    renderTickManager.animations.push(animateLight);



    // Adding a torus knot with more complexity
    const torusKnotGeometry = new THREE.TorusKnotGeometry(4, 2, 1500, 20, 3, 3);
    const torusKnotMaterial = new THREE.MeshPhongMaterial({ 
        wireframe:false,
        color: 0xff0000,
        specular: 0xffffff,
        shininess: 100,
        emissive: 0x222222,
        metalness: 0.9,
        roughness: 0.5 
    });
    const torusKnot = new THREE.Mesh(torusKnotGeometry, torusKnotMaterial);
    torusKnot.position.y = 5;
    torusKnot.position.x = -2;

    scene.add(torusKnot);
    function animateTorusKnot(timestamp, timeDiff) {
        // torusKnot.rotation.x += 0.0001 * timeDiff
        // torusKnot.rotation.y += 0.0001 * timeDiff
        // torusKnot.rotation.z += 0.0001 * timeDiff
    }
    renderTickManager.animations.push(animateTorusKnot);

    // const geometry = new THREE.IcosahedronGeometry(2, 100)
    const geometry = new THREE.TorusGeometry( 1, 0.5, 32, 100 ); 
    const material = new THREE.ShaderMaterial(
        {
            vertexShader,   // vertex shader
            fragmentShader, // fragment shader,
            // wireframe: true,
        }
    )
    // make shader material react to light
    const ico = new THREE.Mesh(geometry, material)
    ico.position.y = 5;
    scene.add(ico)
    // Define the animation function for ico
    function animateIco(timestamp, timeDiff) {
        // Rotate ico around its Y-axis
        ico.rotation.x += (0.0001 * timeDiff);
        ico.rotation.y += (0.0001 * timeDiff);
        ico.rotation.z += (0.0001 * timeDiff);
    }
    renderTickManager.animations.push(animateIco);

    const grid = new THREE.GridHelper(1000, 2000, 0xFF00FF, 0x00FFFF);
    grid.position.y = -2
    grid.material.opacity = 1;
    grid.material.transparent = true;
    scene.add(grid);


    // GUI
    const cameraFolder = gui.addFolder('Camera');
    cameraFolder.add(camera.position, 'z', 0, 10).name('Camera Z Position').onChange(() => {
        console.log("After GUI change:", camera.position.z);
        camera.updateProjectionMatrix(); // Though not necessary for position updates, included as per previous examples
    });
    cameraFolder.open();
    

    // postprocessing
    const renderTargetParameters = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        stencilBuffer: false,
    }

    // save pass
    const savePass = new SavePass(new THREE.WebGLRenderTarget(renderWidth, renderHeight, renderTargetParameters))

    // blend pass
    const blendPass = new ShaderPass(BlendShader, 'tDiffuse1')
    blendPass.uniforms['tDiffuse2'].value = savePass.renderTarget.texture
    blendPass.uniforms['mixRatio'].value = MOTION_BLUR_AMOUNT

    // output pass
    const outputPass = new ShaderPass(CopyShader)
    outputPass.renderToScreen = true

    // adding passes to composer
    composer.addPass(blendPass)
    composer.addPass(savePass)
    composer.addPass(outputPass)

    // Listen to 'tick' event
    renderTickManager.addEventListener('tick', (e) => {
        const { timestamp, timeDiff } = e.data;
        // Update logic based on timestamp and timeDiff
    });

    renderTickManager.startLoop(composer, controls, stats, gui, camera, renderer, scene);
}
document.addEventListener("DOMContentLoaded", main);