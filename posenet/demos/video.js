/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

console.log("video.js // executing"); 

import * as posenet from '@tensorflow-models/posenet';
import dat from 'dat.gui';
import Stats from 'stats.js';
import {drawKeypoints, drawSkeleton, drawBoundingBox} from './demo_util';
import fs from 'fs';

console.log("video.js // components loaded"); 

const videoWidth = 600;
const videoHeight = 500;
const stats = new Stats();

console.log("video.js // properties initialized"); 
console.log("video.js // fs = 'fs.realpath'"); 

function isAndroid() {
		console.log("video.js // isAndroid() executing."); 

  return /Android/i.test(navigator.userAgent);
}

function isiOS() {
		console.log("video.js // isiOS() executing."); 

  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() {
		console.log("video.js // isMobile() executing."); 

  return isAndroid() || isiOS();
}

console.log("video.js // isAndroid(), isiOS(), and isMobile() defined."); 

/**
 * Loads a the camera to be used in the demo
 *
 */
async function setupCamera() {
	console.log("video.js // setupCamera() executing."); 

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
        'Browser API navigator.mediaDevices.getUserMedia not available');
  }

  const video = document.getElementById('videoCam');
  video.width = videoWidth;
  video.height = videoHeight;

  const mobile = isMobile();
  const stream = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': {
      facingMode: 'user',
      width: mobile ? undefined : videoWidth,
      height: mobile ? undefined : videoHeight,
    },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

console.log("video.js // setupCamera() defined."); 

async function setupVideo() {
	console.log("video.js // setupVideo() executing."); 

  const video = document.getElementById('videoFile');
  video.width = videoWidth;
  video.height = videoHeight;
  // make video visible
  // video.style.display = 'block';

  const mobile = isMobile();
  //const stream = fs.createReadStream('./assets/danceAndHumanHistory_excerpt_480p.mp4');
  //video.srcObject = stream;
  
  return video;
  /*
  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
  //*/
}

console.log("video.js // setupVideo() defined."); 

async function loadVideoCam() {
	console.log("video.js // loadVideoCam() executing."); 

  const video = await setupCamera();
  setupVideo();
  video.play();

  return video;
}

console.log("video.js // loadVideoCam() defined."); 

async function loadVideoFile() {
	console.log("video.js // loadVideoFile() executing."); 

  const video = await setupVideo();
  setupVideo();
  video.play();

  return video;
}

console.log("video.js // loadVideoFile() defined."); 

const guiState = {
  algorithm: 'multi-pose',
  input: {
    mobileNetArchitecture: isMobile() ? '0.50' : '0.75',
    outputStride: 16,
    imageScaleFactor: 0.5,
  },
  singlePoseDetection: {
    minPoseConfidence: 0.1,
    minPartConfidence: 0.5,
  },
  multiPoseDetection: {
    maxPoseDetections: 5,
    minPoseConfidence: 0.15,
    minPartConfidence: 0.1,
    nmsRadius: 30.0,
  },
  output: {
    showVideo: true,
    showSkeleton: true,
    showPoints: true,
    showBoundingBox: false,
  },
  net: null,
};

console.log("video.js // const guiState defined."); 

/**
 * Sets up dat.gui controller on the top-right of the window
 */
