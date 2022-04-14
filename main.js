var fs = require('fs');


{
    hand: 0/1            //left/right
    finger: 0/1/2/3/4    //0 - thumb...
    gesture: gesture.type
    direction: getGesture(gesture)
}

function parseGestures(gestures, handInfo){
    var gestureList = [];
    //tu ta lista chyba list z gestami, to do zrobienia w środę jak będę miał sprzęt
}

function parseGestureInfo(gesture, handInfo){
    return {
        hand: identifyHand(gesture.handIds, handInfo),
        finger: identifyHand(gesture.pointableIds, handInfo),
        gesture: gesture.type,
        direction: getGesture(gesture)
    }
}

//circle gesture has:
// dot product says whether its clockwise or counterclockwise

//swipe gesture has:
// direction: left/right/top/down

function getGesture(gesture) {
    switch (gesture.type) {
        case "circle":
            var pointableID = gesture.pointableIds[0];
            var direction = frame.pointable(pointableID).direction;
            var dotProduct = Leap.vec3.dot(direction, gesture.normal);
            return dotProduct > 0 ? 'LM_CIRCLE_CLOCKWISE' : 'LM_CIRCLE_COUNTERCLOCKWISE'
        case "keyTap":
            return 'LM_KEY_TAP'
        case "screenTap":
            return 'LM_KEY_TAP'
        case "swipe":
            var isHorizontal = Math.abs(gesture.direction[0]) > Math.abs(gesture.direction[1]);
            if (isHorizontal) {
                return gesture.direction[0] > 0 ? 'LM_SWIPE_RIGHT' : 'LM_SWIPE_LEFT';
            } else { //vertical
                return gesture.direction[1] > 0 ? 'LM_SWIPE_UP' : 'LM_SWIPE_DOWN';
            }
    }
}