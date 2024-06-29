import * as THREE from 'three';

const LinearVisualizerGreen = (scene) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    
    // We'll use these to store and visualize audio data
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Create visualizer objects: bars
    const bars = [];
    for (let i = 0; i < bufferLength; i++) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
        const bar = new THREE.Mesh(geometry, material);
        bar.position.x = i * 2 - bufferLength; // spread bars across scene
        scene.add(bar);
        bars.push(bar);
    }

    // Create a group for easy management of the bars if needed
    const barGroup = new THREE.Group();
    bars.forEach(bar => barGroup.add(bar));
    scene.add(barGroup);

    barGroup.animate = () => {
        // Fetch the audio data into dataArray
        analyser.getByteFrequencyData(dataArray);

        // Update the visualizer bars based on audio data
        for (let i = 0; i < bars.length; i++) {
            bars[i].scale.y = dataArray[i] / 50; // adjust this scaling factor as needed
            bars[i].position.y = bars[i].scale.y / 2; // to make it sit on 'ground'
        }
    };

    // Ask the user for microphone access
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
        })
        .catch(err => {
            console.error('Error accessing the microphone:', err);
        });
};

export default LinearVisualizerGreen;