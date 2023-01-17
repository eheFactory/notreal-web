import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory';
import Stats from 'three/examples/jsm/libs/stats.module'
import {BoxLineGeometry} from 'three/examples/jsm/geometries/BoxLineGeometry.js'

// import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { VRButton } from './VRButton';

export class App{
    camera: THREE.PerspectiveCamera;
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    mesh: THREE.Mesh;
    clock: THREE.Clock;
    controls: OrbitControls;
    stats: Stats;
    radius: number;
    room: THREE.LineSegments;    
    raycaster : THREE.Raycaster;
    workingMatrix : THREE.Matrix4;
    workingVector : THREE.Vector3;
    controllers: THREE.XRTargetRaySpace[];
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );

        this.clock = new THREE.Clock();
        
		this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 100 );
		this.camera.position.set( 0, 1.6, 3 );
        
		this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( 0xaaaaaa );

        // const ambient = this.scene.add( new THREE.HemisphereLight( 0x606060, 0x404040 ) );
		const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 0.3);
		this.scene.add(ambient);
        
        const light = new THREE.DirectionalLight();
        light.position.set( 0.2, 1, 1);
        // light.position.set( 1, 1, 1 ).normalize();
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

        this.stats = Stats();
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
        
        this.renderer.setAnimationLoop(this.render.bind(this));

        window.addEventListener('resize', this.resize.bind(this) );
	}	
    
    random( min:number, max:number): number {
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
                    {color: Math.random() * 0xFFFFF}
                )  
            );

            object.position.x = this.random(-2, 2);
            object.position.y = this.random(-2, 2);
            object.position.z = this.random(-2, 2);

            this.room.add(object);
        }
    }
    
    setupXR(){
        this.renderer.xr.enabled = true;
        // document.body.appendChild(VRButton.createButton(this.renderer));
        const button = new VRButton( this.renderer );

        this.controllers = this.buildControllers();
    }

    buildControllers(){
        const controllerModelFactory = new XRControllerModelFactory();

        const geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, - 1 ) ] );

        const line = new THREE.Line( geometry );
        line.name = 'line';
		line.scale.z = 10;
        
        const controllers = [];
        
        for(let i=0; i<=1; i++){
            const controller = this.renderer.xr.getController( i );
            controller.add( line.clone() );
            controller.userData.selectPressed = false;
            this.scene.add( controller );
            
            controllers.push( controller );
            
            const grip = this.renderer.xr.getControllerGrip( i );
            grip.add( controllerModelFactory.createControllerModel( grip ) );
            this.scene.add( grip );
        }
        
        return controllers;
    }
    
    handleController( controller:any ){
        
    }

    resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );  
    }
    
	render( ) {   
        this.mesh.rotateY( 0.01 );
        this.renderer.render( this.scene, this.camera );
        this.stats.update();
        
        if (this.controllers ){
            const self = this;
            this.controllers.forEach( ( controller) => { 
                self.handleController( controller ) 
            });
        }
        
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const app = new App();
    (window as any).app = app;
});