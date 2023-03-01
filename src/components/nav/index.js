/* eslint-disable no-undef */
import NAV from "./Nav";
import SCAN from "./Scan";
import { clear } from "../spriteSheetBuilder";

var viewer = null;
var client = null;
var tfClient = null;
var cloudScan = null;

function createNav(ros = null) {
  // Create the main viewer.
  viewer = new window.ROS2D.Viewer({
    divID: "navi",
    width: 600,
    height: 600
  });

  client = NAV.OccupancyGridClientNav({
    ros: ros,
    rootObject: viewer.scene,
    viewer: viewer,
    serverName: "/move_base",
    robot_pose: "/amcl_pose",
    continuous: false
  });
  // 坐标系变换,可以确定机器人位置以及修改激光坐标系
  tfClient = new ROSLIB.TFClient({
    ros: ros,
    fixedFrame: "map",
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
  tfClient.subscribe("base_link", tf => {
    cloudScan.poindCloud.updateRobotPos({
      position: tf.translation,
      orientation: tf.rotation
    });
  });

  return client;
}
function navDestroyed() {
  createjs.Ticker.removeAllEventListeners();
  viewer && viewer.scene.removeAllEventListeners() && createjs.Touch.disable(viewer.scene);
  viewer = null;
  client = null;
  tfClient && tfClient.dispose();
  tfClient = null;
  cloudScan && cloudScan.cloudListener.unsubscribe();
  cloudScan = null;
  clear();
}

export { createNav, navDestroyed, viewer };
