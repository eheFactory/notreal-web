import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory';
import Stats from 'three/examples/jsm/libs/stats.module'
import {BoxLineGeometry} from 'three/examples/jsm/geometries/BoxLineGeometry.js'
import { GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import { SpotLightVolumetricMaterial } from './SpotLightVolumetricMaterial';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
// import { VRButton } from './VRButton';

export class App{
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );

        this.clock = new THREE.Clock();
        
		this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 100 );
		this.camera.position.set( 0, 1.6, 3 );
        
		this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( 0xaaaaaa );

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

        this.highlight = new THREE.Mesh( 
            geometry, 
            new THREE.MeshBasicMaterial( 
                { 
                    color: 0xffffff, 
                    side: THREE.BackSide 
                    // side: THREE.FrontSide
                    // side: THREE.BothSide
                } 
            ) 
        );
        this.highlight.scale.set(1.2, 1.2, 1.2);
        this.scene.add(this.highlight);
    }
    
    setupXR(){
        this.renderer.xr.enabled = true;
        // const button = new VRButton( this.renderer );
        document.body.appendChild(VRButton.createButton(this.renderer));

        const onSelectStart = () => {
            this.userData.selectPressed = true;
            if (self.spotlight) self.spotlight.visible = true;
        }

        const onSelectEnd = () => {
            this.highlight.visible = false;
            this.userData.selectPressed = false;
            if (this.spotlight) this.spotlight.visible = false;
        }

        this.controller = this.renderer.xr.getController( 0 );
        this.controller.addEventListener( 'selectstart', onSelectStart );
        this.controller.addEventListener( 'selectend', onSelectEnd );
        this.controller.addEventListener( 'connected', function ( event ) {

            self.buildController.call(self, event.data, this );

        } );

        this.controller.addEventListener( 'disconnected', function () {
            self.controller = null;
        } );
        this.scene.add( this.controller );
        this.scene.add(this.highlight);
    }

    buildController(data, controller){
        let geometry, material, loader;        

        switch ( data.targetRayMode ) {    
            case 'tracked-pointer':
                loader = new GLTFLoader().setPath('../assets/');
                loader.load( 
                    'flash-light.glb',
                    ( gltf ) => {
                        const flashLight = gltf.scene.children[2];
                        const scale = 0.6;
                        flashLight.scale.set(scale, scale, scale);
                        controller.add( flashLight );
                        this.spotlight = new THREE.Group();
                        const spotlight = new THREE.SpotLight( 0xFFFFFF, 2, 12, Math.PI/15, 0.3 );
                        geometry = new THREE.CylinderGeometry(0.03, 1, 5, 32, 5, true);
                        geometry.rotateX( Math.PI/2 );
                        material = new SpotLightVolumetricMaterial();
                        const cone = new THREE.Mesh( geometry, material );
                        cone.translateZ( -2.6 );
                    
                        spotlight.position.set(0,0,0);
                        spotlight.target.position.set(0,0,-1);
                        this.spotlight.add( spotlight.target );
                        this.spotlight.add( spotlight );
                        this.spotlight.add( cone );
                        
                        controller.add(this.spotlight);
                        this.spotlight.visible = false;
                    },
                    null,
                    (error) =>  {
                        console.error( 'An error occurred' );    
                    }
                );
                break;
            case 'gaze':
                geometry = new THREE.RingGeometry( 0.02, 0.04, 32 ).translate( 0, 0, - 1 );
                material = new THREE.MeshBasicMaterial( { opacity: 0.5, transparent: true } );
                controller.add( new THREE.Mesh( geometry, material ) )

        }
    }
    
    handleController( controller){
        if (controller.userData.selectPressed ){
            this.workingMatrix.identity().extractRotation( controller.matrixWorld );

            this.raycaster.ray.origin.setFromMatrixPosition( controller.matrixWorld );
            this.raycaster.ray.direction.set( 0, 0, - 1 ).applyMatrix4( this.workingMatrix );

            const intersects = this.raycaster.intersectObjects( this.room.children );

            if (intersects.length>0){
                intersects[0].object.add(this.highlight);
                this.highlight.visible = true;
                controller.children[0].scale.z = intersects[0].distance;
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
        this.mesh.rotateY( 0.01 );
        this.stats.update();
        if (this.controller ) this.handleController( this.controller );
        this.renderer.render( this.scene, this.camera );
    }

    remove(){}
}

document.addEventListener("DOMContentLoaded", function () {
    const app = new App();
    window.app = app;
});