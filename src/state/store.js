/**
 * intro: 状态的统一管理和保存
 * state:
 *   url: 链接的URL地址
 *   status: 链接的状态
 */
/* eslint-disable no-undef */
var ros = new ROSLIB.Ros({
  groovyCompatibility: false
});
ros.on("connection", function() {
  console.log("ROS in connect.js: Connected to websocket server.");
});

ros.on("error", function(error) {
  console.log(
    "ROS in connect.js: Error connecting to websocket server: ",
    error
  );
});

ros.on("close", function() {
  console.log("ROS in connect.js: Connection to websocket server closed.");
});

export { ros };
