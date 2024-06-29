import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

import {setupXR, handleController, updateGamepadState} from './libs/XRControllers.js';
import Stats from 'stats.js';


const createSpace = () => {
    const space = {};
    const container = document.createElement('div');
    document.body.appendChild(container);

    space.clock = new THREE.Clock();

    space.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    space.camera.position.set(0, 0, 5);

    space.scene = new THREE.Scene();
    // space.scene.background = new THREE.Color(0x1a1a2e); // Dark blue
    space.scene.background = new THREE.Color(0x010101); // Dark blue

    const hLight = new THREE.HemisphereLight(0x8e44ad, 0x3498db); // Purple to blue light
    hLight.position.set(1, 1, 1).normalize();
    space.scene.add(hLight);

    space.renderer = new THREE.WebGLRenderer({ antialias: true });
    space.renderer.setSize(window.innerWidth, window.innerHeight);
    space.renderer.setPixelRatio(window.devicePixelRatio);
    space.renderer.outputEncoding = THREE.sRGBEncoding;
    space.renderer.xr.enabled = true;

    container.appendChild(space.renderer.domElement);

    space.controls = new OrbitControls(space.camera, space.renderer.domElement);
    space.controls.target.set(0, 0, 0);
    space.controls.update();

    space.stats = new Stats();
    document.body.appendChild(space.stats.dom);

    space.composer = new EffectComposer(space.renderer);
    space.renderPass = new RenderPass(space.scene, space.camera);
    space.composer.addPass(space.renderPass);


    return space;
}


const onWindowResize = (space) => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;

    space.camera.aspect = newWidth / newHeight;
    space.camera.updateProjectionMatrix();

    if (!space.renderer.xr.isPresenting) {
        space.renderer.setSize(newWidth, newHeight);
    }
}



const render = (space) => {
    const dt = space.clock.getDelta();

    if(space.renderer.xr.isPresenting) {
        if(space.xrControllers.controllers) {
            console.log('scene: ', space.scene)
            console.log('controllers: ', space.xrControllers.controllers)
            Object.values(space.xrControllers.controllers).forEach((value) => {
                handleController(value.controller, space, space.scene.getObjectByName('valley'))
            });

            if (space.elapsedTime === undefined) space.elapsedTime = 0.0;
            space.elapsedTime += dt;
            if(space.elapsedTime > 0.3) {
                updateGamepadState(space);
                space.elapsedTime = 0.0;
            }
        } else {
            space.stats.update();
        }
    }

    space.renderer.render(space.scene, space.camera);
    space.stats.update();
}

const animate = (space) => {
    space.renderer.setAnimationLoop(() => animate(space));

    // scene.hLight.color.setHSL(Math.sin(space.clock.elapsedTime * 0.1) * 0.5 + 0.5, 0.5, 0.5);
    // scene.hLight.groundColor.setHSL(Math.sin(space.clock.elapsedTime * 0.1 + Math.PI) * 0.5 + 0.5, 0.5, 0.5);

    space.scene.traverse(object => {
        if (object.animate) {
            object.animate();
        }
    });
    render(space);
}


// const Func = (scene) => {
//     // define objects here

//     mesh.animate = () => {
//         // put animation logic here
//     }
//     scene.add(mesh);    
// };




const space = createSpace();
// setupXR(space);


const VoxelSphereColored2 = (scene) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const voxelGroup = new THREE.Group();
    const RADIUS = 100; 

    // Create a sphere of tetrahedron edges
    for (let phi = 0; phi < Math.PI; phi += 0.1) {
        for (let theta = 0; theta < 2 * Math.PI; theta += 0.1) {
            const geometry = new THREE.TetrahedronGeometry(1);
            const edges = new THREE.EdgesGeometry(geometry);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0xffffff}));

            line.position.x = RADIUS * Math.sin(phi) * Math.cos(theta);
            line.position.y = RADIUS * Math.sin(phi) * Math.sin(theta);
            line.position.z = RADIUS * Math.cos(phi);

            voxelGroup.add(line);
        }
    }
    scene.add(voxelGroup);

    voxelGroup.animate = () => {
        analyser.getByteFrequencyData(dataArray);

        voxelGroup.children.forEach(line => {
            const phi = Math.acos(line.position.z / RADIUS);
            
            let frequencyPercentage;
            
            if (phi < 0.2 || phi > Math.PI - 0.2) {
                frequencyPercentage = 0.1;
            } else {
                frequencyPercentage = (line.position.y + RADIUS) / (2 * RADIUS);
            }

            let dataIndex = Math.floor(frequencyPercentage * bufferLength);

            // Futuristic gradient colors based on spectrum
            if (frequencyPercentage < 0.15) {
                line.material.color.set(0x8A2BE2); // Deep purple
            } else if (frequencyPercentage < 0.3) {
                line.material.color.set(0x4B0082); // Indigo
            } else if (frequencyPercentage < 0.45) {
                line.material.color.set(0x00FFFF); // Bright cyan
            } else if (frequencyPercentage < 0.6) {
                line.material.color.set(0x00FF00); // Bright green
            } else if (frequencyPercentage < 0.75) {
                line.material.color.set(0xFF69B4); // Bright pink
                line.material.color.set(0x4B0082); // Indigo

            } else if (frequencyPercentage < 0.9) {
                line.material.color.set(0xFF4500); // Bright orange
            } else {
                line.material.color.set(0x9400D3); // Violet
            }

            const scaleValue = (dataArray[dataIndex] + 1) / 25;
            line.scale.set(scaleValue, scaleValue, scaleValue);

            line.rotation.x += 0.005;
            line.rotation.y += 0.005;
        });

        voxelGroup.rotation.x += 0.001;
        voxelGroup.rotation.y += 0.002;
    };

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log("AudioContext resumed successfully.");
                });
            }
        })
        .catch(err => {
            console.error('Error accessing the microphone:', err);
        });


    function flat() {
        requestAnimationFrame(lat);

        // Get frequency data
        analyser.getByteFrequencyData(dataArray);

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 255;  // normalize to [0, 1]
            const bar = scene.children[i];
            bar.scale.y = barHeight * 5;  // Scale the bar height
            bar.position.y = barHeight * 2.5;  // Adjust position due to scale

            // Set the color based on height
            // const r = Math.floor(barHeight * 255);
            // const g = Math.floor(255 * (i / bufferLength));
            // const b = 50;
            // barMaterials[i].color.setRGB(r/255, g/255, b/255);
        }
    }
};


