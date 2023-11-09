import * as THREE from 'three';

const OrbitalGreen = (scene) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const voxelGroup = new THREE.Group();
    const RADIUS = 50; // Radius of the sphere
    const VOXEL_SIZE = 1;

    // Create a sphere of voxels
    for (let phi = 0; phi < Math.PI; phi += 0.1) {
        for (let theta = 0; theta < 2 * Math.PI; theta += 0.1) {
            const geometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
            const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
            const voxel = new THREE.Mesh(geometry, material);

            voxel.position.x = RADIUS * Math.sin(phi) * Math.cos(theta);
            voxel.position.y = RADIUS * Math.sin(phi) * Math.sin(theta);
            voxel.position.z = RADIUS * Math.cos(phi);

            voxelGroup.add(voxel);
        }
    }
    scene.add(voxelGroup);

    voxelGroup.animate = () => {
        analyser.getByteFrequencyData(dataArray);

        let dataIndex = 0;
        voxelGroup.children.forEach(voxel => {
            const scaleValue = (dataArray[dataIndex % bufferLength] + 1) / 25; // Using modulo to stay within bounds
            voxel.scale.set(scaleValue, scaleValue, scaleValue);
            dataIndex++;
        });
    };

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
        })
        .catch(err => {
            console.error('Error accessing the microphone:', err);
        });
};


export default OrbitalGreen;