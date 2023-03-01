/**
 * @author Russell Toris - rctoris@wpi.edu
 */
/* eslint-disable no-undef */
var ROS2D = ROS2D || {
  REVISION: "0.9.0"
};

// convert the given global Stage coordinates to ROS coordinates
createjs.Stage.prototype.globalToRos = function(x, y) {
  var rosX = (x - this.x) / this.scaleX;
  var rosY = (this.y - y) / this.scaleY;
  return new ROSLIB.Vector3({
    x: rosX,
    y: rosY
  });
};

// convert the given ROS coordinates to global Stage coordinates
createjs.Stage.prototype.rosToGlobal = function(pos) {
  var x = pos.x * this.scaleX + this.x;
  var y = pos.y * this.scaleY + this.y;
  return {
    x: x,
    y: y
  };
};

// convert a ROS quaternion to theta in degrees
createjs.Stage.prototype.rosQuaternionToGlobalTheta = function(orientation) {
  // See https://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles#Rotation_matrices
  // here we use [x y z] = R * [1 0 0]
  var q0 = orientation.w;
  var q1 = orientation.x;
  var q2 = orientation.y;
  var q3 = orientation.z;
  // Canvas rotation is clock wise and in degrees
  return (
    (-Math.atan2(2 * (q0 * q3 + q1 * q2), 1 - 2 * (q2 * q2 + q3 * q3)) *
      180.0) /
    Math.PI
  );
};

/**
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * An OccupancyGrid can convert a ROS occupancy grid message into a createjs Bitmap object.
 *
 * @constructor
 * @param options - object with following keys:
 *   * message - the occupancy grid message
 */
ROS2D.OccupancyGrid = function(options) {
  options = options || {};
  var message = options.message;

  // internal drawing canvas
  var canvas = document.createElement("canvas");
  var context = canvas.getContext("2d");

  // save the metadata we need
  this.pose = new ROSLIB.Pose({
    position: message.info.origin.position,
    orientation: message.info.origin.orientation
  });

  // set the size
  this.width = message.info.width;
  this.height = message.info.height;
  canvas.width = this.width;
  canvas.height = this.height;

  var imageData = context.createImageData(this.width, this.height);
  for (var row = 0; row < this.height; row++) {
    for (var col = 0; col < this.width; col++) {
      // determine the index into the map data
      var mapI = col + (this.height - row - 1) * this.width;
      // determine the value
      var data = message.data[mapI];
      var val;
      if (data === 100) {
        val = 0;
      } else if (data === 0) {
        val = 255;
      } else {
        val = 127;
      }

      // determine the index into the image data array
      var i = (col + row * this.width) * 4;
      // r
      imageData.data[i] = val;
      // g
      imageData.data[++i] = val;
      // b
      imageData.data[++i] = val;
      // a
      imageData.data[++i] = 255;
    }
  }
  context.putImageData(imageData, 0, 0);

  // create the bitmap
  createjs.Bitmap.call(this, canvas);
  // change Y direction
  this.y = -this.height * message.info.resolution;

  // scale the image
  this.scaleX = message.info.resolution;
  this.scaleY = message.info.resolution;
  this.width *= this.scaleX;
  this.height *= this.scaleY;

  // set the pose
  this.x += this.pose.position.x;
  this.y -= this.pose.position.y;
};
ROS2D.OccupancyGrid.prototype.__proto__ = createjs.Bitmap.prototype;

/**
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * A map that listens to a given occupancy grid topic.
 *
 * Emits the following events:
 *   * 'change' - there was an update or change in the map
 *
 * @constructor
 * @param options - object with following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic (optional) - the map topic to listen to
 *   * rootObject (optional) - the root object to add this marker to
 *   * continuous (optional) - if the map should be continuously loaded (e.g., for SLAM)
 */
