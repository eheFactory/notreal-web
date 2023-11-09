import * as THREE from 'three';

import {XRControllerModelFactory} from  'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { fetchProfile} from '@webxr-input-profiles/motion-controllers/dist/motion-controllers.module.js'

import { VRButton } from '../libs/VRButton.js';

const DEFAULT_PROFILES_PATH = 'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles';
const DEFAULT_PROFILE = 'generic-trigger';

class XR{
// TODO move all xr logic here and use it in app
}

//{"trigger":{"button":0},"touchpad":{"button":2,"xAxis":0,"yAxis":1}},"squeeze":{"button":1},"thumbstick":{"button":3,"xAxis":2,"yAxis":3},"button":{"button":6}}}
const createButtonStates = (components, space) => {
    const buttonStates = {};
    space.xrControllers.gamepadIndices = components;
    
    Object.keys(components).forEach((key) => {
        if(key.indexOf('touchpad') != -1 || key.indexOf('thumbstick') != -1){
            buttonStates[key] = {
                button: 0,
                xAxis: 0,
                yAxis: 0,
                // value: 0,
                // touched: false,
                // pressed: false,
                // axes: [0, 0]
            };
        } else {
            buttonStates[key] = 0;
        }
    });

    space.xrControllers.buttonStates = buttonStates;
}; 


const updateGamepadState = (space) => {
    const session = space.renderer.xr.getSession();

    const inputSource = session.inputSources[0];

    if (inputSource && inputSource.gamepad && space.xrControllers.gamepadIndices && space.xrControllers.buttonStates) {
        const gamepad = inputSource.gamepad;
        try {
            Object.entries(space.xrControllers.buttonStates).forEach(([key, value]) => {
                const buttonIndex = space.xrControllers.gamepadIndices[key].button;
                if(key.indexOf('touchpad') != -1 || key.indexOf('thumbstick') != -1){
                    const xAxisIndex = space.xrControllers.gamepadIndices[key].xAxis;
                    const yAxisIndex = space.xrControllers.gamepadIndices[key].yAxis;                    
                    space.xrControllers.buttonStates[key].button = gamepad.buttons[buttonIndex].value;
                    space.xrControllers.buttonStates[key].xAxis = gamepad.axes[xAxisIndex].toFixed(2);
                    space.xrControllers.buttonStates[key].yAxis = gamepad.axes[yAxisIndex].toFixed(2);
                } else {
                    space.xrControllers.buttonStates[key] = gamepad.buttons[buttonIndex].value;
                }
            });
        } catch (e) {
            console.log(e);
        }

    }
}


const updateControllers = (info, space, volume) => {
    function onSelectStart() {
        this.userData.selectPressed = true;
    }

    function onSelectEnd() {
        this.children[0].scale.z = 0;
        this.userData.selectPressed = false;
        this.userData.selected = undefined;
    }


    function onSqueezeStart() {
        this.userData.squeezePressed = true;
        if(this.userData.selected != undefined){
            this.attach(this.userData.selected);
            this.userData.attachedObject = this.userData.selected;
        }
    }

    function onSqueezeEnd() {
        this.userData.squeezePressed = false;
        if(this.userData.attachedObject != undefined){
            volume.attach(this.userData.attachedObject);
            this.userData.attachedObject = undefined;
        }
    }


    function onDisconnected() {
        const index = this.userData.index;
        console.log(`Disconnected controller ${index}`);

        if(space.xrControllers.controllers) {
            const obj = (index == 0) ? space.xrControllers.controllers.left : space.xrControllers.controllers.right;

            if(obj){
                if(obj.controller) {
                    const controller = obj.controller;
                    while(controller.children.length > 0){
                        controller.remove(controller.children[0]);
                    }
                    if (obj.grip) space.scene.remove(obj.grip);
                }
            }
        }
    }

    if(info.right !== undefined) {
        const right = space.renderer.xr.getController(0);

        let trigger = false, squeeze = false;

        Object.keys(info.right).forEach((key) => {
            if(key.indexOf('trigger') != -1) trigger = true;
            if(key.indexOf('squeeze') != -1) squeeze = true;
        });

        if(trigger) {
            right.addEventListener('selectstart', onSelectStart);
            right.addEventListener('selectend', onSelectEnd);
        }

        if(squeeze) {
            right.addEventListener('squeezestart', onSqueezeStart);
            right.addEventListener('squeezeend', onSqueezeEnd);
        }

        right.addEventListener('disconnected', onDisconnected);
    }

    if(info.left !== undefined) {
        const left = space.renderer.xr.getController(1);

        let trigger = false, squeeze = false;

        Object.keys(info.left).forEach((key) => {
            if(key.indexOf('trigger') != -1) trigger = true;
            if(key.indexOf('squeeze') != -1) squeeze = true;
        });

        if(trigger) {
            left.addEventListener('selectstart', onSelectStart);
            left.addEventListener('selectend', onSelectEnd);
        }

        if(squeeze) {
            left.addEventListener('squeezestart', onSqueezeStart);
            left.addEventListener('squeezeend', onSqueezeEnd);
        }

        left.addEventListener('disconnected', onDisconnected);
    }
}