function setupGui(cameras, net) {
		console.log("video.js // setupGui() executing."); 

  guiState.net = net;

  if (cameras.length > 0) {
    guiState.camera = cameras[0].deviceId;
  }

  const gui = new dat.GUI({width: 300});

  // The single-pose algorithm is faster and simpler but requires only one
  // person to be in the frame or results will be innaccurate. Multi-pose works
  // for more than 1 person
  const algorithmController =
      gui.add(guiState, 'algorithm', ['single-pose', 'multi-pose']);

  // The input parameters have the most effect on accuracy and speed of the
  // network
  let input = gui.addFolder('Input');
  // Architecture: there are a few PoseNet models varying in size and
  // accuracy. 1.01 is the largest, but will be the slowest. 0.50 is the
  // fastest, but least accurate.
  const architectureController = input.add(
      guiState.input, 'mobileNetArchitecture',
      ['1.01', '1.00', '0.75', '0.50']);
  // Output stride:  Internally, this parameter affects the height and width of
  // the layers in the neural network. The lower the value of the output stride
  // the higher the accuracy but slower the speed, the higher the value the
  // faster the speed but lower the accuracy.
  input.add(guiState.input, 'outputStride', [8, 16, 32]);
  // Image scale factor: What to scale the image by before feeding it through
  // the network.
  input.add(guiState.input, 'imageScaleFactor').min(0.2).max(1.0);
  input.open();

  // Pose confidence: the overall confidence in the estimation of a person's
  // pose (i.e. a person detected in a frame)
  // Min part confidence: the confidence that a particular estimated keypoint
  // position is accurate (i.e. the elbow's position)
  let single = gui.addFolder('Single Pose Detection');
  single.add(guiState.singlePoseDetection, 'minPoseConfidence', 0.0, 1.0);
  single.add(guiState.singlePoseDetection, 'minPartConfidence', 0.0, 1.0);

  let multi = gui.addFolder('Multi Pose Detection');
  multi.add(guiState.multiPoseDetection, 'maxPoseDetections')
      .min(1)
      .max(20)
      .step(1);
  multi.add(guiState.multiPoseDetection, 'minPoseConfidence', 0.0, 1.0);
  multi.add(guiState.multiPoseDetection, 'minPartConfidence', 0.0, 1.0);
  // nms Radius: controls the minimum distance between poses that are returned
  // defaults to 20, which is probably fine for most use cases
  multi.add(guiState.multiPoseDetection, 'nmsRadius').min(0.0).max(40.0);
  multi.open();

  let output = gui.addFolder('Output');
  output.add(guiState.output, 'showVideo');
  output.add(guiState.output, 'showSkeleton');
  output.add(guiState.output, 'showPoints');
  output.add(guiState.output, 'showBoundingBox');
  output.open();


  architectureController.onChange(function(architecture) {
    guiState.changeToArchitecture = architecture;
  });

  algorithmController.onChange(function(value) {
    switch (guiState.algorithm) {
      case 'single-pose':
        multi.close();
        single.open();
        break;
      case 'multi-pose':
        single.close();
        multi.open();
        break;
    }
  });
}

console.log("video.js // setupGui() defined."); 

/**
 * Sets up a frames per second panel on the top-left of the window
 */
function setupFPS() {
	console.log("video.js // setupFPS() executing."); 

  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(stats.dom);
}

console.log("video.js // setupFPS() defined."); 

/**
 * Feeds an image to posenet to estimate poses - this is where the magic
 * happens. This function loops with a requestAnimationFrame method.
 */
