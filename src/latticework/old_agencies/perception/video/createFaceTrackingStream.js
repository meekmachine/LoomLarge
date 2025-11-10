// VISOS/perception/video/createFaceTrackingStream.js
import { BehaviorSubject } from 'rxjs';
import * as faceapi from 'face-api.js';

export function createFaceTrackingStream(
  videoRef,
  {
    intervalMs = 100,
    modelUrl = '/models'
  } = {}
) {
  const faceTracking$ = new BehaviorSubject({ status: 'init', offsetX: 0, offsetY: 0 });

  let isRunning = false;
  let intervalId = null;
  let localStream = null;

  async function checkSecureContext() {
    // Many browsers require HTTPS or localhost for getUserMedia
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isSecure = window.location.protocol === 'https:';
    if (!isLocalhost && !isSecure) {
      console.warn('[faceTrackingStream] Warning: Not in a secure context (https or localhost). Many browsers will block camera usage!');
    }
  }

  async function loadModels() {
    console.log(`[faceTrackingStream] Loading face-api models from: ${modelUrl}`);
    await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
    await faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl);
    console.log('[faceTrackingStream] face-api models loaded');
  }

  /**
   * start():
   *   1) verify environment
   *   2) check videoRef
   *   3) load faceapi models
   *   4) getUserMedia => attach to .srcObject
   *   5) onloadedmetadata => .play()
   *   6) start detection loop => offset
   */
  async function start() {
    if (isRunning) return;
    isRunning = true;

    await checkSecureContext();

    if (!videoRef || !videoRef.current) {
      console.error('[faceTrackingStream] videoRef is null => cannot attach camera');
      faceTracking$.next({ status: 'error', offsetX: 0, offsetY: 0 });
      return;
    }
    const videoEl = videoRef.current;

    try {
      // 1) Load faceapi models
      await loadModels();

      // 2) request user media => user sees prompt
      console.log('[faceTrackingStream] calling getUserMedia now...');
      localStream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log('[faceTrackingStream] getUserMedia => user accepted => attaching stream');

      // 3) attach stream
      videoEl.srcObject = localStream;

      // help auto-play
      videoEl.autoplay = true;
      videoEl.playsInline = true; // iOS Safari
      videoEl.muted = true;       // many browsers block auto-play unless muted

      // 4) wait for metadata => .play()
      console.log('[faceTrackingStream] waiting for onloadedmetadata event');
      await new Promise((resolve) => {
        videoEl.onloadedmetadata = () => {
          console.log('[faceTrackingStream] onloadedmetadata => calling videoEl.play()');
          const playPromise = videoEl.play();
          if (playPromise) {
            playPromise
              .then(() => {
                console.log('[faceTrackingStream] video is playing => camera feed visible');
                resolve();
              })
              .catch((err) => {
                console.error('[faceTrackingStream] videoElement.play() error =>', err);
                resolve(); 
              });
          } else {
            // older browsers
            resolve();
          }
        };
      });

    } catch (err) {
      console.error('[faceTrackingStream] cannot getUserMedia =>', err);
      faceTracking$.next({ status: 'error', offsetX: 0, offsetY: 0 });
      return;
    }

    // 5) detection loop
    console.log(`[faceTrackingStream] detection => starting, intervalMs=${intervalMs}`);
    intervalId = setInterval(async () => {
      if (!videoEl) return;
      const detections = await faceapi
        .detectAllFaces(videoEl, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      if (!detections || detections.length === 0) {
        faceTracking$.next({ status: 'noface', offsetX: 0, offsetY: 0 });
        return;
      }

      const detection = detections[0];
      const { videoWidth, videoHeight } = videoEl;
      const { landmarks } = detection;

      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      const { x: eyeX, y: eyeY } = computeEyeCenter(leftEye, rightEye);

      const offsetX = eyeX - (videoWidth / 2);
      const offsetY = eyeY - (videoHeight / 2);

      faceTracking$.next({ status: 'found', offsetX, offsetY });
    }, intervalMs);

    console.log('[faceTrackingStream] detection loop started => user should see camera feed now');
  }

  function stop() {
    if (!isRunning) return;
    isRunning = false;

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }

    if (videoRef && videoRef.current) {
      videoRef.current.srcObject = null;
    }

    faceTracking$.next({ status: 'stopped', offsetX: 0, offsetY: 0 });
    console.log('[faceTrackingStream] detection => stopped, camera feed removed');
  }

  return {
    faceTracking$,
    start,
    stop
  };
}

function computeEyeCenter(leftEye, rightEye) {
  function avg(pts) {
    let xSum = 0, ySum = 0;
    pts.forEach((p) => {
      xSum += p.x; 
      ySum += p.y;
    });
    return { x: xSum / pts.length, y: ySum / pts.length };
  }
  const lMid = avg(leftEye);
  const rMid = avg(rightEye);
  return {
    x: (lMid.x + rMid.x) / 2,
    y: (lMid.y + rMid.y) / 2
  };
}