const handleController = (controller, space, volume) => {
    if(controller.userData.selectPressed) {
        controller.children[0].scale.z = 10;

        space.xrControllers.workingMatrix.identity().extractRotation(controller.matrixWorld);

        space.xrControllers.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        space.xrControllers.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(space.xrControllers.workingMatrix);

        const intersects = space.xrControllers.raycaster.intersectObjects(volume.children);

        if(intersects.length > 0) {
            intersects[0].object.add(space.xrControllers.highlight);
            space.xrControllers.highlight.visible = true;
            controller.children[0].scale.z = intersects[0].distance;
            controller.userData.selected = intersects[0].object;
        } else {
            space.xrControllers.highlight.visible = false;
        }
    }
}

const buildController = (index, line, modelFactory, space) => {
    const controller = space.renderer.xr.getController(index);

    // // Check if controller.data exists, if not initialize it
    // controller.userData = controller.data || {};
        
    controller.userData.selectPressed = false;
    controller.userData.index = index;

    if(line) controller.add(line.clone());

    space.scene.add(controller);

    let grip;

    if(modelFactory) {
        grip = space.renderer.xr.getControllerGrip(index);
        grip.add(modelFactory.createControllerModel(grip));
        space.scene.add(grip);
    }

    return { controller, grip };
}

const setupXR = (space, button) => {
    space.renderer.xr.enabled = true;
    if (button == null) {
        const button = new VRButton(space.renderer);
    } else {
        const button = button;
    };

    const xrControllers ={
        gamepadIndices:{},
        buttonStates:{},
        raycaster: new THREE.Raycaster(),
        workingMatrix: new THREE.Matrix4(),
        workingVector: new THREE.Vector3(),
    };


    const radius = 0.08;
    const geometry = new THREE.IcosahedronGeometry(radius, 2);
    const highlight = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide })
    );
    highlight.scale.set(1.2, 1.2, 1.2);
    space.scene.add(highlight);

    xrControllers.highlight = highlight;

    const controller = space.renderer.xr.getController(0);

    controller.addEventListener('connected', (event) => {
        const info = {};

        fetchProfile(event.data, DEFAULT_PROFILES_PATH, DEFAULT_PROFILE).then(({ profile, assetPath }) => {
            console.log(JSON.stringify(profile));

            info.name = profile.profileId;
            info.targetRayMode = event.data.targetRayMode;

            Object.entries(profile.layouts).forEach(([key, layout]) => {
                const components = {};
                
                Object.values(layout.components).forEach((component) => {
                    components[component.rootNodeName] = component.gamepadIndices;
                });
                info[key] = components;
            });

            createButtonStates(info.right, space);

            console.log(JSON.stringify(info));
            updateControllers(info, space, space.scene);
        });
    });

    const modelFactory = new XRControllerModelFactory();

    const modelGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);

    const line = new THREE.Line(modelGeometry);
    line.scale.z = 0;

    const controllers = {};
    controllers.right = buildController(0, line, modelFactory, space);
    controllers.left = buildController(1, line, modelFactory, space);

    xrControllers.controllers = controllers;

    space.xrControllers = xrControllers;

    return xrControllers;
};

export {
    setupXR,
    handleController,
    updateGamepadState,
    createButtonStates,
    updateControllers,
    buildController
};