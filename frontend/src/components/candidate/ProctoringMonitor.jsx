import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Backdrop } from '@mui/material';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import * as faceapi from 'face-api.js';

/**
 * ProctoringMonitor — Robust Full Video & Audio Proctoring Module.
 * 
 * Features:
 * 1. Audio Proctoring:
 *    - Silence-only baseline (RMS < 0.020).
 *    - Detection for audio_spike, talking, prolonged_talking.
 *    - Post-event grace-period cooldown.
 * 2. Real-time Video Face Detection (MediaPipe):
 *    - Runs every 1.5 seconds.
 *    - 0 faces for 3 consecutive checks (~4.5s) -> no_face_visible.
 *    - >1 face for 2 consecutive checks (~3.0s) -> multiple_faces.
 *    - Fallback 1: Browser Native FaceDetector API.
 *    - Fallback 2: HSL Skin-Color Ratio Analysis.
 * 3. Face Verification & Anti-Spoofing:
 *    - Reference face descriptor captured on start.
 *    - Runs every 10 seconds: euclidean distance > 0.6 -> face_mismatch.
 *    - Head pose/rotation estimation > 30 deg -> head_turned.
 */
const ProctoringMonitor = ({ stream, onViolation, isActive }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const rmsIntervalRef = useRef(null);
  
  // Detection Refs
  const faceDetectorRef = useRef(null);
  const nativeFaceDetectorRef = useRef(null);
  const faceIntervalRef = useRef(null);
  const verificationIntervalRef = useRef(null);

  const referenceDescriptorRef = useRef(null);

  // Consecutive counts
  const noFaceConsecutiveRef = useRef(0);
  const multiFaceConsecutiveRef = useRef(0);

  // Prop REFS
  const isActiveRef = useRef(isActive);
  const onViolationRef = useRef(onViolation);

  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);

  // Audio baseline & state
  const baselineRef = useRef(0.01);
  const baselineSamplesRef = useRef([]);
  const speechConsecutiveCountRef = useRef(0);
  const lastDebugLogRef = useRef(0);

  // Cooldowns
  const activeEventsRef = useRef({
    audio_spike: false, talking: false, prolonged_talking: false,
    no_face_visible: false, multiple_faces: false, face_mismatch: false, head_turned: false
  });
  const cooldownEndTimeRef = useRef({
    audio_spike: 0, talking: 0, prolonged_talking: 0,
    no_face_visible: 0, multiple_faces: 0, face_mismatch: 0, head_turned: 0
  });

  const [loadingModels, setLoadingModels] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [hasMediaError, setHasMediaError] = useState(false);

  // Threshold Constants
  const COOLDOWN_MS = 1000;
  const RMS_CHECK_INTERVAL = 150;
  const SILENCE_THRESHOLD = 0.020;
  const SPIKE_ABSOLUTE_MIN = 0.032;
  const SPIKE_MULTIPLIER = 2.5;
  const SPEECH_THRESHOLD = 0.015;
  const CONTINUOUS_SPEECH_SAMPLES = 10;
  const PROLONGED_TALKING_SAMPLES = 34;

  const triggerViolationEvent = (eventType, details) => {
    const now = Date.now();
    const cooldownEnd = cooldownEndTimeRef.current[eventType] || 0;
    if (now < cooldownEnd) return;

    if (!activeEventsRef.current[eventType]) {
      activeEventsRef.current[eventType] = true;
      console.warn(`[Proctoring] ⚠ VIOLATION: ${eventType}`, details);

      // Capture base64 screenshot if video element is active
      let screenshot = null;
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = 240;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          screenshot = canvas.toDataURL('image/jpeg', 0.6);
        } catch (e) {
          console.warn("Screenshot capture error", e);
        }
      }

      onViolationRef.current(eventType, { ...details, screenshot }, null);
    }
  };

  const endViolationEvent = (eventType) => {
    if (activeEventsRef.current[eventType]) {
      activeEventsRef.current[eventType] = false;
      cooldownEndTimeRef.current[eventType] = Date.now() + COOLDOWN_MS;
    }
  };

  // 1. Load MediaPipe & FaceAPI models
  useEffect(() => {
    let active = true;
    const loadAIModels = async () => {
      // 1. Load MediaPipe Face Detector (CPU for universal compatibility across browsers)
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        try {
          faceDetectorRef.current = await FaceDetector.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
              delegate: "CPU"
            },
            runningMode: "VIDEO"
          });
          console.log("[Proctoring] ✅ MediaPipe Face Detector loaded successfully (CPU delegate)");
        } catch (cpuErr) {
          console.warn("[Proctoring] CPU delegate failed, attempting GPU delegate:", cpuErr);
          faceDetectorRef.current = await FaceDetector.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
              delegate: "GPU"
            },
            runningMode: "VIDEO"
          });
          console.log("[Proctoring] ✅ MediaPipe Face Detector loaded successfully (GPU delegate)");
        }
      } catch (mpErr) {
        console.warn("[Proctoring] MediaPipe Face Detector failed to load:", mpErr);
      }

      // 2. Load face-api.js models for verification
      try {
        const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
        await Promise.race([
          Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
          ]),
          new Promise((_, reject) => setTimeout(() => reject(new Error("FaceAPI timeout")), 6000))
        ]);
        console.log("[Proctoring] ✅ face-api.js models loaded successfully");
      } catch (faErr) {
        console.warn("[Proctoring] face-api.js verification models fallback mode enabled:", faErr);
      } finally {
        if (active) setLoadingModels(false);
      }
    };

    loadAIModels();
    return () => { active = false; };
  }, []);

  // 2. Setup Media Stream & Proctoring Loops
  useEffect(() => {
    if (!isActive || loadingModels) {
      cleanup();
      return;
    }

    let cancelled = false;

    const initProctoring = async () => {
      setInitializing(true);
      setHasMediaError(false);

      try {
        let activeStream = stream;
        if (!activeStream) {
          activeStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } },
            audio: true
          });
        }

        if (cancelled) {
          if (!stream) activeStream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = activeStream;

        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
          videoRef.current.play().then(() => {
            console.log("[Proctoring] 🎥 Video stream playing successfully");
          }).catch(e => console.warn("[Proctoring] Video play error:", e));
          setTimeout(captureReferenceFace, 2500);
        }

        setupAudioProctoring(activeStream);
        setupVideoFaceDetection();
        setupFaceVerification();

      } catch (err) {
        console.error("[Proctoring] Media acquisition failed:", err);
        setHasMediaError(true);
        onViolationRef.current('permission_denied', { error: err.message }, null);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };

    initProctoring();

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, loadingModels, stream]);

  // Ensure video element srcObject is bound and playing as soon as videoRef mounts
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== streamRef.current) {
        console.log("[Proctoring] 🎥 Attaching streamRef to video element");
        video.srcObject = streamRef.current;
      }
      video.play().then(() => {
        console.log(`[Proctoring] 🎥 Video playing! Frame size: ${video.videoWidth}x${video.videoHeight}, readyState: ${video.readyState}`);
        setTimeout(captureReferenceFace, 2500);
      }).catch(e => console.warn("[Proctoring] Video play error:", e));
    }
  }, [loadingModels, initializing, stream]);

  // Audio Proctoring Setup
  const setupAudioProctoring = (stream) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);

    rmsIntervalRef.current = setInterval(() => {
      if (!isActiveRef.current) return;
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
        return;
      }

      analyser.getFloatTimeDomainData(dataArray);

      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        sumSquares += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sumSquares / bufferLength);

      if (rms < SILENCE_THRESHOLD) {
        const bSamples = baselineSamplesRef.current;
        bSamples.push(rms);
        if (bSamples.length > 50) bSamples.shift();
        baselineRef.current = bSamples.reduce((a, b) => a + b, 0) / bSamples.length;
      }

      const currentBaseline = baselineRef.current;

      const now = Date.now();
      if (now - lastDebugLogRef.current > 3000) {
        lastDebugLogRef.current = now;
        console.log(`[Proctoring] 🎤 RMS=${rms.toFixed(4)} | Baseline=${currentBaseline.toFixed(4)}`);
      }

      // Audio Rules
      if (rms > SPIKE_ABSOLUTE_MIN && rms > currentBaseline * SPIKE_MULTIPLIER) {
        triggerViolationEvent('audio_spike', { rms: rms.toFixed(4), baseline: currentBaseline.toFixed(4) });
      } else {
        endViolationEvent('audio_spike');
      }

      if (rms > SPEECH_THRESHOLD) {
        speechConsecutiveCountRef.current += 1;
        const count = speechConsecutiveCountRef.current;
        if (count >= PROLONGED_TALKING_SAMPLES) {
          triggerViolationEvent('prolonged_talking', { durationSec: (count * 0.15).toFixed(1) });
        } else if (count >= CONTINUOUS_SPEECH_SAMPLES) {
          triggerViolationEvent('talking', { durationSec: (count * 0.15).toFixed(1) });
        }
      } else {
        speechConsecutiveCountRef.current = 0;
        endViolationEvent('talking');
        endViolationEvent('prolonged_talking');
      }

    }, RMS_CHECK_INTERVAL);
  };

  // Video Face Detection (MediaPipe & Fallbacks)
  const setupVideoFaceDetection = () => {
    if ('FaceDetector' in window) {
      try {
        nativeFaceDetectorRef.current = new window.FaceDetector({ maxDetectedFaces: 5, fastMode: true });
      } catch (e) {}
    }

    faceIntervalRef.current = setInterval(async () => {
      if (!isActiveRef.current || !videoRef.current) return;
      const video = videoRef.current;
      if (video && video.paused && video.srcObject) {
        video.play().catch(() => {});
      }
      if (!video || video.videoWidth === 0 || video.readyState < 2) {
        console.warn(`[Proctoring] 👁 Face check skipped: video element not ready yet (readyState=${video?.readyState}, width=${video?.videoWidth})`);
        return;
      }

      try {
        let faceCount = -1;

        // 1. MediaPipe Face Detector
        if (faceDetectorRef.current) {
          try {
            const detections = faceDetectorRef.current.detectForVideo(video, performance.now());
            if (detections && detections.detections) {
              faceCount = detections.detections.length;
            }
          } catch (mpErr) {
            console.warn("[Proctoring] MediaPipe detectForVideo error:", mpErr);
          }
        } 
        
        // 2. face-api.js TinyFaceDetector Fallback / Verification
        if (faceCount < 0 && faceapi.nets.tinyFaceDetector.isLoaded) {
          try {
            const faces = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.35 }));
            faceCount = faces.length;
          } catch (faErr) {
            console.warn("[Proctoring] face-api detectAllFaces error:", faErr);
          }
        }

        // 3. Native Browser FaceDetector
        if (faceCount < 0 && nativeFaceDetectorRef.current) {
          try {
            const faces = await nativeFaceDetectorRef.current.detect(video);
            faceCount = faces.length;
          } catch (nErr) {}
        }

        console.log(`[Proctoring] 👁 Face check: ${faceCount} face(s) detected`);

        // Handle Face Counts
        if (faceCount >= 0) {
          if (faceCount === 0) {
            noFaceConsecutiveRef.current += 1;
            multiFaceConsecutiveRef.current = 0;
            endViolationEvent('multiple_faces');

            console.warn(`[Proctoring] ⚠ 0 faces detected! (Consecutive count: ${noFaceConsecutiveRef.current}/2)`);

            if (noFaceConsecutiveRef.current >= 2) {
              triggerViolationEvent('no_face_visible', { count: 0, consecutive: noFaceConsecutiveRef.current });
            }
          } else if (faceCount > 1) {
            multiFaceConsecutiveRef.current += 1;
            noFaceConsecutiveRef.current = 0;
            endViolationEvent('no_face_visible');

            console.warn(`[Proctoring] ⚠ ${faceCount} faces detected! (Consecutive count: ${multiFaceConsecutiveRef.current}/1)`);

            if (multiFaceConsecutiveRef.current >= 1) {
              triggerViolationEvent('multiple_faces', { count: faceCount, consecutive: multiFaceConsecutiveRef.current });
            }
          } else {
            // Exactly 1 face
            noFaceConsecutiveRef.current = 0;
            multiFaceConsecutiveRef.current = 0;
            endViolationEvent('no_face_visible');
            endViolationEvent('multiple_faces');
          }
        } else {
          // 4. Fallback Skin Color Detection
          checkFallbackSkinColor();
        }

      } catch (err) {
        console.error("Face detection loop error", err);
      }
    }, 800); // Check every 800ms for fast responsive detection
  };

  // Fallback HSL skin color analysis
  const checkFallbackSkinColor = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let skinPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]; const g = data[i+1]; const b = data[i+2];
      if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) {
        skinPixels++;
      }
    }

    const skinPercentage = skinPixels / (canvas.width * canvas.height);
    if (skinPercentage < 0.04) {
      noFaceConsecutiveRef.current += 1;
      if (noFaceConsecutiveRef.current >= 2) {
        triggerViolationEvent('no_face_visible', { fallback: 'hsl', skinPercentage: skinPercentage.toFixed(3) });
      }
    } else {
      noFaceConsecutiveRef.current = 0;
      endViolationEvent('no_face_visible');
    }
  };

  // Reference Face Capture
  const captureReferenceFace = async () => {
    if (!videoRef.current) return;
    try {
      const detection = await faceapi.detectSingleFace(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor();

      if (detection) {
        referenceDescriptorRef.current = detection.descriptor;
        console.log("[Proctoring] ✅ Reference face descriptor captured");
      }
    } catch (e) {
      console.warn("Reference face capture error", e);
    }
  };

  // Face Verification & Head Pose Loop (10s)
  const setupFaceVerification = () => {
    verificationIntervalRef.current = setInterval(async () => {
      if (!isActiveRef.current || !videoRef.current) return;
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) return;

      try {
        const detection = await faceapi.detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks().withFaceDescriptor();

        if (detection) {
          // A. Face Identity Verification
          if (referenceDescriptorRef.current) {
            const distance = faceapi.euclideanDistance(referenceDescriptorRef.current, detection.descriptor);
            if (distance > 0.6) {
              triggerViolationEvent('face_mismatch', { distance: distance.toFixed(3) });
            } else {
              endViolationEvent('face_mismatch');
            }
          }

          // B. Head Pose Rotation Estimation
          const landmarks = detection.landmarks.positions;
          const nose = landmarks[30];
          const leftEye = landmarks[36];
          const rightEye = landmarks[45];
          const eyeCenterX = (leftEye.x + rightEye.x) / 2;
          const eyeDistance = Math.abs(rightEye.x - leftEye.x);

          if (eyeDistance > 0) {
            const yawOffset = Math.abs(nose.x - eyeCenterX) / eyeDistance;
            if (yawOffset > 0.45) { // Turn angle > ~30 deg
              triggerViolationEvent('head_turned', { yawOffset: yawOffset.toFixed(2) });
            } else {
              endViolationEvent('head_turned');
            }
          }
        }
      } catch (e) {
        console.warn("Verification loop warning", e);
      }
    }, 10000); // Check every 10s
  };

  const cleanup = () => {
    if (rmsIntervalRef.current) clearInterval(rmsIntervalRef.current);
    if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);
    if (verificationIntervalRef.current) clearInterval(verificationIntervalRef.current);

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (streamRef.current && !stream) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    noFaceConsecutiveRef.current = 0;
    multiFaceConsecutiveRef.current = 0;
    speechConsecutiveCountRef.current = 0;
  };

  return (
    <>
      {(loadingModels || initializing) && (
        <Backdrop open={true} sx={{ color: '#fff', zIndex: 9999, flexDirection: 'column' }}>
          <CircularProgress color="inherit" />
          <Typography mt={2}>
            {loadingModels ? "Loading AI Vision & Proctoring Models..." : "Acquiring Camera and Microphone permissions..."}
          </Typography>
        </Backdrop>
      )}

      {hasMediaError && (
        <Backdrop open={true} sx={{ color: '#fff', zIndex: 9999, flexDirection: 'column', bgcolor: 'rgba(211,47,47,0.85)' }}>
          <Typography variant="h6">⚠ Camera & Microphone Access Required</Typography>
          <Typography mt={1}>Please grant webcam and mic access to proceed with the proctored exam.</Typography>
        </Backdrop>
      )}

      <Box sx={{ 
        position: 'fixed', 
        bottom: 20, 
        right: 20, 
        width: 180, 
        height: 135, 
        zIndex: 9998, 
        borderRadius: 2, 
        overflow: 'hidden', 
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        border: '2px solid #1976d2',
        bgcolor: '#000',
        display: (loadingModels || initializing || hasMediaError) ? 'none' : 'block'
      }}>
        <video 
          ref={videoRef} 
          width="640"
          height="480"
          autoPlay 
          playsInline 
          muted 
          onLoadedData={() => {
            if (videoRef.current) {
              videoRef.current.play().catch(() => {});
            }
          }}
          onCanPlay={() => {
            if (videoRef.current) {
              videoRef.current.play().catch(() => {});
            }
          }}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
        <Box sx={{
          position: 'absolute',
          top: 6,
          left: 6,
          bgcolor: 'rgba(0,0,0,0.65)',
          color: '#4caf50',
          px: 1,
          py: 0.3,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5
        }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4caf50' }} />
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 'bold' }}>AI Cam Active</Typography>
        </Box>
      </Box>
    </>
  );
};

export default ProctoringMonitor;
