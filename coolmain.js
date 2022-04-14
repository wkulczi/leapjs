var Leap = require('leapjs');
var _ = require('lodash');

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

function dedupContinuousMoves(frameGestureList) {
  let newArray = frameGestureList.filter(
    (value, iter, arr) => arr.findIndex(
      t =>
        (t.state === value.state) && (_.isEqual(t.handIds, value.handIds)) && (_.isEqual(t.pointableIds, value.pointableIds))) === iter);

  let newArrayWithoutTypeDupes = newArray.filter(
    (val, iter, arr) => arr.findIndex(
      t => (t.type === val.type)) === iter
  );
  return newArrayWithoutTypeDupes;
}

function identifyHand(ids, handInfo, isFinger = false) {
  if (isFinger) {
    return handInfo
      .map(handInfo => handInfo.fingerInfo)
      .flat()
      .find(finger => finger.ids
        .some(fingerElement => ids
          .includes(fingerElement)))
      ?.type ?? -1;
  } else {
    return handInfo
      .find(element => element.handIds
        .some(handId => ids
          .includes(handId)))
      ?.hand ?? -1
  }
}

function parseGestureInfo(gesture, handInfo) {
  return {
    hand: identifyHand(gesture.handIds, handInfo, false),
    finger: identifyHand(gesture.pointableIds, handInfo, true),
    gesture: gesture.type,
    direction: getGesture(gesture)
  }
}

function getGesture(gesture) {
  switch (gesture.type) {
    case "circle":
      // var direction = frame.pointable(pointableID).direction;
      var direction = gesture.directions; //it always gives the directions (XYZ) of one pointable, bcs every gesture catches only one pointable
      var dotProduct = Leap.vec3.dot(direction, gesture.normal);
      return dotProduct > 0 ? 'LM_CIRCLE_CLOCKWISE' : 'LM_CIRCLE_COUNTERCLOCKWISE'
    case "keyTap":
      return 'LM_KEY_TAP'
    case "screenTap":
      return 'LM_SCREEN_TAP'
    case "swipe":
      var isHorizontal = Math.abs(gesture.direction[0]) > Math.abs(gesture.direction[1]);
      if (isHorizontal) {
        return gesture.direction[0] > 0 ? 'LM_SWIPE_RIGHT' : 'LM_SWIPE_LEFT';
      } else { //vertical
        return gesture.direction[1] > 0 ? 'LM_SWIPE_UP' : 'LM_SWIPE_DOWN';
      }
  }
}

function addGestureDirection(frames) {
  for (const frame of frames) {
    for (const gesture of frame.gestures) {
      let directions = []
      for (pointableId of gesture.pointableIds) {
        directions = [...frame.pointable(pointableId).direction]
      }
      gesture.directions = directions;
    }
  }
}

sawOnce = false;
function frameBufferParser(frames) {

  //determines whether gestures occured in FRAME_BUFFER_SIZE window of frames
  const hasAnyGestures = frames.map(value => value.gestures.length).some((gestureCounter) => gestureCounter > 0);

  if (hasAnyGestures) {
    const handInfo = parseHandInfo(frames)

    /*PARSE GESTURES START*/

    addGestureDirection(frames);
    const dedupedGestures = dedupContinuousMoves(frames.map(value => value.gestures).flat());

    /*PARSE GESTURES END*/


    // if (!sawOnce) {
      // myLogger.log(frames.map(value => value.gestures));

      // console.log(util.inspect(frames), { showHidden: false, depth: null, colors: true });
      for (const gesture of dedupedGestures) {
        console.log(parseGestureInfo(gesture, handInfo))
      }
      // console.log(util.inspect(dedupContinuousMoves(frames.map(value => value.gestures).flat()), { showHidden: false, depth: null, colors: true }))
      // console.log(util.inspect(handInfo, { showHidden: false, depth: null, colors: true }))
      // myLogger.log(handInfo.map(value => value.info));
      sawOnce = true;
    // }

  }
}
// controller.setBackground(true);  //jak to zrobisz to będzie w tle też odbierać


/*
input => list of leapjs.Frames

output => list of {
  hand: 'left'/'right', 
  handIds: [numbers],     //in case if leap loses hand between frames and assigns new id
  fingerInfo: [{
    type: number(0-4),
    ids: [numbers]        //in case if leap loses fingers between frames and assigns new id
  }]
  }
*/
function parseHandInfo(frames) {
  //get ids of hands in frames
  const uniqueHands = getUniqueListBy(frames.map(value => value.hands).flat(), 'id');

  //create fingerInfo with structure {type: number(0-4), id: number}
  for (var i = 0; i < uniqueHands.length; i++) {
    let fingerInfo = [];
    uniqueHands[i].fingers.forEach(finger => {
      fingerInfo.push({ type: finger.type, id: finger.id });
    });
    uniqueHands[i].fingerInfo = fingerInfo
  }

  //in case of hardware losing the hand in frame N and finding a "new" one in frame N+1 i have to cover for one hand having multiple IDs
  const handInfo = _.chain(uniqueHands).groupBy('type').map((value, key) => ({ hand: key, info: value })).value()
  //[{hand: "left"/"right", info: hand object with fingerInfo obj}]

  const wholeHandInfo = [];

  handInfo.forEach(handElement => {
    let handIds = [];
    let handFingerInfo = [];
    handElement.info.forEach(handElementInfo => {
      handIds.push(handElementInfo.id);
      handFingerInfo.push([...handElementInfo.fingerInfo])
    })
    const superFingerInfo = getUniqueListBy(handFingerInfo.flat(), 'id')
    const fingersInfoWithMultipleIds = _.chain(superFingerInfo).groupBy('type').map((value, key) => ({
      type: parseInt(key),
      ids: value.map(element => element.id)
    })).value()

    wholeHandInfo.push(
      {
        hand: handElement.hand,
        handIds: handIds,
        fingerInfo: fingersInfoWithMultipleIds,
      }
    )
  })

  return wholeHandInfo
}

function getUniqueListBy(arr, key) {
  return [...new Map(arr.map(item => [item[key], item])).values()]
}


//change to typescript and use them!
// interface FingerInfo {
//   type: Number;
//   ids: []
// }

// interface HandInfo {
//   hand: String,
//   handIds: [],
//   fingerInfo: []
// }