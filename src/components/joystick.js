/* eslint-disable no-undef */
import nipplejs from "nipplejs";
// import { move } from "./connect";

var manager = null;
var timer = null;
var cmd_vel_listener = null;

// 创建移动主题，并由cmd_vel_listener节点发布该主题
function move(linear, angular) {
  if (linear == 0 && angular == 0) {
    console.log("stop");
  }
  var twist = new ROSLIB.Message({
    linear: {
      x: linear,
      y: 0,
      z: 0
    },
    angular: {
      x: 0,
      y: 0,
      z: angular
    }
  });
  // console.log(linear);
  cmd_vel_listener.publish(twist);
}

// param: DOM元素id
function createjoystick(ros = null, element = "stick") {
  cmd_vel_listener = new ROSLIB.Topic({
    ros: ros,
    name: "/cmd_vel", ///cmd_vel_mux/input/navi
    messageType: "geometry_msgs/Twist"
  });
  if (!manager) {
    var linear_speed = 0;
    var angular_speed = 0;

    manager = nipplejs.create({
      zone: document.getElementById(element),
      threshold: 0.1,
      position: {
        top: 80 + "%",
        left: 90 + "%"
      },
      mode: "static",
      size: 150,
      color: "#300000",
      dynamicPage: true
    });

    manager.on("start", function() {
      console.log("Movement start");
      // 周期检测手柄位置并发送
      timer = setInterval(function() {
        console.log("setInterval");
        move(linear_speed, angular_speed);
      }, 25);
    });

    manager.on("move", function(event, nipple) {
      console.log("Moving");
      var max_linear = 0.3; // m/s
      var max_angular = 0.4; // rad/s
      var max_distance = 75.0; // pixels;
      linear_speed =
        (Math.sin(nipple.angle.radian) * max_linear * nipple.distance) /
        max_distance;
      angular_speed =
        (-Math.cos(nipple.angle.radian) * max_angular * nipple.distance) /
        max_distance;
    });

    manager.on("end", function() {
      console.log("Movement end");
      if (timer) {
        clearInterval(timer);
        console.log("clearInterval");
      }
      move(0, 0);
    });
  }
}

// 销毁手柄，置空全局变量
function destroyjoystick() {
  if (manager) {
    manager.destroy();
    manager = null;
  }
  cmd_vel_listener.unsubscribe();
  cmd_vel_listener = null;
}

export { createjoystick, destroyjoystick, move };
