/* eslint-disable no-undef */
import NAV from "./nav/Nav";
import RosCanvas from "./nav/RosCanvas";
import SCAN from "./nav/Scan";
import { mySprite, clear } from "./spriteSheetBuilder";
var viewer = null;
var gridClient = null;
var tfClient = null;
var cloudScan = null;
// eslint-disable-next-line no-unused-vars
function createRobot(rootObject, robot_pose) {
  // get a handle to the stage
  var stage;
  if (rootObject instanceof createjs.Stage) {
    stage = rootObject;
  } else {
    stage = rootObject.getStage();
  }
  // marker for the robot
  let size = 20;
  let robotMarker = new RosCanvas.NavigationArrow({
    size: size,
    strokeSize: size / 10,
    fillColor: "#583c8a",
    pulse: true
  });
  mySprite(robotMarker, size, robotMarker.frame, "NavigationArrow").then(
    res => {
      let robot = new createjs.Sprite(res);
      robot.play();

      // wait for a pose to come in first
      robot.visible = false;
      robot.scaleX = 0.015625;
      robot.scaleY = 0.015625;
      rootObject.addChild(robot);
      // var initScaleSet = false;
      var updateRobotPosition = function(pose, orientation) {
        // update the robots position on the map
        robot.x = pose.x;
        robot.y = -pose.y;
        // change the angle
        robot.rotation = stage.rosQuaternionToGlobalTheta(orientation);
        // Set visible
        robot.visible = true;
      };
      tfClient.subscribe(robot_pose, tf => {
        updateRobotPosition(tf.translation, tf.rotation);
      });
    }
  );
}

function createView(ros = null) {
  // 创建2D导航画布
  viewer = new window.ROS2D.Viewer({
    divID: "map",
    width: 600,
    height: 600
  });

  gridClient = new window.ROS2D.OccupancyGridClient({
    ros: ros,
    rootObject: viewer.scene,
    viewer: viewer,
    continuous: true
  });
  tfClient = new ROSLIB.TFClient({
    ros: ros,
    fixedFrame: "/map",
    angularThres: 0.01,
    transThres: 0.01
  });
  cloudScan = new SCAN.cloudScan({
    ros: ros,
    scanName: "/scan",
    scanType: "sensor_msgs/LaserScan",
    rootObject: viewer.scene,
    isPointedCloud: false
  });
  tfClient.subscribe("/base_link", tf => {
    cloudScan.poindCloud.updateRobotPos({
      position: tf.translation,
      orientation: tf.rotation
    });
  });
  createRobot(viewer.scene, "/base_link");

  var old_state = null;
  gridClient.once("change", function() {
    // scale the viewer to fit the map
    old_state = NAV.resizeMap(old_state, viewer, gridClient.currentGrid);
  });

  // 添加拖拽事件
  var oldX = 0;
  var oldY = 0;
  viewer.scene.removeAllEventListeners();
  viewer.scene.on("mousedown", function(evt) {
    oldX = evt.stageX;
    oldY = evt.stageY;
  });

  viewer.scene.on("pressmove", function(evt) {
    evt.currentTarget.x += evt.stageX - oldX;
    evt.currentTarget.y += evt.stageY - oldY;
    oldX = evt.stageX;
    oldY = evt.stageY;
  });
}

function drawDestroyed() {
  gridClient && gridClient.cancleRosTopic();
  gridClient = null;
  createjs.Ticker.removeAllEventListeners();
  viewer && viewer.scene.removeAllEventListeners() && createjs.Touch.disable(viewer.scene);
  viewer = null;
  tfClient && tfClient.dispose();
  tfClient = null;
  cloudScan && cloudScan.cloudListener.unsubscribe();
  cloudScan = null;
  clear();
  
}

export { createView, drawDestroyed, viewer };