ROS2D.OccupancyGridClient = function(options) {
  var that = this;
  options = options || {};
  var ros = options.ros;
  var topic = options.topic || "/map";
  this.continuous = options.continuous;
  this.rootObject = options.rootObject || new createjs.Container();

  // current grid that is displayed
  // create an empty shape to start with, so that the order remains correct.
  this.currentGrid = new createjs.Shape();
  this.rootObject.addChild(this.currentGrid);
  let imgsrc = [{ id: "add", src: require("../../img/add.jpg") }];
  let load = new createjs.LoadQueue(false);
  load.loadManifest(imgsrc);
  load.on("complete", () => {
    let add = new createjs.Bitmap(load.getResult("add"));
    add.setTransform(-0.13, -0.13, 0.001, 0.001);
    this.rootObject.addChildAt(add, 1);
  });

  // subscribe to the topic
  var rosTopic = new ROSLIB.Topic({
    ros: ros,
    name: topic,
    messageType: "nav_msgs/OccupancyGrid",
    compression: "png"
  });

  rosTopic.subscribe(function(message) {
    // check for an old map
    var index = null;
    if (that.currentGrid) {
      index = that.rootObject.getChildIndex(that.currentGrid);
      that.rootObject.removeChild(that.currentGrid);
      that.currentGrid = null;
    }

    that.currentGrid = new ROS2D.OccupancyGrid({
      message: message
    });
    if (index !== null) {
      that.rootObject.addChildAt(that.currentGrid, index);
    } else {
      that.rootObject.addChild(that.currentGrid);
    }

    that.emit("change");

    // check if we should unsubscribe
    if (!that.continuous) {
      rosTopic.unsubscribe();
    }
  });
  this.cancleRosTopic = () => {
    rosTopic.unsubscribe();
  };
};
ROS2D.OccupancyGridClient.prototype.__proto__ = EventEmitter2.prototype;

/**
 * @author Bart van Vliet - bart@dobots.nl
 */

/**
 * Adds panning to a view
 *
 * @constructor
 * @param options - object with following keys:
 *   * rootObject (optional) - the root object to apply panning to
 */
ROS2D.PanView = function(options) {
  options = options || {};
  this.rootObject = options.rootObject;

  // get a handle to the stage
  if (this.rootObject instanceof createjs.Stage) {
    this.stage = this.rootObject;
  } else {
    this.stage = this.rootObject.getStage();
  }

  this.startPos = new ROSLIB.Vector3();
};

ROS2D.PanView.prototype.startPan = function(startX, startY) {
  this.startPos.x = startX;
  this.startPos.y = startY;
};

ROS2D.PanView.prototype.pan = function(curX, curY) {
  this.stage.x += curX - this.startPos.x;
  this.startPos.x = curX;
  this.stage.y += curY - this.startPos.y;
  this.startPos.y = curY;
};

/**
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * A Viewer can be used to render an interactive 2D scene to a HTML5 canvas.
 *
 * @constructor
 * @param options - object with following keys:
 *   * divID - the ID of the div to place the viewer in
 *   * width - the initial width, in pixels, of the canvas
 *   * height - the initial height, in pixels, of the canvas
 *   * background (optional) - the color to render the background, like '#efefef'
 */
ROS2D.Viewer = function(options) {
  options = options || {};
  var divID = options.divID;
  this.width = options.width;
  this.height = options.height;
  var background = options.background || "#111111";

  // create the canvas to render to
  var canvas = document.createElement("canvas");
  canvas.width = this.width;
  canvas.height = this.height;
  canvas.style.background = background;
  document.getElementById(divID).appendChild(canvas);
  // create the easel to use
  this.scene = new createjs.StageGL(canvas);

  // change Y axis center
  this.scene.y = this.height;

  // update at 30fps
  createjs.Touch.enable(this.scene);
  createjs.Ticker.framerate = 40;
  createjs.Ticker.timingMode = createjs.Ticker.RAF_SYNCHED;
  createjs.Ticker.addEventListener("tick", this.scene);
};
/**
 * Add the given createjs object to the global scene in the viewer.
 *
 * @param object - the object to add
 */
ROS2D.Viewer.prototype.addObject = function(object) {
  this.scene.addChild(object);
};

/**
 * Scale the scene to fit the given width and height into the current canvas.
 *
 * @param width - the width to scale to in meters
 * @param height - the height to scale to in meters
 */
ROS2D.Viewer.prototype.scaleToDimensions = function(width, height) {
  // restore to values before shifting, if ocurred
  this.scene.x =
    typeof this.scene.x_prev_shift !== "undefined"
      ? this.scene.x_prev_shift
      : this.scene.x;
  this.scene.y =
    typeof this.scene.y_prev_shift !== "undefined"
      ? this.scene.y_prev_shift
      : this.scene.y;

  // save scene scaling
  this.scene.scaleX = this.width / width;
  this.scene.scaleY = this.height / height;
};

/**
 * Shift the main view of the canvas by the given amount. This is based on the
 * ROS coordinate system. That is, Y is opposite that of a traditional canvas.
 *
 * @param x - the amount to shift by in the x direction in meters
 * @param y - the amount to shift by in the y direction in meters
 */
