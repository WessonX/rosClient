/* eslint-disable no-undef */
import RosCanvas from "./RosCanvas";
import { mySprite } from "../spriteSheetBuilder";
var SCAN = SCAN || {
  REVISION: "0.0.1-DEV",
  THROTTLE_RATE: 30
};

/*
点云扫描生成
*/

SCAN.cloudScan = function(options) {
  options = options || {};
  var ros = options.ros;
  var name = options.scanName;
  var type = options.scanType;
  var color = options.color;
  //var robot = options.robotName || "";
  var isPointedCloud = options.isPointedCloud;
  var rootObject = options.rootObject || new createjs.Container();

  // Cloud INIT & Callback
  this.poindCloud = new RosCanvas.PointCloud({
    pointCallBack: function() {},
    pointSize: 1,
    pointColor: color
  });

  rootObject.addChild(this.poindCloud);

  this.cloudListener = new ROSLIB.Topic({
    ros: ros,
    name: name,
    messageType: type,
    throttle_rate: SCAN.THROTTLE_RATE
  });

  let pointBitmap = this.poindCloud.createPointShape();
  mySprite(pointBitmap.point, 1, pointBitmap.frame, "scan").then(res => {
    let initialSet = true;
    this.cloudListener.subscribe(msg => {
      if (initialSet) {
        this.poindCloud.points_size = msg.ranges.length;
        for (var i = 0; i < this.poindCloud.points_size; i++) {
          let point = new createjs.Sprite(res);
          point.play();
          point.scaleX = 0.05;
          point.scaleY = 0.05;
          this.poindCloud.pointContainer.addChild(point);
        }
        initialSet = false;
      }
      if (!isPointedCloud) {
        this.poindCloud.scanTransform(msg);
      } else {
        this.poindCloud.scanPointCloud(msg);
      }
    });
  });
};
export default SCAN;
