import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory';
import Stats from 'three/examples/jsm/libs/stats.module'
import {BoxLineGeometry} from 'three/examples/jsm/geometries/BoxLineGeometry.js'
import { GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { SpotLightVolumetricMaterial } from './libs/SpotLightVolumetricMaterial';
import {CanvasUI} from './libs/CanvasUI';
// import { VRButton } from './libs/VRButton';
import {
	Constants as MotionControllerConstants,
	fetchProfile,
	MotionController
} from 'three/examples/jsm/libs/motion-controllers.module.js';
import { BufferGeometry } from 'three';

const DEFAULT_PROFILES_PATH = 'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles';
const DEFAULT_PROFILE = 'generic-trigger';

export class App{
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );

        this.clock = new THREE.Clock();
        
		this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 100 );
		this.camera.position.set( 0, 1.6, 3 );
        
		this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( 0x505050 );

        const ambient = new THREE.HemisphereLight( 0x606060, 0x404040 );
		// const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 0.3);
		this.scene.add(ambient);
        
        const light = new THREE.DirectionalLight();
        // light.position.set( 0.2, 1, 1);
        light.position.set( 1, 1, 1 ).normalize();
		this.scene.add( light );
			
		// this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true } );
		this.renderer = new THREE.WebGLRenderer({ antialias: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.outputEncoding = THREE.sRGBEncoding;

		container.appendChild( this.renderer.domElement );
		
        this.controls = new OrbitControls( this.camera, this.renderer.domElement );
        this.controls.target.set(0, 1.6, 0);
        this.controls.update();

        this.stats = new Stats();
        container.appendChild( this.stats.dom );

        //Replace Box with Circle, Cone, Cylinder, Dodecahedron, Icosahedron, Octahedron, Plane, Sphere, Tetrahedron, Torus or TorusKnot
        const geometry = new THREE.BoxGeometry(); 
        const material = new THREE.MeshStandardMaterial( { color: 0xFF0000 });
        this.mesh = new THREE.Mesh( geometry, material );
        this.scene.add(this.mesh);

                
        this.raycaster = new THREE.Raycaster();
        this.workingMatrix = new THREE.Matrix4();
        this.workingVector = new THREE.Vector3();
        

        this.initScene();
        this.setupXR();
        
        window.addEventListener('resize', this.resize.bind(this) );
        this.renderer.setAnimationLoop(this.render.bind(this));
	}	
    
    random(min, max){
        return Math.random() * (max-min) + min;
    }

    initScene(){
        this.radius = 0.08;
        this.room = new THREE.LineSegments(
            // new THREE.BoxGeometry(6,6,6,10,10,10),
            new BoxLineGeometry(6,6,6,10,10,10),
            new THREE.LineBasicMaterial({color:0x808080})
        );
        this.room.geometry.translate(0, 3, 0);
        this.scene.add(this.room);

        const geometry = new THREE.IcosahedronGeometry(this.radius, 2);

        for(let i=0; i<200; i++){
            const object = new THREE.Mesh(
                geometry,
                new THREE.MeshLambertMaterial(
                    {color: Math.random() * 0xffffff}
                )  
            );

            object.position.x = this.random(-2, 2);
            object.position.y = this.random(-2, 2);
            object.position.z = this.random(-2, 2);

            this.room.add(object);
        }

                                                                                                    // side: THREE.FrontSide
                                                                                                    // side: THREE.BothSide
        this.highlight = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { color: 0xffffff, side: THREE.BackSide } ) );
        this.highlight.scale.set(1.2, 1.2, 1.2);
        this.scene.add(this.highlight);
        this.ui = this.createUI();
    }
    
    createUI(){
        const config = {
            panelSize: { height: 0.5 },
            height: 256,
            body: { type: "text" }
        }
        const ui = new CanvasUI( { body: "" }, config );
        ui.mesh.position.set(0, 1.5, -1);
        this.scene.add( ui.mesh );
        return ui;
    }

    //{"trigger":{"button":0},"touchpad":{"button":2,"xAxis":0,"yAxis":1}},"squeeze":{"button":1},"thumbstick":{"button":3,"xAxis":2,"yAxis":3},"button":{"button":6}}}
    createButtonStates(components){

        const buttonStates = {};
        this.gamepadIndices = components;
        
        Object.keys( components ).forEach( (key) => {
            if ( key.indexOf('touchpad')!=-1 || key.indexOf('thumbstick')!=-1){
                buttonStates[key] = { button: 0, xAxis: 0, yAxis: 0 };
            }else{
                buttonStates[key] = 0; 
            }
        })
        
        this.buttonStates = buttonStates;
    }
    
    updateUI(){
        const str = JSON.stringify( this.buttonStates );
        if (this.strStates === undefined || ( str != this.strStates )){
            this.ui.updateElement( 'body', str );
            this.ui.update(); 
            this.strStates = str;
        }
    }

    updateGamepadState(){
        const session = this.renderer.xr.getSession();
        
        const inputSource = session.inputSources[0];
        
        if (inputSource && inputSource.gamepad && this.gamepadIndices && this.ui && this.buttonStates){
            const gamepad = inputSource.gamepad;
            try{
                Object.entries( this.buttonStates ).forEach( ( [ key, value ] ) => {
                    const buttonIndex = this.gamepadIndices[key].button;
                    if ( key.indexOf('touchpad')!=-1 || key.indexOf('thumbstick')!=-1){
                        const xAxisIndex = this.gamepadIndices[key].xAxis;
                        const yAxisIndex = this.gamepadIndices[key].yAxis;
                        this.buttonStates[key].button = gamepad.buttons[buttonIndex].value; 
                        this.buttonStates[key].xAxis = gamepad.axes[xAxisIndex].toFixed(2); 
                        this.buttonStates[key].yAxis = gamepad.axes[yAxisIndex].toFixed(2); 
                    }else{
                        this.buttonStates[key] = gamepad.buttons[buttonIndex].value;
                    }
                    
                    this.updateUI();
                });
            }catch(e){
                console.warn("An error occurred setting the ui");
            }
        }
    }

    setupXR(){
        this.renderer.xr.enabled = true;
        document.body.appendChild(VRButton.createButton(this.renderer));

        const onConnected = (event) => {
            const info = {}

            fetchProfile(event.data, DEFAULT_PROFILES_PATH, DEFAULT_PROFILE).then(({profile, assetPath}) => {
                console.log( JSON.stringify(profile));

                info.name = profile.profileId;
                info.targetRayMode = event.data.targetRayMode;

                Object.entries(profile.layouts).forEach(( [key, layout] ) => {
                    const components = {};
                    Object.values(layout.components).forEach((component) => {
                        components[component.rootNodeName] = component.gamepadIndices;
                    });
                    info[key] = components;
                });
                this.createButtonStates(info.riht);
                console.log(JSON.stringify(info));
                this.updateControllers(info);
            });
        }
        const controller = this.renderer.xr.getController(0);
        controller.addEventListener('connected', onConnected);
        const modelFactory = new XRControllerModelFactory();
        const geometry = new THREE.BufferGeometry().setFromPoints(
            [
                new THREE.Vector3(0,0,0),
                new THREE.Vector3(0,0,-1)
            ]
        );

        const line = new THREE.Line(geometry);
        line.scale.z = 0;

        this.controllers = {};
        this.controllers.right = this.buildController(0, line, modelFactory);
        this.controllers.left = this.buildController(1, line, modelFactory);
    }
    
    buildController(index, line, modelFactory){
        const controller = this.renderer.xr.getController( index );
        
        controller.userData.selectPressed = false;
        controller.userData.index = index;
        
        if (line) controller.add( line.clone() );
        
        this.scene.add( controller );
        
        let grip;
        
        if ( modelFactory ){
            grip = this.renderer.xr.getControllerGrip( index );
            grip.add( modelFactory.createControllerModel( grip ));
            this.scene.add( grip );
        }
        
        return { controller, grip };
    }
    
    updateControllers(info){
        const onSelectStart = () => {
            this.userData.selectPressed = true;
        }
        const onSelectEnd = () => {
            this.children[0].scale.z = 0;
            this.userData.selectPressed = false;
            this.userData.selected = undefined;
        }
        const onSqueezeStart = () => {
            this.userData.squeezePressed = true;
            if (this.userData.selected !== undefined ){
                this.attach( this.userData.selected );
                this.userData.attachedObject = this.userData.selected;
            }
        }
        const onSqueezeEnd = () => {
            this.userData.squeezePressed = false;
            if (this.userData.attachedObject !== undefined){
                this.room.attach( this.userData.attachedObject );
                this.userData.attachedObject = undefined;
            }
        }
        const onDisconnected = () => {
            const index = this.userData.index;
            console.log(`Disconnected controller ${index}`);
            if ( this.controllers ){
                const obj = (index==0) ? this.controllers.right : this.controllers.left;
                if (obj){
                    if (obj.controller){
                        const controller = obj.controller;
                        while( controller.children.length > 0 ) controller.remove( controller.children[0] );
                        this.scene.remove( controller );
                    }
                    if (obj.grip) this.scene.remove( obj.grip );
                }
            }
        }
        
        if (info.right !== undefined){
            const right = this.renderer.xr.getController(0);
            
            let trigger = false, squeeze = false;
            
            Object.keys( info.right ).forEach( (key) => {
                if (key.indexOf('trigger')!=-1) trigger = true;                   
                if (key.indexOf('squeeze')!=-1) squeeze = true;      
            });
            if (trigger){
                right.addEventListener( 'selectstart', onSelectStart );
                right.addEventListener( 'selectend', onSelectEnd );
            }
            if (squeeze){
                right.addEventListener( 'squeezestart', onSqueezeStart );
                right.addEventListener( 'squeezeend', onSqueezeEnd );
            }
            right.addEventListener( 'disconnected', onDisconnected );
        }
        if (info.left !== undefined){
            const left = this.renderer.xr.getController(1);   
            let trigger = false, squeeze = false;
            Object.keys( info.left ).forEach( (key) => {
                if (key.indexOf('trigger')!=-1) trigger = true;                   
                if (key.indexOf('squeeze')!=-1) squeeze = true;      
            });
            
            if (trigger){
                left.addEventListener( 'selectstart', onSelectStart );
                left.addEventListener( 'selectend', onSelectEnd );
            }

            if (squeeze){
                left.addEventListener( 'squeezestart', onSqueezeStart );
                left.addEventListener( 'squeezeend', onSqueezeEnd );
            }
            
            left.addEventListener( 'disconnected', onDisconnected );
        }
    }

    handleController( controller){
        if (controller.userData.selectPressed ){
            controller.children[0].scale.z = 10;

            this.workingMatrix.identity().extractRotation( controller.matrixWorld );

            this.raycaster.ray.origin.setFromMatrixPosition( controller.matrixWorld );
            this.raycaster.ray.direction.set( 0, 0, - 1 ).applyMatrix4( this.workingMatrix );

            const intersects = this.raycaster.intersectObjects( this.room.children );

            if (intersects.length>0){
                intersects[0].object.add(this.highlight);
                this.highlight.visible = true;
                controller.children[0].scale.z = intersects[0].distance;
                controller.userData.selected = intersects[0].object;
            }else{
                this.highlight.visible = false;
            }
        }
    }

    resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );  
    }
    
	render( ) {   
        const dt = this.clock.getDelta();
        this.mesh.rotateY( 0.01 );
        
        if(this.renderer.xr.isPresenting){
            if(this.controllers){
                Object.values(this.controllers).forEach((value) => {
                    this.handleController(value.controller);
                });
            }
            if(this.elapsedTime === undefined) this.elapsedTime = 0;
            this.elapsedTime += dt;
            if(this.elapsedTime > 0.3){
                this.updateGamepadState();
                this.elapsedTime = 0;
            }
        }else{
            this.stats.update();
        }

        this.renderer.render( this.scene, this.camera );
    }

    remove(){}
}

document.addEventListener("DOMContentLoaded", function () {
    const app = new App();
    window.app = app;
});