function detectPoseInRealTime(video, net) {
		console.log("video.js // detectPoseInRealTime() executing."); 
		console.log("video.js // detectPoseInRealTime() video.id = " + video.id); 

  let canvas;
  let flipHorizontal = false;
  let ctx;
  switch(video.id) {
	  case 'videoCam':
		canvas = document.getElementById('outputCam');
		ctx = canvas.getContext('2d');
		// since images are being fed from a webcam
		flipHorizontal = true;
		break;
	  case 'videoFile':
		canvas = document.getElementById('outputFile');
		ctx = canvas.getContext('2d');
		break;
	  default:
		console.log("video.js // detectPoseInRealTime() unexpected video.id = " + video.id);
		break;		
  }
  console.log("video.js // detectPoseInRealTime() canvas.id = " + canvas.id); 
  console.log("video.js // detectPoseInRealTime() ctx = " + ctx.toString()); 
  console.log("video.js // detectPoseInRealTime() flipHorizontal = " + flipHorizontal); 

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  async function poseDetectionFrame() {
	console.log("video.js // poseDetectionFrame() executing. flipHorizontal = " + flipHorizontal); 

    if (guiState.changeToArchitecture) {
      // Important to purge variables and free up GPU memory
      guiState.net.dispose();

      // Load the PoseNet model weights for either the 0.50, 0.75, 1.00, or 1.01
      // version
      guiState.net = await posenet.load(+guiState.changeToArchitecture);

      guiState.changeToArchitecture = null;
    }

    // Begin monitoring code for frames per second
    stats.begin();

    // Scale an image down to a certain factor. Too large of an image will slow
    // down the GPU
    const imageScaleFactor = guiState.input.imageScaleFactor;
    const outputStride = +guiState.input.outputStride;

    let poses = [];
    let minPoseConfidence;
    let minPartConfidence;
    switch (guiState.algorithm) {
      case 'single-pose':
        const pose = await guiState.net.estimateSinglePose(
            video, imageScaleFactor, flipHorizontal, outputStride);
        poses.push(pose);

        minPoseConfidence = +guiState.singlePoseDetection.minPoseConfidence;
        minPartConfidence = +guiState.singlePoseDetection.minPartConfidence;
        break;
      case 'multi-pose':
        poses = await guiState.net.estimateMultiplePoses(
            video, imageScaleFactor, flipHorizontal, outputStride,
            guiState.multiPoseDetection.maxPoseDetections,
            guiState.multiPoseDetection.minPartConfidence,
            guiState.multiPoseDetection.nmsRadius);

        minPoseConfidence = +guiState.multiPoseDetection.minPoseConfidence;
        minPartConfidence = +guiState.multiPoseDetection.minPartConfidence;
        break;
    }

    ctx.clearRect(0, 0, videoWidth, videoHeight);

    if (guiState.output.showVideo) {
      ctx.save();
	  if (flipHorizontal) {
		  ctx.scale(-1, 1);
		  ctx.translate(-videoWidth, 0);
	  }
	  ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      ctx.restore();
    }

    // For each pose (i.e. person) detected in an image, loop through the poses
    // and draw the resulting skeleton and keypoints if over certain confidence
    // scores
    poses.forEach(({score, keypoints}) => {
      if (score >= minPoseConfidence) {
        if (guiState.output.showPoints) {
          drawKeypoints(keypoints, minPartConfidence, ctx);
        }
        if (guiState.output.showSkeleton) {
          drawSkeleton(keypoints, minPartConfidence, ctx);
        }
        if (guiState.output.showBoundingBox) {
          drawBoundingBox(keypoints, ctx);
        }
      }
    });

    // End monitoring code for frames per second
    stats.end();

    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
}

console.log("video.js // detectPoseInRealTime() defined."); 

/**
 * Kicks off the demo by loading the posenet model, finding and loading
 * available camera devices, and setting off the detectPoseInRealTime function.
 */
export async function bindPage() {
		console.log("video.js // bindPage() executing."); 

  // Load the PoseNet model weights with architecture 0.75
  const net = await posenet.load(0.75);

  document.getElementById('loading').style.display = 'none';
  document.getElementById('main').style.display = 'block';

  let videoCam;
  let videoFile;

  try {
    videoCam = await loadVideoCam();
  } catch (e) {
    let info = document.getElementById('info');
    info.textContent = 'this browser does not support video capture,' +
        'or this device does not have a camera';
    info.style.display = 'block';
    throw e;
  }
  /*
  loadVideoFile();
  //*/
  ///* 
  try {
    videoFile = await loadVideoFile();
  }catch (e) {
	let info = document.getElementById('info');
    info.textContent = 'failed to load the video';
    info.style.display = 'block';
    throw e;
  }
	//*/

  setupGui([], net);
  setupFPS();
  detectPoseInRealTime(videoCam, net);
  detectPoseInRealTime(videoFile, net);
}

console.log("video.js // bindPage() defined."); 

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

console.log("video.js // navigator.getUserMedia() defined."); 

// kick off the demo
bindPage();

console.log("video.js // end of application."); 
