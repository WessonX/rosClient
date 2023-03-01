/* eslint-disable no-undef */
import RosCanvas from "./RosCanvas";
import { mySprite } from "../spriteSheetBuilder";
var NAV = NAV || { REVISION: "0.0.1-DEV", THROTTLE_RATE: 10 };
/**
 * USE INTERNALLY. Resize an Image map when receive new dimension.
 *
 * @param old_state - Previous state
 * @param viewer - Viewer 2D
 * @param currentGrid - Current grid with information about width, height and position
 */
NAV.resizeMap = function(old_state, viewer, currentGrid) {
  // console.log("resize",old_state,viewer,currentGrid)

  var origin_width = currentGrid.width / currentGrid.scaleX;
  var origin_height = currentGrid.height / currentGrid.scaleY;

  if (origin_width > viewer.scene.canvas.width) {
    viewer.scene.canvas.width = viewer.width;
  }
  if (origin_height > viewer.scene.canvas.height) {
    viewer.scene.canvas.height = viewer.height;
  }
  // viewer.scene.canvas.width = 1000
  // viewer.scene.canvas.height = 1000

  viewer.scene.canvas.style.backgroundColor = "#eaeaea";
  if (!old_state) {
    old_state = {
      width: currentGrid.width,
      height: currentGrid.height,
      x: currentGrid.pose.position.x,
      y: currentGrid.pose.position.y
    };
    viewer.scaleToDimensions(currentGrid.width, currentGrid.height);
    viewer.shift(currentGrid.pose.position.x, currentGrid.pose.position.y);
  }
  if (
    old_state.width !== currentGrid.width ||
    old_state.height !== currentGrid.height
  ) {
    viewer.scaleToDimensions(currentGrid.width, currentGrid.height);
    old_state.width = currentGrid.width;
    old_state.height = currentGrid.height;
  }
  if (
    old_state.x !== currentGrid.pose.position.x ||
    old_state.y !== currentGrid.pose.position.y
  ) {
    viewer.shift(
      (currentGrid.pose.position.x - old_state.x) / 1,
      (currentGrid.pose.position.y - old_state.y) / 1
    );
    old_state.x = currentGrid.pose.position.x;
    old_state.y = currentGrid.pose.position.y;
  }
  return old_state;
};
/**
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * A OccupancyGridClientNav uses an OccupancyGridClient to create a map for use with a Navigator.
 *
 * @constructor
 * @param options - object with following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * tfClient (optional) - Read information from TF
 *   * topic (optional) - the map topic to listen to
 *   * robot_pose (optional) - the robot topic or TF to listen position
 *   * rootObject (optional) - the root object to add this marker to
 *   * continuous (optional) - if the map should be continuously loaded (e.g., for SLAM)
 *   * serverName (optional) - the action server name to use for navigation, like '/move_base'
 *   * actionName (optional) - the navigation action name, like 'move_base_msgs/MoveBaseAction'
 *   * rootObject (optional) - the root object to add the click listeners to and render robot markers to
 *   * withOrientation (optional) - if the Navigator should consider the robot orientation (default: false)
 *   * image (optional) - the route of the image if we want to use the NavigationImage instead the NavigationArrow
 *   * viewer - the main viewer to render to
 */
NAV.OccupancyGridClientNav = function(options) {
  options = options || {};
  var ros = options.ros;
  var tfClient = options.tfClient || null;
  var map_topic = options.topic || "/map";
  var robot_pose = options.robot_pose || "/amcl_pose";
  var continuous = options.continuous;
  var serverName = options.serverName || "/move_base";
  var actionName = options.actionName || "move_base_msgs/MoveBaseAction";
  var rootObject = options.rootObject || new createjs.Container();
  var viewer = options.viewer;
  var withOrientation = options.withOrientation || false;
  var image = options.image || false;
  var old_state = null;

  // setup a client to get the map
  var client = new ROS2D.OccupancyGridClient({
    ros: ros,
    rootObject: rootObject,
    continuous: continuous,
    topic: map_topic
  });

  // eslint-disable-next-line no-unused-vars
  var navigator = new NAV.Navigator({
    ros: ros,
    tfClient: tfClient,
    serverName: serverName,
    actionName: actionName,
    robot_pose: robot_pose,
    rootObject: rootObject,
    withOrientation: withOrientation,
    image: image
  });

  client.once("change", function() {
    // scale the viewer to fit the map
    old_state = NAV.resizeMap(old_state, viewer, client.currentGrid);
  });

  return navigator;
};