const Spectrogram = (scene) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Set up geometry and material for bars in the spectrogram
    const barGeometry = new THREE.BoxGeometry(1, 1, 1);
    const barMaterials = [];
    const RADIUS = 100;  // Define a radius for the orbital bars

    for (let i = 0; i < bufferLength; i++) {
        const material = new THREE.MeshBasicMaterial({color: 0x000000});
        barMaterials.push(material);
        const bar = new THREE.Mesh(barGeometry, material);
        
        // Position bars in a circular manner
        const theta = (i / bufferLength) * 2 * Math.PI;
        bar.position.x = RADIUS * Math.sin(theta);
        bar.position.z = RADIUS * Math.cos(theta);

        scene.add(bar);
    }

    // Get microphone input
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            // Check and resume suspended AudioContext
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log("AudioContext resumed successfully.");
                });
            }

            animateBars();
        })
        .catch(err => {
            console.error("Microphone access denied or unavailable:", err);
        });

    function animateBars() {
        requestAnimationFrame(animateBars);

        // Get frequency data
        analyser.getByteFrequencyData(dataArray);

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 255;  // normalize to [0, 1]
            const bar = scene.children[i];
            bar.scale.y = barHeight * 5;  // Scale the bar height
            bar.position.y = barHeight * 2.5;  // Adjust position due to scale

            // Set the color based on height
            const r = Math.floor(barHeight * 255);
            const g = Math.floor(255 * (i / bufferLength));
            const b = 50;
            barMaterials[i].color.setRGB(r/255, g/255, b/255);
        }
    }
};


const Tetrahedron = (scene) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const voxelGroup = new THREE.Group();
    const RADIUS = 100;

    // Create a sphere of tetrahedron edges
    for (let phi = 0; phi < Math.PI; phi += 0.1) {
        for (let theta = 0; theta < 2 * Math.PI; theta += 0.1) {
            const geometry = new THREE.TetrahedronGeometry(1);
            const edges = new THREE.EdgesGeometry(geometry);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0xffffff}));

            line.initialPosition = new THREE.Vector3(
                RADIUS * Math.sin(phi) * Math.cos(theta),
                RADIUS * Math.sin(phi) * Math.sin(theta),
                RADIUS * Math.cos(phi)
            );

            line.position.set(0, 0, 0);  // Initially set all lines at the center

            voxelGroup.add(line);
        }
    }
    scene.add(voxelGroup);

    voxelGroup.animate = () => {
        analyser.getByteFrequencyData(dataArray);

        voxelGroup.children.forEach(line => {
            const phi = Math.acos(line.initialPosition.z / RADIUS);

            let frequencyPercentage;
            
            if (phi < 0.2 || phi > Math.PI - 0.2) {
                frequencyPercentage = 0.1;
            } else {
                frequencyPercentage = (line.initialPosition.y + RADIUS) / (2 * RADIUS);
            }

            let dataIndex = Math.floor(frequencyPercentage * bufferLength);
            
            // Use audio data to update line positions
            const lerpFactor = (dataArray[dataIndex] / 255);
            line.position.lerp(new THREE.Vector3(0, 0, 0), lerpFactor);  // Lerp towards the center when sound level decreases

            // Futuristic gradient colors based on spectrum
            if (frequencyPercentage < 0.15) {
                line.material.color.set(0x8A2BE2); // Deep purple
            } else if (frequencyPercentage < 0.3) {
                line.material.color.set(0x4B0082); // Indigo
            } else if (frequencyPercentage < 0.45) {
                line.material.color.set(0x00FFFF); // Bright cyan
            } else if (frequencyPercentage < 0.6) {
                line.material.color.set(0x00FF00); // Bright green
            } else if (frequencyPercentage < 0.75) {
                line.material.color.set(0xFF69B4); // Bright pink
            } else if (frequencyPercentage < 0.9) {
                line.material.color.set(0xFF4500); // Bright orange
            } else {
                line.material.color.set(0x9400D3); // Violet
            }

            const scaleValue = (dataArray[dataIndex] + 1) / 25;
            line.scale.set(scaleValue, scaleValue, scaleValue);

            line.rotation.x += 0.005;
            line.rotation.y += 0.005;
        });

        voxelGroup.rotation.x += 0.001;
        voxelGroup.rotation.y += 0.002;
    };

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log("AudioContext resumed successfully.");
                });
            }
        })
        .catch(err => {
            console.error('Error accessing the microphone:', err);
        });
};



