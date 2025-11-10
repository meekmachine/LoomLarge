// VISOS/cognition/faceTrackingMachine.js

import { createMachine, assign } from 'xstate';
import * as faceapi from 'face-api.js';
import { initFacsService } from './facs/facsService'; // we interpret that inside the machine or pass in context

/**
 * faceTrackingMachine:
 * states => idle => loadModels => acquireCamera => streaming => cleanup => final
 *   - On start => load => acquire => streaming => detection loop => set head/eyes
 *   - On STOP => cleanup => final
 * 
 * We'll do a small approach: pass 'videoElementId', 'intervalMs', 'eyeFollowIntensity', 'headFollowIntensity'
 * in the machine's context. We'll also store reference to "facsService" once we initialize it.
 */
export const faceTrackingMachine = createMachine({
  id: 'faceTracking',
  initial: 'idle',
  predictableActionArguments: true,
  context: {
    videoElementId: 'userWebcam',
    intervalMs: 100,
    eyeFollowIntensity: 0.7,
    headFollowIntensity: 0.4,
    modelUrl: '/models',

    videoEl: null,
    detectionIntervalId: null,
    facsService: null
  },
  states: {
    idle: {
      on: {
        START: 'loadModels'
      }
    },
    loadModels: {
      invoke: {
        src: 'loadFaceModels',
        onDone: { target: 'acquireCamera' },
        onError: { target: 'error' }
      }
    },
    acquireCamera: {
      invoke: {
        src: 'acquireUserCamera',
        onDone: { target: 'streaming' },
        onError: { target: 'error' }
      }
    },
    streaming: {
      entry: ['initFacsService', 'startDetectionLoop'],
      on: {
        STOP: 'cleanup'
      }
    },
    cleanup: {
      entry: 'cleanupEverything',
      type: 'final'
    },
    error: {
      entry: (ctx, evt) => {
        console.error('[faceTrackingMachine] error =>', evt.data);
      },
      on: {
        STOP: 'cleanup'
      }
    }
  }
},
{
  services: {
    // load face-api models
    async loadFaceModels(ctx, evt) {
      console.log('[faceTrackingMachine] loading models from', ctx.modelUrl);
      await faceapi.nets.tinyFaceDetector.loadFromUri(ctx.modelUrl);
      await faceapi.nets.faceLandmark68Net.loadFromUri(ctx.modelUrl);
      // if needed => faceapi.nets.faceExpressionNet.loadFromUri(ctx.modelUrl);
      return true;
    },
    // getUserMedia => attach to <video>
    async acquireUserCamera(ctx, evt) {
      const videoEl = document.getElementById(ctx.videoElementId);
      if (!videoEl) throw new Error(`No <video id="${ctx.videoElementId}"> found`);
      ctx.videoEl = videoEl;

      const stream = await navigator.mediaDevices.getUserMedia({ video:true });
      videoEl.srcObject = stream;
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.muted = true;
      console.log('[faceTrackingMachine] camera acquired => attached to #'+ctx.videoElementId);
      return true;
    }
  },
  actions: {
    /**
     * initFacsService => store in context
     */
    initFacsService: assign((ctx, evt) => {
      console.log('[faceTrackingMachine] initFacsService => interpreting facsMachine');
      const facsSrv = initFacsService(/* pass engine if needed */);
      return { ...ctx, facsService: facsSrv };
    }),

    /**
     * startDetectionLoop => sets up setInterval => run detection => set head/eyes
     */
    startDetectionLoop: assign((ctx) => {
      console.log('[faceTrackingMachine] startDetectionLoop => interval=', ctx.intervalMs);
      const id = setInterval(async () => {
        if (!ctx.videoEl) return;

        const detections = await faceapi
          .detectAllFaces(ctx.videoEl, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        if (!detections || detections.length===0) {
          // no face => set zero
          setHeadAndEyesUsingTrig(ctx.facsService, 0,0, ctx.eyeFollowIntensity, ctx.headFollowIntensity, true);
          return;
        }

        // face found => do trig
        const { videoWidth, videoHeight } = ctx.videoEl;
        const detection = detections[0];
        const lEye = detection.landmarks.getLeftEye();
        const rEye = detection.landmarks.getRightEye();
        const { x:eyeX, y:eyeY } = computeEyeCenter(lEye, rEye);

        const offsetX= eyeX - (videoWidth/2);
        const offsetY= eyeY - (videoHeight/2);

        setHeadAndEyesUsingTrig(
          ctx.facsService,
          offsetX, offsetY,
          ctx.eyeFollowIntensity,
          ctx.headFollowIntensity,
          false
        );
      }, ctx.intervalMs);

      return { ...ctx, detectionIntervalId: id };
    }),

    /**
     * cleanupEverything => stop interval, stop camera
     */
    cleanupEverything: (ctx) => {
      console.log('[faceTrackingMachine] cleanupEverything => stopping detection + camera');
      if (ctx.detectionIntervalId) {
        clearInterval(ctx.detectionIntervalId);
      }
      if (ctx.videoEl && ctx.videoEl.srcObject) {
        const stream = ctx.videoEl.srcObject;
        stream.getTracks().forEach((track) => track.stop());
        ctx.videoEl.srcObject=null;
      }
      // also set neutral
      if (ctx.facsService) {
        setHeadAndEyesUsingTrig(ctx.facsService,0,0, ctx.eyeFollowIntensity, ctx.headFollowIntensity,true);
      }
    }
  }
});

/** computeEyeCenter => average the left & right eye */
function computeEyeCenter(leftEye, rightEye) {
  function avg(pts) {
    let xSum=0, ySum=0;
    pts.forEach(p => {xSum+=p.x; ySum+=p.y;});
    return { x:xSum/pts.length, y:ySum/pts.length };
  }
  const lMid= avg(leftEye);
  const rMid= avg(rightEye);
  return {
    x:(lMid.x + rMid.x)/2,
    y:(lMid.y + rMid.y)/2
  };
}

/**
 * setHeadAndEyesUsingTrig => do the angle-based approach => sets AUs
 */
function setHeadAndEyesUsingTrig(facsService, offsetX, offsetY, eyeFollow, headFollow, lost=false) {
  if (!facsService) return;
  if (lost) {
    // zero out => HEAD(51..54), EYES(61..64)
    for (const au of ['51','52','53','54','61','62','63','64']) {
      facsService.send({ type:'SET_AU', auId:au, intensity:0 });
    }
    return;
  }

  const angleDeg= Math.atan2(offsetY, offsetX)*(180/Math.PI);
  let yaw= angleDeg;
  // clamp ±90
  if (yaw>90) yaw=90;
  if (yaw<-90) yaw=-90;

  const dist= Math.min(Math.sqrt(offsetX**2 + offsetY**2), 100);

  // HEAD yaw
  const yawRatio= Math.abs(yaw)/90;
  const headYawVal= Math.round(yawRatio* dist* headFollow);

  let hl=0, hr=0;
  if (yaw>0) hr= headYawVal; else hl= headYawVal;

  // HEAD pitch => offsetY>0 => down => 54
  const maxY=200;
  const pitchRatio= Math.min(Math.abs(offsetY)/maxY,1);
  const pitchVal= Math.round(pitchRatio* dist* headFollow);

  let hu=0, hd=0;
  if (offsetY>0) hd=pitchVal; else hu=pitchVal;

  facsService.send({ type:'SET_AU', auId:'51', intensity:hl });
  facsService.send({ type:'SET_AU', auId:'52', intensity:hr });
  facsService.send({ type:'SET_AU', auId:'53', intensity:hu });
  facsService.send({ type:'SET_AU', auId:'54', intensity:hd });

  // EYES => same approach
  const eyeYawVal= Math.round(yawRatio* dist* eyeFollow);
  let el=0, er=0;
  if (yaw>0) er= eyeYawVal; else el= eyeYawVal;

  const eyePitchVal= Math.round(pitchRatio* dist* eyeFollow);
  let eu=0, ed=0;
  if (offsetY>0) ed= eyePitchVal; else eu= eyePitchVal;

  facsService.send({ type:'SET_AU', auId:'61', intensity:el });
  facsService.send({ type:'SET_AU', auId:'62', intensity:er });
  facsService.send({ type:'SET_AU', auId:'63', intensity:eu });
  facsService.send({ type:'SET_AU', auId:'64', intensity:ed });
}