ROS2D.Viewer.prototype.shift = function(x, y) {
  // save current offset
  this.scene.x_prev_shift = this.scene.x;
  this.scene.y_prev_shift = this.scene.y;

  // shift scene by scaling the desired offset
  this.scene.x -= x * this.scene.scaleX;
  this.scene.y += y * this.scene.scaleY;
};

/**
 * @author Bart van Vliet - bart@dobots.nl
 */

/**
 * Adds zooming to a view
 *
 * @constructor
 * @param options - object with following keys:
 *   * rootObject (optional) - the root object to apply zoom to
 *   * minScale (optional) - minimum scale to set to preserve precision
 */
ROS2D.ZoomView = function(options) {
  options = options || {};
  this.rootObject = options.rootObject;
  this.minScale = options.minScale || 0.001;

  // get a handle to the stage
  if (this.rootObject instanceof createjs.Stage) {
    this.stage = this.rootObject;
  } else {
    this.stage = this.rootObject.getStage();
  }

  this.center = new ROSLIB.Vector3();
  this.startShift = new ROSLIB.Vector3();
  this.startScale = new ROSLIB.Vector3();
};

ROS2D.ZoomView.prototype.startZoom = function(centerX, centerY) {
  this.center.x = centerX;
  this.center.y = centerY;
  this.startShift.x = this.stage.x;
  this.startShift.y = this.stage.y;
  this.startScale.x = this.stage.scaleX;
  this.startScale.y = this.stage.scaleY;
};

ROS2D.ZoomView.prototype.zoom = function(zoom) {
  // Make sure scale doesn't become too small
  if (this.startScale.x * zoom < this.minScale) {
    zoom = this.minScale / this.startScale.x;
  }
  if (this.startScale.y * zoom < this.minScale) {
    zoom = this.minScale / this.startScale.y;
  }

  this.stage.scaleX = this.startScale.x * zoom;
  this.stage.scaleY = this.startScale.y * zoom;

  this.stage.x =
    this.startShift.x -
    (this.center.x - this.startShift.x) *
      (this.stage.scaleX / this.startScale.x - 1);
  this.stage.y =
    this.startShift.y -
    (this.center.y - this.startShift.y) *
      (this.stage.scaleY / this.startScale.y - 1);
};

/**
 * A shape to draw a nav_msgs/Path msg
 *
 * @constructor
 * @param options - object with following keys:
 *   * path (optional) - the initial path to draw
 *   * strokeSize (optional) - the size of the outline
 *   * strokeColor (optional) - the createjs color for the stroke
 */
ROS2D.PathShape = function(options) {
  options = options || {};
  var path = options.path;
  var scale = options.scale;
  this.strokeSize = options.strokeSize || 3;
  this.strokeColor = options.strokeColor || createjs.Graphics.getRGB(0, 0, 0);

  // draw the line
  this.graphics = new createjs.Graphics();

  if (path !== null && typeof path !== "undefined") {
    this.graphics.setStrokeStyle(this.strokeSize);
    this.graphics.beginStroke(this.strokeColor);
    this.graphics.moveTo(
      path.poses[0].pose.position.x / scale.x,
      path.poses[0].pose.position.y / -scale.y
    );
    for (var i = 1; i < path.poses.length; ++i) {
      this.graphics.lineTo(
        path.poses[i].pose.position.x / scale.x,
        path.poses[i].pose.position.y / -scale.y
      );
    }
    this.graphics.endStroke();
  }

  // create the shape
  createjs.Shape.call(this, this.graphics);
};

/**
 * Set the path to draw
 *
 * @param path of type nav_msgs/Path
 */
ROS2D.PathShape.prototype.setPath = function(path, transform, scale) {
  this.graphics.clear();
  if (path !== null && typeof path !== "undefined") {
    this.graphics.setStrokeStyle(this.strokeSize);
    this.graphics.beginStroke(this.strokeColor);
    this.graphics.moveTo(
      (path.poses[0].pose.position.x + transform.x) / scale.x,
      (path.poses[0].pose.position.y + transform.y) / -scale.y
    );
    for (var i = 1; i < path.poses.length; ++i) {
      this.graphics.lineTo(
        (path.poses[i].pose.position.x + transform.x) / scale.x,
        (path.poses[i].pose.position.y + transform.y) / -scale.y
      );
    }
    this.graphics.endStroke();
  }
};

ROS2D.PathShape.prototype.__proto__ = createjs.Shape.prototype;

export { ROS2D };