const OrbitalFlat = (scene) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const voxelGroup = new THREE.Group();
    const RADIUS = 100;

    // Create a sphere of tetrahedron edges
    for (let phi = 0; phi < Math.PI; phi += 0.1) {
        for (let theta = 0; theta < 2 * Math.PI; theta += 0.1) {
            const geometry = new THREE.TetrahedronGeometry(1);
            const edges = new THREE.EdgesGeometry(geometry);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0xffffff}));

            line.initialPosition = new THREE.Vector3(
                RADIUS * Math.sin(phi) * Math.cos(theta),
                RADIUS * Math.sin(phi) * Math.sin(theta),
                RADIUS * Math.cos(phi)
            );
            line.position.copy(line.initialPosition);

            voxelGroup.add(line);
        }
    }
    scene.add(voxelGroup);

    voxelGroup.animate = () => {
        analyser.getByteFrequencyData(dataArray);

        voxelGroup.children.forEach(line => {
            const phi = Math.acos(line.initialPosition.z / RADIUS);

            let frequencyPercentage;
            
            if (phi < 0.2 || phi > Math.PI - 0.2) {
                frequencyPercentage = 0.1;
            } else {
                frequencyPercentage = (line.initialPosition.y + RADIUS) / (2 * RADIUS);
            }

            let dataIndex = Math.floor(frequencyPercentage * bufferLength);

            // Adjust position based on sound amplitude
            const lerpFactor = dataArray[dataIndex] / 255;
            line.position.lerpVectors(line.initialPosition, new THREE.Vector3(0, 0, 0), 1 - lerpFactor);

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

            const scaleValue = (dataArray[dataIndex] + 1) / 25;
            line.scale.set(scaleValue, scaleValue, scaleValue);

            line.rotation.x += 0.005;
            line.rotation.y += 0.005;
        });

        voxelGroup.rotation.x += 0.001;
        voxelGroup.rotation.y += 0.002;
    };

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log("AudioContext resumed successfully.");
                });
            }
        })
        .catch(err => {
            console.error('Error accessing the microphone:', err);
        });
};


const VoxelSphereColored3 = (scene) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const voxelGroup = new THREE.Group();
    const RADIUS = 100; 

    // Create a sphere of tetrahedron edges
    for (let phi = 0; phi < Math.PI; phi += 0.1) {
        for (let theta = 0; theta < 2 * Math.PI; theta += 0.1) {
            const geometry = new THREE.TetrahedronGeometry(1);
            const edges = new THREE.EdgesGeometry(geometry);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0xffffff}));

            line.position.x = RADIUS * Math.sin(phi) * Math.cos(theta);
            line.position.y = RADIUS * Math.sin(phi) * Math.sin(theta);
            line.position.z = RADIUS * Math.cos(phi);

            voxelGroup.add(line);
        }
    }
    scene.add(voxelGroup);

    // Unified Animation Function
    function animate() {
        requestAnimationFrame(animate);
        analyser.getByteFrequencyData(dataArray);

        // Animation for tetrahedron
        voxelGroup.children.forEach(line => {
            const phi = Math.acos(line.position.z / RADIUS);
            
            let frequencyPercentage;
            
            if (phi < 0.2 || phi > Math.PI - 0.2) {
                frequencyPercentage = 0.1;
            } else {
                frequencyPercentage = (line.position.y + RADIUS) / (2 * RADIUS);
            }

            let dataIndex = Math.floor(frequencyPercentage * bufferLength);
            
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
            voxelGroup.scale.y = barHeight * 5;
            voxelGroup.position.y = barHeight * 2.5;

            const scaleValue = (dataArray[dataIndex] + 1) / 25;
            line.scale.set(scaleValue, scaleValue, scaleValue);
            line.rotation.x += 0.005;
            line.rotation.y += 0.005;
        });
        voxelGroup.rotation.y += 0.002;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log("AudioContext resumed successfully.");
                });
            }

            animate();
        })
        .catch(err => {
            console.error("Microphone access denied or unavailable:", err);
        });
};


VoxelSphereColored3(space.scene);

// VoxelSphereColored2(space.scene);
// Spectrogram(space.scene);


// OrbitalFlat(space.scene);
// Tetrahedron(space.scene);


window.addEventListener('resize', () => onWindowResize(space));
animate(space);