/**
 * @author Russell Toris - rctoris@wpi.edu
 * @author Lars Kunze - l.kunze@cs.bham.ac.uk
 * @author Raffaello Bonghi - raffaello.bonghi@officinerobotiche.it
 */

/**
 * A navigator can be used to add click-to-navigate options to an object. If
 * withOrientation is set to true, the user can also specify the orientation of
 * the robot by clicking at the goal position and pointing into the desired
 * direction (while holding the button pressed).
 *
 * @constructor
 * @param options - object with following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * tfClient (optional) - the TF client
 *   * robot_pose (optional) - the robot topic or TF to listen position
 *   * serverName (optional) - the action server name to use for navigation, like '/move_base'
 *   * actionName (optional) - the navigation action name, like 'move_base_msgs/MoveBaseAction'
 *   * rootObject (optional) - the root object to add the click listeners to and render robot markers to
 *   * withOrientation (optional) - if the Navigator should consider the robot orientation (default: false)
 */
NAV.Navigator = function(options) {
  var that = this;
  options = options || {};
  var ros = options.ros;
  var robot_pose = options.robot_pose || "/amcl_pose";
  var serverName = options.serverName || "/move_base";
  var actionName = options.actionName || "move_base_msgs/MoveBaseAction";
  this.rootObject = options.rootObject || new createjs.Container();
  this.virtualWall = [];
  this.wallInfoObject = [];

  this.goalMarker = null;

  // setup the actionlib client
  var actionClient = new ROSLIB.ActionClient({
    ros: ros,
    actionName: actionName,
    serverName: serverName
  });
  var seq = 0;
  function setInitialPose(pose) {
    var initial_pose = new ROSLIB.Topic({
      ros: ros,
      name: "/initialpose",
      messageType: "geometry_msgs/PoseWithCovarianceStamped"
    });
    let time = Date.now();
    var msg = new ROSLIB.Message({
      header: {
        seq: ++seq,
        stamp: {
          secs: time / 1000,
          nsecs: time % 1000
        },
        frame_id: "map"
      },
      pose: {
        pose: pose,
        covariance: [
          0.25,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.25,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.06853891945200942
        ]
      }
    });
    initial_pose.publish(msg);
  }
  /**
   * Send a goal to the navigation stack with the given pose.
   *
   * @param pose - the goal pose
   */
  async function sendGoal(pose) {
    // 取消擦除目标点的回调函数
    that.cancelGoal();
    if (typeof that.resultCallback == "function") {
      that.currentGoal.off("result", that.resultCallback);
      that.resultCallback = null;
    }
    // create a goal
    var goal = new ROSLIB.Goal({
      actionClient: actionClient,
      goalMessage: {
        target_pose: {
          header: {
            frame_id: "map"
          },
          pose: pose
        }
      }
    });
    goal.send();

    that.currentGoal = goal;
    // create a marker for the goal
    if (that.goalMarker === null) {
      console.log("init goal");
      let goalPoint = new RosCanvas.goalPoint({ size: 10, pulse: true });
      let sprite = await mySprite(goalPoint, 10, goalPoint.frame, "goalPoint");
      that.goalMarker = new createjs.Sprite(sprite);
      that.goalMarker.play();
      that.goalMarker.scaleX = 0.015625;
      that.goalMarker.scaleY = 0.015625;
    }
    that.rootObject.addChild(that.goalMarker);
    that.goalMarker.x = pose.position.x;
    that.goalMarker.y = -pose.position.y;
    that.goalMarker.rotation = stage.rosQuaternionToGlobalTheta(
      pose.orientation
    );

    var callback = function() {
      // TODO
      if (that.planPath) {
        that.rootObject.removeChild(that.planPath);
      }
      that.rootObject.removeChild(that.goalMarker);
      that.goalMarker = null;
    };

    that.resultCallback = callback;
    goal.on("result", callback);
  }

  /**
   * Cancel the currently active goal.
   */
  this.cancelGoal = function() {
    if (typeof that.currentGoal !== "undefined") {
      that.currentGoal.cancel();
    }
  };

  // get a handle to the stage
  var stage;
  if (that.rootObject instanceof createjs.Stage) {
    stage = that.rootObject;
  } else {
    stage = that.rootObject.getStage();
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
      that.rootObject.addChild(robot);
      var updateRobotPosition = (pose, orientation) => {
        robot.x = pose.x;
        robot.y = -pose.y;
        robot.rotation = stage.rosQuaternionToGlobalTheta(orientation);
        robot.visible = true;
      };
      var poseListener = new ROSLIB.Topic({
        ros: ros,
        name: robot_pose,
        messageType: "geometry_msgs/PoseWithCovarianceStamped",
        throttle_rate: NAV.THROTTLE_RATE
      });
      poseListener.subscribe(obj => {
        updateRobotPosition(obj.pose.pose.position, obj.pose.pose.orientation);
      });
    }
  );
  (function() {
    let len = 20;
    let virtualWall = new RosCanvas.virtualWall({
      size: len,
      strokeSize: 2,
      fillColor: createjs.Graphics.getRGB(66, 38, 23),
      length: len,
      pulse: false
    });
    mySprite(
      virtualWall,
      new createjs.Rectangle(0, 0, len, len),
      virtualWall.frame,
      "virtualWall"
    );
    let greenNavigationArrow = new RosCanvas.NavigationArrow({
      size: 25,
      strokeSize: 1,
      fillColor: createjs.Graphics.getRGB(0, 255, 0, 0.66),
      pulse: false
    });
    mySprite(
      greenNavigationArrow,
      25,
      greenNavigationArrow.frame,
      "greenNavigationArrow"
    );
  })();

  // setup a double click listener (no orientation)
  this.rootObject.addEventListener("dblclick", function(event) {
    // convert to ROS coordinates
    if (that.planPath) {
      that.rootObject.removeChild(that.planPath);
    }

    var coords = stage.globalToRos(event.stageX, event.stageY);
    var pose = new ROSLIB.Pose({
      position: new ROSLIB.Vector3(coords)
    });
    // send the goal
    sendGoal(pose);
  });
  // withOrientation === true
  // setup a click-and-point listener (with orientation)
  var position = null;
  var canvasPos = null;
  var positionVec3 = null;
  var thetaRadians = 0;
  var thetaDegrees = 0;
  var mouseDown = false;
  var orientationMarker = null;
  var xDelta = 0;
  var yDelta = 0;
  var remeberWall = true;

  var mouseEventHandler = async function(
    event,
    mouseState,
    sendOrEstimate,
    showAddWallsOptionFlag
  ) {
    if (mouseState === "down") {
      // get position when mouse button is pressed down
      position = stage.globalToRos(event.stageX, event.stageY);
      canvasPos = { x: event.stageX, y: event.stageY };
      positionVec3 = new ROSLIB.Vector3(position);
      mouseDown = true;
    } else if (mouseState === "move") {
      // remove obsolete orientation marker
      that.rootObject.removeChild(orientationMarker);
      if (mouseDown === true) {
        // if mouse button is held down:
        // - get current mouse position
        // - calulate direction between stored <position> and current position
        // - place orientation marker
        var currentPos = stage.globalToRos(event.stageX, event.stageY);
        var curCanvaspos = { x: event.stageX, y: event.stageY };
        var currentPosVec3 = new ROSLIB.Vector3(currentPos);

        xDelta = currentPosVec3.x - positionVec3.x;
        yDelta = currentPosVec3.y - positionVec3.y;

        thetaRadians = Math.atan2(xDelta, yDelta);

        thetaDegrees = thetaRadians * (180.0 / Math.PI);

        if (thetaDegrees >= 0 && thetaDegrees <= 180) {
          thetaDegrees += 270;
        } else {
          thetaDegrees -= 90;
        }

        if (showAddWallsOptionFlag) {
          let len = 20;
          let wallLength =
            ((curCanvaspos.x - canvasPos.x) ** 2 +
              (curCanvaspos.y - canvasPos.y) ** 2) **
            0.5;
          let virtualWall = new RosCanvas.virtualWall({
            size: len,
            strokeSize: 2,
            fillColor: createjs.Graphics.getRGB(66, 38, 23),
            length: len,
            pulse: false
          });
          let sprite = await mySprite(
            virtualWall,
            new createjs.Rectangle(0, 0, len, len),
            virtualWall.frame,
            "virtualWall"
          );
          orientationMarker = new createjs.Sprite(sprite);
          orientationMarker.play();
          orientationMarker.scaleX = wallLength / len / that.rootObject.scaleX;
          orientationMarker.scaleY = 0.015625;
        } else {
          let greenNavigationArrow = new RosCanvas.NavigationArrow({
            size: 25,
            strokeSize: 1,
            fillColor: createjs.Graphics.getRGB(0, 255, 0, 0.66),
            pulse: false
          });

          let sprite = await mySprite(
            greenNavigationArrow,
            25,
            greenNavigationArrow.frame,
            "greenNavigationArrow"
          );
          orientationMarker = new createjs.Sprite(sprite);
          orientationMarker.play();
          orientationMarker.scaleX = 0.015625;
          orientationMarker.scaleY = 0.015625;
        }
        orientationMarker.x = positionVec3.x;
        orientationMarker.y = -positionVec3.y;
        orientationMarker.rotation = thetaDegrees;
        that.rootObject.addChild(orientationMarker);
      }
    } else if (mouseDown) {
      mouseDown = false;
      var goalPos = stage.globalToRos(event.stageX, event.stageY);
      var goalPosVec3 = new ROSLIB.Vector3(goalPos);

      xDelta = goalPosVec3.x - positionVec3.x;
      yDelta = goalPosVec3.y - positionVec3.y;

      thetaRadians = Math.atan2(xDelta, yDelta);

      if (thetaRadians >= 0 && thetaRadians <= Math.PI) {
        thetaRadians += (3 * Math.PI) / 2;
      } else {
        thetaRadians -= Math.PI / 2;
      }

      var qz = Math.sin(-thetaRadians / 2.0);
      var qw = Math.cos(-thetaRadians / 2.0);

      var orientation = new ROSLIB.Quaternion({ x: 0, y: 0, z: qz, w: qw });

      var pose = new ROSLIB.Pose({
        position: positionVec3,
        orientation: orientation
      });
      // send the goal
      if (showAddWallsOptionFlag) {
        remeberWall = false;
        this.virtualWall.push(orientationMarker);
        this.wallInfoObject.push({
          form: [
            {
              x: positionVec3.x,
              y: positionVec3.y,
              z: 0
            },
            {
              x: goalPosVec3.x,
              y: goalPosVec3.y,
              z: 0
            }
          ]
        });
      } else {
        if (!sendOrEstimate) sendGoal(pose);
        else setInitialPose(pose);
      }
      if (remeberWall) {
        if (orientationMarker) that.rootObject.removeChild(orientationMarker);
      } else {
        remeberWall = true;
        orientationMarker = null;
      }
    }
  };
  this._mouseEventHandler = mouseEventHandler;
};

export default NAV;
