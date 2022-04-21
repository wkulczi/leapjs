var LeapHelper = require('./leapHelper')
var Leap = require('leapjs');

var controllerOptions = { enableGestures: true };
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

      for (const gesture of dedupedGestures) {
        console.log(LeapHelper.parseGestureInfo(gesture, handInfo))
      }

  }
}
controller.setBackground(true);  //jak to zrobisz to będzie w tle też odbierać