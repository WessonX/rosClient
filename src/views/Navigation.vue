<template>
  <div class="navigation">
    <el-card class="box-card" shadow="always">
      <div slot="header" class="clearfix">
        <div>
          <el-select v-model="map" placeholder="请选择地图">
            <el-option
              v-for="item in mapList"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            >
            </el-option>
          </el-select>
          <el-tag type="info">{{ "FPS:" + fps }}</el-tag>
        </div>
        <div>
          <el-button v-show="showVirtualFlag" @click="addVirtualWall"
            >添加墙壁</el-button
          >
          <el-button v-show="showVirtualFlag" @click="deleteVirtualWall"
            >取消墙壁</el-button
          >
          <el-button @click="startNav">开启导航</el-button>
        </div>
      </div>
      <div v-show="showAddWallsOptionFlag" class="lab2">
        <el-button @click="back">撤销</el-button>
        <el-button @click="backNav">返回导航</el-button>
        <el-button @click="saveAndLoadWalls">开启</el-button>
      </div>
      <div v-show="!showAddWallsOptionFlag && showVirtualFlag" class="lab">
        <el-switch
          v-model="toggle"
          inactive-text="平移地图"
          active-text="开启方向导航"
        >
        </el-switch>
        <el-switch
          v-model="sendOrEstimate"
          active-text="2D Pose Estimate"
        ></el-switch>
        <el-select
          v-model="pathTopic"
          placeholder="请选择路径"
          @visible-change="getPath"
          @change="path"
        >
          <el-option
            v-for="item in pathList"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          >
          </el-option>
        </el-select>
      </div>
      <div v-loading="loadingFlag" @wheel.stop.prevent="wheel" id="navi"></div>
    </el-card>
    <Camera />
  </div>
