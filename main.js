var LeapHelper = require('./leapHelper')
var Leap = require('leapjs');

///for debugging
const util = require('util')
const { Console } = require("console");
// get fs module for creating write streams
const fs = require("fs");

// make a new logger
const myLogger = new Console({
  stdout: fs.createWriteStream("normalStdout.txt"),
  stderr: fs.createWriteStream("errStdErr.txt"),
});
///for debugging end


var controllerOptions = { enableGestures: true, useAllPlugins: true }; //todo obczaj co za pluginy są
// https://github.com/leapmotion/leapjs-plugins

var frameBuffer = [];
var FRAME_BUFFER_SIZE = 10; //N frames with hands

var controller = Leap.loop(controllerOptions, function (frame) {
  if (frame.hands.length) {
    if (frameBuffer.length < FRAME_BUFFER_SIZE) {
      frameBuffer.push(frame)
    }
    else {
      frameBufferParser(frameBuffer)
      frameBuffer = [];
    }
  }
});

sawOnce = false;
function frameBufferParser(frames) {

  //determines whether gestures occured in FRAME_BUFFER_SIZE window of frames
  const hasAnyGestures = frames.map(value => value.gestures.length).some((gestureCounter) => gestureCounter > 0);

  if (hasAnyGestures) {
    const handInfo = LeapHelper.parseHandInfo(frames)

    /*PARSE GESTURES START*/

    LeapHelper.addGestureDirection(frames);
    const dedupedGestures = LeapHelper.dedupContinuousMoves(frames.map(value => value.gestures).flat());

    /*PARSE GESTURES END*/


    // if (!sawOnce) {
      // myLogger.log(frames.map(value => value.gestures));

      // console.log(util.inspect(frames), { showHidden: false, depth: null, colors: true });
      for (const gesture of dedupedGestures) {
        console.log(LeapHelper.parseGestureInfo(gesture, handInfo))
      }
      // console.log(util.inspect(dedupContinuousMoves(frames.map(value => value.gestures).flat()), { showHidden: false, depth: null, colors: true }))
      // console.log(util.inspect(handInfo, { showHidden: false, depth: null, colors: true }))
      // myLogger.log(handInfo.map(value => value.info));
      sawOnce = true;
    // }

  }
}
// controller.setBackground(true);  //jak to zrobisz to będzie w tle też odbierać