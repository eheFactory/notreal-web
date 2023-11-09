import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory';
import Stats from 'three/examples/jsm/libs/stats.module'
import { BoxLineGeometry } from 'three/examples/jsm/geometries/BoxLineGeometry.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { SpotLightVolumetricMaterial } from './libs/SpotLightVolumetricMaterial';
import { CanvasUI } from './libs/CanvasUI';
// import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { VRButton } from './libs/VRButton';
import {
    Constants as MotionControllerConstants,
    fetchProfile,
    MotionController
} from 'three/examples/jsm/libs/motion-controllers.module.js';
import { BufferGeometry } from 'three';

const DEFAULT_PROFILES_PATH = 'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles';
// https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0.2/dist/profiles
// https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0.2/dist/profiles/oculus-touch/
const DEFAULT_PROFILE = 'generic-trigger';

class App {
    /**
     * Constructs an instance of the App class.
     */
    constructor() {
        // Create a container element and append it to the document body
        const container = document.createElement('div');
        document.body.appendChild(container);

        // Create a clock to track the time
        this.clock = new THREE.Clock();

        // Create a perspective camera with specified parameters
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 1.6, 3);

        // Create a scene to hold the objects
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x505050);

        // Add a hemisphere light to provide ambient lighting
        const ambient = new THREE.HemisphereLight(0x606060, 0x404040);
        this.scene.add(ambient);

        // Add a directional light for illumination
        const light = new THREE.DirectionalLight(0xffffff);
        light.position.set(1, 1, 1).normalize();
        this.scene.add(light);

        // Create a WebGL renderer with antialiasing and set its size and pixel ratio
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Append the renderer's DOM element to the container
        container.appendChild(this.renderer.domElement);

        // Create an instance of OrbitControls for camera manipulation
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 1.6, 0);
        this.controls.update();

        // Create a Stats panel for performance monitoring
        this.stats = new Stats();
        container.appendChild(this.stats.dom);

        // Create a mesh object using BoxGeometry and MeshStandardMaterial
        // Replace Box with Circle, Cone, Cylinder, Dodecahedron, Icosahedron, Octahedron, Plane, Sphere, Tetrahedron, Torus or TorusKnot
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);

        // Create raycaster, matrices, vectors, and origin for interaction
        this.raycaster = new THREE.Raycaster();
        this.workingMatrix = new THREE.Matrix4();
        this.workingVector = new THREE.Vector3();
        this.origin = new THREE.Vector3();

        // Initialize the scene
        this.initScene();

        // Setup WebXR
        this.setupXR();

        // Resize event listener to handle window resizing
        window.addEventListener('resize', this.resize.bind(this));

        // Set the render loop using the render method
        this.renderer.setAnimationLoop(this.render.bind(this));
    }

    /**
     * Generate a random number between the provided minimum and maximum values.
     * @param {number} min - The minimum value.
     * @param {number} max - The maximum value.
     * @returns {number} - The random number between min and max.
     */
    random(min, max) {
        // Generate a random number between 0 and 1, and scale it to the range between min and max
        return Math.random() * (max - min) + min;
    }

    /**
     * Initializes the scene by setting up the background, fog, ground, room, objects, highlights, UI elements, grid helper, and colliders.
     */
    initScene() {
        // Set the background color and fog of the scene
        this.scene.background = new THREE.Color(0xa0a0a0);
        // this.scene.fog = new THREE.Fog(0xa0a0a0, 50, 100);
    
        // Ground
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false }));
        ground.rotation.x = -Math.PI;
        this.scene.add(ground);
    
        this.radius = 0.08;
    
        // Room
        this.room = new THREE.LineSegments(
            // new THREE.BoxGeometry(6,6,6,10,10,10),
            new BoxLineGeometry(6, 6, 6, 10, 10, 10),
            new THREE.LineBasicMaterial({ color: 0x808080 })
        );
        this.room.geometry.translate(0, 3 + 2.5, 0);
        this.scene.add(this.room);
    
        const geometry = new THREE.IcosahedronGeometry(this.radius, 2);
    
        // Randomly place objects in the room
        for (let i = 0; i < 200; i++) {
            const object = new THREE.Mesh(
                geometry,
                new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff })
            );
    
            object.position.x = this.random(-2, 2);
            object.position.y = 3 + 2.5 + this.random(-2, 2);
            object.position.z = this.random(-2, 2);
    
            this.room.add(object);
        }
    
        // Highlight mesh for gripped objects
        this.highlight = new THREE.Mesh(
            geometry,
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                side: THREE.BackSide
                // side: THREE.FrontSide :
                //      Only the front side of the geometry or material should be rendered. 
                //      The front side is determined based on the order of the vertices of the geometry or the face normals of the material. 
                //      This is the default value if the side property is not specified
                // side: THREE.BackSide  
                //      Only the back side of the geometry or material should be rendered. 
                //      The back side is the opposite side of the front side. 
                //      Setting side to THREE.BackSide makes the geometry or material appear invisible from the front.
                // side: THREE.BothSide  
                //      Both the front and back sides of the geometry or material should be rendered. 
                //      Setting side to THREE.BothSide makes the geometry or material visible from both sides.
            })
        );
        this.highlight.scale.set(1.2, 1.2, 1.2);
        this.scene.add(this.highlight);
    
        // Create UI elements
        this.ui = this.createUI();
    
        // Grid helper
        const grid = new THREE.GridHelper(200, 80, 0x0000FF, 0xFF0000);
        grid.material.opacity = 0.2;
        grid.material.transparent = true;
        this.scene.add(grid);
    
        const boxGeometry = new THREE.BoxGeometry(5, 5, 5);
        const boxMaterial = new THREE.MeshPhongMaterial({ color: 0x00FF00 });
        const boxEdges = new THREE.EdgesGeometry(boxGeometry);
    
        // Create colliders represented by boxes and their corresponding edges
        const boxLine = new THREE.LineSegments(
            boxEdges,
            new THREE.LineBasicMaterial({
                color: 0xFFFF00,
                linewidth: 5
            })
        );
        this.colliders = [];
        for (let x = -100; x < 100; x += 10) {
            for (let z = -100; z < 100; z += 10) {
                if (x == 0 && z == 0) continue;
                const box = new THREE.Mesh(boxGeometry, boxMaterial);
                box.position.set(x, 2.5, z);
                const edge = boxLine.clone();
                edge.position.copy(box.position);
                // this.scene.add(box);
                this.scene.add(edge);
                this.colliders.push(box);
            }
        }
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
    createUI() {
        // declare a constant named config, which is an object containing settings for a UI panel.
        const config = {
            panelSize: { height: 0.5 },
            height: 256,
            body: { type: "text" } //  the body of the UI will be of type 'text'
        }

        // create a new instance of the CanvasUI class.
        const ui = new CanvasUI({ body: "" }, config);
        ui.mesh.position.set(0, 2.5, -1);
        this.scene.add(ui.mesh);
        return ui;
    }

    //{"trigger":{"button":0},"touchpad":{"button":2,"xAxis":0,"yAxis":1}},"squeeze":{"button":1},"thumbstick":{"button":3,"xAxis":2,"yAxis":3},"button":{"button":6}}}
    /**
     * Create button states based on the provided components.
     * @param {Object} components - The gamepad components.
     */
    createButtonStates(components) {
        // Create an empty object to store the button states
        const buttonStates = {};
        
        // Store the gamepad indices for future reference
        this.gamepadIndices = components;

        // Iterate over the keys of the components object
        Object.keys(components).forEach((key) => {
            // Check if the key contains 'touchpad' or 'thumbstick'
            if (key.indexOf('touchpad') != -1 || key.indexOf('thumbstick') != -1) {
                // Create an object with button, xAxis, and yAxis properties
                buttonStates[key] = { button: 0, xAxis: 0, yAxis: 0 };
            } else {
                // Create a numeric button state
                buttonStates[key] = 0;
            }
        });

        // Set the buttonStates property of the object to the created button states
        this.buttonStates = buttonStates;
    }

    /**
     * Update the UI based on the button states.
     */
    updateUI() {
        // Convert the button states to a string
        const str = JSON.stringify(this.buttonStates);

        // Check if the string has changed since the last update
        if (this.strStates === undefined || (str != this.strStates)) {
            // Update the UI element with the new string
            this.ui.updateElement('body', str);
            this.ui.update();

            // Store the new string for comparison in the next update
            this.strStates = str;
        }
    }

    /**
     * The `updateGamepadState` method updates the state of the gamepad controller by iterating over
     * each button state in the `buttonStates` object and updating its value and, in case of a touchpad
     * or thumbstick, its x and y axis values. These new values are retrieved from the `gamepadIndices`
     * object and the gamepad from the current WebXR session's first input source.
     *
     * Once the gamepad state is updated, the UI is updated to reflect these changes.
     * 
     * This method assumes that the input source, gamepad, `gamepadIndices`, `ui`, and `buttonStates`
     * properties are all defined. If an error occurs during the update of the gamepad state, a warning
     * is printed to the console.
     *
     * @throws {Error} Will throw a warning to the console if there is an error in setting the UI.
     */
    updateGamepadState() {
        // get the current WebXR session from the renderer
        const session = this.renderer.xr.getSession();

        // get the current WebXR session from the renderer
        const inputSource = session.inputSources[0];

        if (inputSource && inputSource.gamepad && this.gamepadIndices && this.ui && this.buttonStates) {
        // check that the input source, gamepad, gamepadIndices, ui, and buttonStates properties are all defined

            // get the gamepad from the input source
            const gamepad = inputSource.gamepad;
            try {
                // iterate over each button state in the buttonStates object
                Object.entries(this.buttonStates).forEach(([key, value]) => {

                    // get the button index from the gamepadIndices object for the current key
                    const buttonIndex = this.gamepadIndices[key].button;

                    if (key.indexOf('touchpad') != -1 || key.indexOf('thumbstick') != -1) {
                    // check if the key corresponds to a touchpad or a thumbstick
                        
                        //  get the x and y axis indices from the gamepadIndices object for the current key
                        const xAxisIndex = this.gamepadIndices[key].xAxis;
                        const yAxisIndex = this.gamepadIndices[key].yAxis;

                        //  update the button state and axis values in the buttonStates object for the current key
                        //  The axis values are rounded to two decimal places using toFixed(2)
                        this.buttonStates[key].button = gamepad.buttons[buttonIndex].value;
                        this.buttonStates[key].xAxis = gamepad.axes[xAxisIndex].toFixed(2);
                        this.buttonStates[key].yAxis = gamepad.axes[yAxisIndex].toFixed(2);

                    } else {
                    // update the button state in the buttonStates object for the current key
                    // If the key doesn't correspond to a touchpad or a thumbstick
                        this.buttonStates[key] = gamepad.buttons[buttonIndex].value;
                    }

                    // updates the UI
                    // resumably to reflect the changes to the gamepad state
                    this.updateUI();
                });
            } catch (e) {
                console.warn("An error occurred setting the ui");
            }
        }
    }

    /**
     * Set up the WebXR environment.
     */
    setupXR() {
        // Enable XR support in the renderer
        this.renderer.xr.enabled = true;

        // Create the VR button
        const button = new VRButton(this.renderer);

        const self = this;

        /**
         * Event handler for when a controller is connected.
         * @param {Event} event - The connected event.
         */
        function onConnected(event) {
            const info = {};

            // Fetch the profile information
            fetchProfile(event.data, DEFAULT_PROFILES_PATH, DEFAULT_PROFILE).then(({ profile, assetPath }) => {
                console.log(JSON.stringify(profile));

                // Extract relevant information from the profile
                info.name = profile.profileId;
                info.targetRayMode = event.data.targetRayMode;

                Object.entries(profile.layouts).forEach(([key, layout]) => {
                    const components = {};
                    Object.values(layout.components).forEach((component) => {
                        components[component.rootNodeName] = component.gamepadIndices;
                    });
                    info[key] = components;
                });

                // Create button states based on the right controller's layout
                self.createButtonStates(info.right);

                console.log(JSON.stringify(info));

                // Update the controllers with the profile information
                self.updateControllers(info);
            });
        }

        // Get the controller for the first index (right hand)
        const controller = this.renderer.xr.getController(0);

        // Add the connected event listener to the controller
        controller.addEventListener('connected', onConnected);

        // Create a model factory for the controllers
        const modelFactory = new XRControllerModelFactory();

        // Create a buffer geometry for the controller line
        const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);

        // Create a line model for the controller
        const line = new THREE.Line(geometry);
        line.scale.z = 0;

        // Build the controllers and store the references
        this.controllers = {};
        this.controllers.right = this.buildController(0, line, modelFactory);
        this.controllers.left = this.buildController(1, line, modelFactory);

        // Create a dolly object to move the camera
        this.dolly = new THREE.Object3D();
        this.dolly.position.z = 5;
        this.dolly.add(this.camera);
        this.scene.add(this.dolly);

        // Create a dummy object for camera manipulation
        this.dummyCam = new THREE.Object3D();
        this.camera.add(this.dummyCam);
    }

    /**
     * Builds a controller with optional line and grip model.
     * @param {number} index - The index of the controller.
     * @param {Object} line - The line model to add to the controller.
     * @param {Object} modelFactory - The model factory to create the grip model.
     * @returns {Object} - The controller and grip objects.
     */
    buildController(index, line, modelFactory) {
        // Get the XR controller for the specified index
        const controller = this.renderer.xr.getController(index);

        // Initialize user data properties for the controller
        controller.userData.selectPressed = false;
        controller.userData.index = index;

        // Add the line model to the controller if provided
        if (line) controller.add(line.clone());

        // Add the controller to the scene
        this.scene.add(controller);

        let grip;

        // Create and add the grip model using the model factory if provided
        if (modelFactory) {
            grip = this.renderer.xr.getControllerGrip(index);
            grip.add(modelFactory.createControllerModel(grip));
            this.scene.add(grip);
        }

        // Return the controller and grip objects
        return { controller, grip };
    }


    /**
     * Updates the controllers based on the input information.
     * @param {object} info - Information about the controllers.
     */
    updateControllers(info) {
        const self = this;

        // Event handler for when the select button is pressed
        function onSelectStart() {
            // Set the select button state to pressed
            this.userData.selectPressed = true;
        }

        // Event handler for when the select button is released
        function onSelectEnd() {
            // Reset the scale and select button state
            this.children[0].scale.z = 0;
            this.userData.selectPressed = false;
            this.userData.selected = undefined;
        }

        // Event handler for when the squeeze button is pressed
        function onSqueezeStart() {
            // Set the squeeze button state to pressed
            this.userData.squeezePressed = true;
            // If an object is selected, attach it to the controller
            if (this.userData.selected !== undefined) {
                this.attach(this.userData.selected);
                this.userData.attachedObject = this.userData.selected;
            }
        }

        // Event handler for when the squeeze button is released
        function onSqueezeEnd() {
            // Set the squeeze button state to released
            this.userData.squeezePressed = false;
            // If an object is attached, detach it from the controller and attach it to the room
            if (this.userData.attachedObject !== undefined) {
                self.room.attach(this.userData.attachedObject);
                this.userData.attachedObject = undefined;
            }
        }

        // Event handler for when a controller is disconnected
        function onDisconnected() {
            const index = this.userData.index;
            console.log(`Disconnected controller ${index}`);

            if (self.controllers) {
                const obj = (index == 0) ? self.controllers.right : self.controllers.left;

                if (obj) {
                    if (obj.controller) {
                        const controller = obj.controller;
                        // Remove all children from the controller
                        while (controller.children.length > 0)
                            controller.remove(controller.children[0]);
                        // Remove the controller from the scene
                        self.scene.remove(controller);
                    }
                    if (obj.grip) 
                        self.scene.remove(obj.grip);
                }
            }
        }

        // Update the right controller if available
        if (info.right !== undefined) {
            const right = this.renderer.xr.getController(0);

            let trigger = false, squeeze = false;

            // Check if trigger and squeeze inputs are available
            Object.keys(info.right).forEach((key) => {
                if (key.indexOf('trigger') != -1)
                    trigger = true;
                if (key.indexOf('squeeze') != -1)
                    squeeze = true;
            });

            // Add event listeners for select and squeeze events
            if (trigger) {
                right.addEventListener('selectstart', onSelectStart);
                right.addEventListener('selectend', onSelectEnd);
            }

            if (squeeze) {
                right.addEventListener('squeezestart', onSqueezeStart);
                right.addEventListener('squeezeend', onSqueezeEnd);
            }

            // Add event listener for disconnection
            right.addEventListener('disconnected', onDisconnected);
        }

        // Update the left controller if available
        if (info.left !== undefined) {
            const left = this.renderer.xr.getController(1);

            let trigger = false, squeeze = false;

            // Check if trigger and squeeze inputs are available
            Object.keys(info.left).forEach((key) => {
                if (key.indexOf('trigger') != -1)
                    trigger = true;
                if (key.indexOf('squeeze') != -1)
                    squeeze = true;
            });

            // Add event listeners for select and squeeze events
            if (trigger) {
                left.addEventListener('selectstart', onSelectStart);
                left.addEventListener('selectend', onSelectEnd);
            }

            if (squeeze) {
                left.addEventListener('squeezestart', onSqueezeStart);
                left.addEventListener('squeezeend', onSqueezeEnd);
            }

            // Add event listener for disconnection
            left.addEventListener('disconnected', onDisconnected);
        }
    }

    /**
     * handleController method processes controller input and manages interactions
     * with objects within the 3D room environment. The method uses raycasting to
     * determine which object in the room the controller is currently pointing at.
     * 
     * @param {Object} controller - An object representing the state of the controller.
     * 
     * @property {Object} controller.userData.selectPressed - A boolean indicating whether 
     * the "select" button on the controller is currently being pressed.
     * 
     * @property {Object} controller.userData.selected - Represents the object in the room
     * that the controller is currently pointing at. The property is updated with the 
     * intersected object when select button is pressed. If no object is intersected, it's 
     * set to null.
     * 
     * @property {Object} controller.matrixWorld - Represents the matrix of the controller in
     * world space used to set the origin and direction of the ray.
     * 
     * @property {Object} controller.children[0].scale.z - Represents the scale of the first 
     * child object of the controller in the Z dimension. It is modified to provide visual 
     * feedback to the user when they're pressing the select button.
     */
    handleController(controller) {
        if (controller.userData.selectPressed) {
        // check if the "select" button (or some equivalent button, depending on your controller's layout) 
        // on the controller is currently being pressed. 
        // If it is not, the function does nothing and immediately returns.

            // modify the scale of the first child object of the controller in the Z dimension
            controller.children[0].scale.z = 10;

            // reset 'workingMatrix' to the identity matrix and then sets it to the rotation part of the controller.matrixWorld. 
            // The matrixWorld property represents the matrix of the controller in world space, 
            // and extractRotation will extract the rotational part of that matrix.
            this.workingMatrix.identity().extractRotation(controller.matrixWorld);

            // set the origin of the ray to the position of the controller in the 3D world.
            // Raycasting is a method used in 3D graphics to solve a variety of problems; 
            // in this case, it's being used to determine what the controller is currently pointing at.
            this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);

            // set the origin of the ray to the position of the controller in the 3D world. 
            // Raycasting is a method used in 3D graphics to solve a variety of problems; 
            // in this case, it's being used to determine what the controller is currently pointing at.
            this.raycaster.ray.direction.set(0, 0, - 1).applyMatrix4(this.workingMatrix);

            // check for any intersections between the ray and the child objects of this.room 
            // (which presumably represent the objects in the environment that can be interacted with).
            const intersects = this.raycaster.intersectObjects(this.room.children);

            if (intersects.length > 0) {
            //  If there was at least one intersection, this indicates that the controller is pointing at something

                // add a highlight object to the first intersected object.
                intersects[0].object.add(this.highlight);

                // make the highlight object visible
                this.highlight.visible = true;

                // scale the first child object of the controller in the Z direction based on the distance to the intersected object. 
                controller.children[0].scale.z = intersects[0].distance;

                // set the selected property of controller.userData to the first intersected object
                controller.userData.selected = intersects[0].object;

            } else {
            //  If there were no intersections (i.e., the controller is not pointing at anything).

                // make the highlight object invisible  
                this.highlight.visible = false;
            }
        }
    }

    /**
     * Moves the dolly forward when the controller's "select" button is pressed,
     * unless there's a collider object less than `wallLimit` units directly in front.
     * The y-position of the dolly is reset to ground level (0) after every movement.
     *
     * @param {object} controller - The controller object, expected to have a property `userData` with a `selectPressed` boolean.
     * @param {number} dt - Delta Time, typically the time elapsed since the last frame.
     */
    handleController2(controller, dt){
        if(controller.userData.selectPressed){
        // This checks if the "select" button on the controller is pressed.

            //  set a limit for how close the player can get to a wall.
            const wallLimit = 1.3;
            // clone the current position of the "dolly"
            // (which is usually a camera controller, or some kind of entity that moves around in the 3D space).
            let pos = this.dolly.position.clone();

            // increases the y-position (vertical position) of the "dolly"
            pos.y += 1;
            
            // set the speed which dolly moves at.
            const speed = 2.0;
            
            // clone the current rotation of the dolly, stored as a quaternion.
            const quaternion = this.dolly.quaternion.clone();

            // update the dolly's rotation to match the dummy camera's world rotation.
            this.dolly.quaternion.copy(this.dummyCam.getWorldQuaternion(new THREE.Quaternion()));

            // retrieve the direction in which the dolly is currently facing and stores it in this.workingVector.
            this.dolly.getWorldDirection(this.workingVector);

            // flip  the direction stored in workingVector to its opposite.
            this.workingVector.negate();


            // set the origin and direction for a raycaster. 
            // A raycaster is used for picking 
            // (finding out what objects in the 3D scene are under the mouse cursor) 
            // or for collision detection.
            this.raycaster.set(pos, this.workingVector);

            // This declares a flag variable blocked, initially set to false. 
            // This flag is used to track whether the dolly's movement is blocked by something.
            let blocked = false;

            // This declares a flag variable blocked, initially set to false. 
            // This flag is used to track whether the dolly's movement is blocked by something.
            let intersect = this.raycaster.intersectObjects(this.colliders);

            if(intersect.length > 0){
            // If there are one or more intersections...
                if(intersect[0].distance < wallLimit){
                //  If the distance to the closest intersecting object is less than wallLimit

                    //  Then the dolly is considered blocked.
                    // blocked = true;
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
    }

    /**
     * Resizes the renderer and updates the camera aspect ratio.
     */
    resize() {
        // Calculate the new aspect ratio based on the window size
        this.camera.aspect = window.innerWidth / window.innerHeight;

        // Update the projection matrix with the new aspect ratio
        this.camera.updateProjectionMatrix();

        // Resize the renderer to match the new window size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Renders the scene and handles controller input.
     */
    render() {
        // Get the time since the last frame
        const dt = this.clock.getDelta();

        // Rotate the mesh
        this.mesh.rotateY(0.01);

        // Check if the renderer is in XR presenting mode
        if (this.renderer.xr.isPresenting) {
            const self = this;

            // Handle controller input for each controller
            if (this.controllers) {
                Object.values(this.controllers).forEach((value) => {
                    self.handleController(value.controller);

                    // Handle a different controller function with dt parameter
                    // TypeError: Cannot read properties of undefined (reading 'setFromRotationMatrix')
                    self.handleController2(value.controller, dt);
                });
            }

            // Update the gamepad state every 0.3 seconds
            if (this.elapsedTime === undefined) this.elapsedTime = 0;
            this.elapsedTime += dt;
            if (this.elapsedTime > 0.3) {
                this.updateGamepadState();
                this.elapsedTime = 0;
            }
        } else {
            // Update the stats if not in XR presenting mode
            this.stats.update();
        }

        // Render the scene with the camera
        this.renderer.render(this.scene, this.camera);
    }

}


export { App };

document.addEventListener("DOMContentLoaded", function () {
    const app = new App();
    window.app = app;
});