</template>
<style scoped>
.el-switch {
  height: 25px;
}
.robot .el-button {
  padding: 0;
}
.robot {
  display: flex;
  justify-content: space-between;
  flex-direction: column;
}
.clearfix {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.clearfix .el-button {
  height: 40px;
  padding: 10px;
}
.clearfix .el-input {
  margin: 0 10px;
}
.lab2 {
  margin-bottom: 5px;
}
.navigation {
  display: flex;
  justify-content: space-around;
  align-items: center;
}
#navi {
  width: 600px;
  height: 600px;
  overflow: hidden;
}
.box-card {
  height: 760px;
  width: 680px;
}
.lab {
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  justify-content: space-around;
}
</style>
<script>
/* eslint-disable no-undef */
import { createNav, navDestroyed, viewer } from "../components/nav/index.js";
import Camera from "./Camera.vue";
let ros;
let srv;
var tfClient;
let id = -1;
export default {
  components: {
    Camera
  },
  data() {
    return {
      zoomView: null,
      nav: null,
      pathList: [
        { value: "/move_base/NavfnROS/plan", label: "/move_base/NavfnROS/plan" }
      ],
      pathTopic: "",
      pathListener: null,
      toggle: false,
      sendOrEstimate: false,
      mapList: [],
      map: "",
      loadingFlag: false,
      showVirtualFlag: false,
      showAddWallsOptionFlag: false,
      fps: 0,
      cameraShow: false
    };
  },
  mounted() {
    [...document.getElementsByTagName("input")].slice(1).forEach(x => {
      x.onkeydown = e => {
        if (e.stopPropagation) e.stopPropagation();
        else e.cancelBubble = true;
      };
    });
    id = setInterval(() => {
      this.fps = Math.floor(createjs.Ticker.getMeasuredFPS());
    }, 1000);
    ros = this.$ROS;
    if (ros.socket && ros.socket.readyState == 1) {
      srv = new ROSLIB.Service({
        ros: ros,
        name: "/robot_service",
        serviceType: "robot_service/RobotService"
      });
      let req = {
        name: "findMap",
        arg: ""
      };
      srv.callService(req, res => {
        if (res.code == 0) {
          this.$message({
            message: res.msg,
            type: "success"
          });
          this.mapList = res.list
            .sort()
            .filter((x, index) => index % 2 == 1)
            .map(x => {
              let item = x.slice(0, x.indexOf("."));
              return { value: item, label: item };
            });
        } else {
          this.$message({
            message: res.msg,
            type: "error"
          });
        }
      });
    } else {
      this.$message({
        message: "请前往设置页面设置正确的url",
        type: "error"
      });
      this.$router.push({
        name: "Setting"
      });
    }
  },
  methods: {
    deleteVirtualWall() {
      this.nav.virtualWall.forEach(x => viewer.scene.removeChild(x));
      this.nav.virtualWall = [];
      this.nav.wallInfoObject = [];
      let virtual = new ROSLIB.Topic({
        ros: ros,
        name: "/virtual_costamp_layer/obsctacles", ///cmd_vel_mux/input/navi
        messageType: "custom_msgs/Obstacles"
      });
      virtual.publish(new ROSLIB.Message({ list: [] }));
      this.$message({
        message: "remove virtualwall success",
        type: "success"
      });
    },
    back() {
      if (this.nav.virtualWall.length) {
        let wall = this.nav.virtualWall.pop();
        viewer.scene.removeChild(wall);
      }
      if (this.nav.wallInfoObject.length) this.nav.wallInfoObject.pop();
    },
    backNav() {
      this.showAddWallsOptionFlag = false;
      this.nav.virtualWall.forEach(x => viewer.scene.removeChild(x));
      this.nav.virtualWall = [];
      this.nav.wallInfoObject = [];
    },
    saveAndLoadWalls() {
      let virtual = new ROSLIB.Topic({
        ros: ros,
        name: "/virtual_costamp_layer/obsctacles",
        messageType: "custom_msgs/Obstacles"
      });
      virtual.publish(
        new ROSLIB.Message({
          list: this.nav.wallInfoObject
        })
      );
      this.showAddWallsOptionFlag = false;
      this.$message({
        message: "add virtualwall success",
        type: "success"
      });
    },
    addVirtualWall() {
      this.showAddWallsOptionFlag = true;
      this.deleteVirtualWall();
    },
    getPath(flag) {
      if (flag) {
        // 获取path的主题
        ros.getTopicsForType(
          "nav_msgs/Path",
          res => {
            this.pathList = res.map(x => {
              return { value: x, label: x };
            });
          },
          e => {
            console.log(e);
          }
        );
      }
    },
    startNav() {
      this.loadingFlag = true;
      navDestroyed();
      this.zoomView = null;
      this.nav = null;
      if (this.pathListener) {
        this.pathListener.unsubscribe();
        this.pathListener = null;
      }
      let req = {
        name: "startNavigation",
        arg: this.map
      };
      srv.callService(req, res => {
        if (res.code == 0) {
          this.$message({
            message: res.msg,
            type: "success"
          });
          let child = document.getElementById("navi").firstElementChild;
          child && document.getElementById("navi").removeChild(child);
          child = null;
          var rosTopic = new ROSLIB.Topic({
            ros: this.$ROS,
            name: "/map",
            messageType: "nav_msgs/OccupancyGrid",
            compression: "png"
          });
          rosTopic.subscribe(() => {
            this.loadingFlag = false;
            this.cameraShow = true;
            this.showVirtualFlag = true;
            rosTopic.unsubscribe();
          });
          this.nav = createNav(ros);
          var oldX, oldY;
          viewer.scene.on("mousedown", evt => {
            // 平移地图事件只可以在不开启方向导航以及重定位的情况下才可以
            if (
              !this.toggle &&
              !this.sendOrEstimate &&
              !this.showAddWallsOptionFlag
            ) {
              oldX = evt.stageX;
              oldY = evt.stageY;
            }
          });

          viewer.scene.on("pressmove", evt => {
            if (
              !this.toggle &&
              !this.sendOrEstimate &&
              !this.showAddWallsOptionFlag
            ) {
              evt.currentTarget.x += evt.stageX - oldX;
              evt.currentTarget.y += evt.stageY - oldY;
              oldX = evt.stageX;
              oldY = evt.stageY;
            }
          });

          viewer.scene.addEventListener("stagemousedown", evt => {
            if (
              this.toggle ||
              this.sendOrEstimate ||
              this.showAddWallsOptionFlag
            )
              this.nav._mouseEventHandler(
                evt,
                "down",
                this.sendOrEstimate,
                this.showAddWallsOptionFlag
              );
          });

          viewer.scene.addEventListener("stagemousemove", evt => {
            if (
              this.toggle ||
              this.sendOrEstimate ||
              this.showAddWallsOptionFlag
            )
              this.nav._mouseEventHandler(
                evt,
                "move",
                this.sendOrEstimate,
                this.showAddWallsOptionFlag
              );
          });

          viewer.scene.addEventListener("stagemouseup", event => {
            if (
              this.toggle ||
              this.sendOrEstimate ||
              this.showAddWallsOptionFlag
            )
              this.nav._mouseEventHandler(
                event,
                "up",
                this.sendOrEstimate,
                this.showAddWallsOptionFlag
              );
            if (this.sendOrEstimate && viewer.scene.mouseInBounds)
              this.sendOrEstimate = false;
            if (this.toggle && viewer.scene.mouseInBounds) this.toggle = false;
          });

          this.zoomView = new ROS2D.ZoomView({
            rootObject: viewer.scene,
            minScale: 1
          });
        } else {
          this.$message({
            message: res.msg,
            type: "error"
          });
        }
      });
    },
    wheel(e) {
      this.zoomView =
        this.zoomView ||
        new ROS2D.ZoomView({
          rootObject: viewer.scene,
          minScale: 1
        });
      this.zoomView.startZoom(350, 250);
      this.zoomView.zoom(e.deltaY < 0 ? 2 : 0.5);
    },
    path(value) {
      if (this.pathListener) {
        this.pathListener.unsubscribe();
        this.pathListener = null;
      }
      tfClient && tfClient.dispose();
      // 根据下拉框选中的value值来更改我们的路径监听器
      this.pathListener = new ROSLIB.Topic({
        ros: ros,
        name: value,
        messageType: "nav_msgs/Path"
      });
      var transformPos = { x: 0, y: 0 };
      var initialSet = false;
      var updatePath = (plan, transform) => {
        let fitScale = 0.1 / 3;
        if (!this.nav.planPath) {
          this.nav.planPath = new createjs.Container();
          let pathShape = new ROS2D.PathShape({
            path: plan,
            strokeSize: 3,
            scale: { x: fitScale, y: fitScale },
            strokeColor: createjs.Graphics.getRGB(94, 82, 125, 0.7)
          });
          viewer.scene.addChild(this.nav.planPath);
          this.nav.planPath.addChild(pathShape);
          this.nav.planPath.scaleX = fitScale;
          this.nav.planPath.scaleY = fitScale;
        } else {
          if (viewer.scene.getChildIndex(this.nav.planPath) == -1)
            viewer.scene.addChild(this.nav.planPath);
          let pathShape = this.nav.planPath.children[0];
          pathShape.setPath(plan, transform, { x: fitScale, y: fitScale });
        }

        this.nav.planPath.cache(-1000, -1000, 2000, 2000);
        //路径存在一个显示区域，一个方向上极限大小就是 1000 * fitcache = 30
        //也就是说在x或者y坐标超过30m的时候将没办法显示路径
      };
      this.pathListener.subscribe(plan => {
        if (plan.poses && plan.poses.length > 5) {
          if (!initialSet && /local/.test(value)) {
            tfClient = new ROSLIB.TFClient({
              ros: this.$ROS,
              fixedFrame: "odom",
              angularThres: 0.01,
              transThres: 0.01
            });
            tfClient.subscribe("map", tf => {
              transformPos = {
                x: tf.translation.x,
                y: tf.translation.y
              };
            });
            initialSet = true;
          }
          updatePath(plan, transformPos);
        }
      });
    }
  },
  destroyed() {
    clearInterval(id);
    let req = {
      name: "killNavigation",
      arg: ""
    };
    srv && (srv.isAdvertised = true);
    srv = null;
    let endSrv = new ROSLIB.Service({
      ros: ros,
      name: "/robot_service",
      serviceType: "robot_service/RobotService"
    });
    endSrv.callService(req, res => {
      if (res.code == -1) {
        this.$message({
          message: res.msg,
          type: "error"
        });
      } else {
        this.$message({
          message: res.msg,
          type: "success"
        });
      }
    });
    navDestroyed();
    this.zoomView = null;
    this.nav = null;
    if (this.pathListener) {
      this.pathListener.unsubscribe();
      this.pathListener = null;
    }
    tfClient && tfClient.dispose();
  }
};
</script>
