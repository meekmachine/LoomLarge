import React, { useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';

const FaceDetection = () => {
  const videoRef = useRef(); // Reference to the video element
  const canvasRef = useRef(); // Reference to the canvas element

  // Function to load Face API models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = process.env.PUBLIC_URL + '/models';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);

        startVideo(); // Start webcam after models are loaded
      } catch (error) {
        console.error('Error loading models:', error);
      }
    };

    loadModels();
  }, []);

  // Function to start the webcam stream
  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: {} })
      .then((stream) => {
        videoRef.current.srcObject = stream; // Attach the webcam stream to the video element
      })
      .catch((err) => console.error('Error accessing webcam:', err));
  };

  // Function to detect faces and draw bounding boxes
  const detectFace = async () => {
    // Detect faces with TinyFaceDetector
    const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();

    // Clear the canvas before drawing
    const canvas = canvasRef.current;
    const displaySize = { width: videoRef.current.width, height: videoRef.current.height };

    faceapi.matchDimensions(canvas, displaySize); // Match canvas size with video element
    const resizedDetections = faceapi.resizeResults(detections, displaySize); // Resize detections to match video size

    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); // Clear previous drawings
    faceapi.draw.drawDetections(canvas, resizedDetections); // Draw bounding boxes
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections); // Draw face landmarks (optional)
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections); // Draw expressions (optional)
  };

  // Detect faces every 100 milliseconds
  useEffect(() => {
    videoRef.current?.addEventListener('play', () => {
      const interval = setInterval(detectFace, 100); // Run face detection periodically
      return () => clearInterval(interval); // Cleanup interval on unmount
    });
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <video ref={videoRef} autoPlay muted width="720" height="560" style={{ position: 'relative' }} />
      <canvas ref={canvasRef} style={{ position: 'absolute', left: 0, top: 0 }} />
    </div>
  );
};

export default FaceDetection;