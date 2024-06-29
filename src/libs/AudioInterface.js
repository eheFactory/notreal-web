import EventEmitter from 'events';

class AudioInterface extends EventEmitter {
    constructor() {
        super();
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                const source = this.audioContext.createMediaStreamSource(stream);
                source.connect(this.analyser);

                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume().then(() => {
                        console.log("AudioContext resumed successfully.");
                    });
                }

                this.emit('audioContextReady');
            })
            .catch(err => {
                console.error('Error accessing the microphone:', err);
            });

        // Periodically update data and emit the event
        this.intervalId = setInterval(() => {
            this.analyser.getByteFrequencyData(this.dataArray);
            this.emit('dataUpdate', this.dataArray);
        }, 50); // Update every 50 milliseconds
    }

    teardown() {
        clearInterval(this.intervalId);
    }
};

export {AudioInterface};