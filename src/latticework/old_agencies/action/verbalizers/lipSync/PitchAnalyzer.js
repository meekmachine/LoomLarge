import { PitchDetector } from "pitchy";

export default class PitchAnalyzer {
    constructor(audioContext) {
        this.audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
        this.analyserNode = this.audioContext.createAnalyser();
        this.detector = null;
        this.input = null;
        this.minVolumeDecibels = -10;
    }

    /**
     * Initialize the pitch detection once the audio stream is available.
     */
    initializeDetector() {
        this.detector = PitchDetector.forFloat32Array(this.analyserNode.fftSize);
        this.input = new Float32Array(this.detector.inputLength);
    }

    /**
     * Start capturing the audio stream and connect it to the analyser node.
     */
    startCapturing() {
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            this.audioContext.createMediaStreamSource(stream).connect(this.analyserNode);
            this.initializeDetector();
        });
    }

    analyzePitch() {
        if (!this.detector) {
            console.warn("PitchDetector is not initialized.");
            return { pitch: null, clarity: null };
        }
        
        this.analyserNode.getFloatTimeDomainData(this.input);
        const [pitch, clarity] = this.detector.findPitch(this.input, this.audioContext.sampleRate);
        console.log(`Pitch: ${pitch} Hz, Clarity: ${clarity}`);
        return { pitch, clarity };
    }
}