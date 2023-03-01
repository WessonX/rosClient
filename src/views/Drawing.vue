<template>
  <div class="about">
    <el-card class="box-card" shadow="always">
      <el-alert
        title="wsad上下左右移动机器人来创建您的地图，z停止"
        type="warning"
        description="记得输入保存您的地图哦"
        show-icon
      >
      </el-alert>
      <label
        ><div class="label">
          保存地图：<el-input v-model="mapName" class="drawInput"></el-input
          ><el-button @click="save()">保存</el-button>
          <el-tag type="info">{{ "FPS:" + fps }}</el-tag>
        </div></label
      >
      <div v-loading="flag" id="map" @wheel.stop.prevent="wheel"></div>
    </el-card>
    <Camera />
  </div>
</template>

<script>
/* eslint-disable no-undef */
import { createView, drawDestroyed, viewer } from "../components/draw";
import Camera from "./Camera.vue";
let srv;
let id;
export default {
  components: {
    Camera
  },
  data() {
    return {
      Status: "",
      zoomView: null,
      mapName: "",
      flag: true,
      fps: 0
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
    // 开启建图进程
    if (this.$ROS.socket && this.$ROS.socket.readyState == 1) {
      srv = new ROSLIB.Service({
        ros: this.$ROS,
        name: "/robot_service",
        serviceType: "robot_service/RobotService"
      });
      let req = {
        name: "startGmapping",
        arg: ""
      };
      srv.callService(req, res => {
        if (res.code == 0) {
          this.$message({
            message: res.msg,
            type: "success"
          });
          var rosTopic = new ROSLIB.Topic({
            ros: this.$ROS,
            name: "/map",
            messageType: "nav_msgs/OccupancyGrid",
            compression: "png"
          });
          rosTopic.subscribe(() => {
            this.flag = false;
            rosTopic.unsubscribe();
            rosTopic = null;
          });
          createView(this.$ROS);
          // eslint-disable-next-line no-undef
          this.zoomView = new ROS2D.ZoomView({
            rootObject: viewer.scene,
            minScale: 0.1
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
    wheel(e) {
      this.zoomView =
        this.zoomView ||
        // eslint-disable-next-line no-undef
        new ROS2D.ZoomView({
          rootObject: viewer.scene,
          minScale: 1
        });
      this.zoomView.startZoom(350, 250);
      this.zoomView.zoom(e.deltaY < 0 ? 2 : 0.5);
    },
    save() {
      let req = {
        name: "saveMap",
        arg: this.mapName
      };
      srv.callService(req, res => {
        if (res.code == 0) {
          this.$message({
            message: res.msg,
            type: "success"
          });
        } else {
          this.$message({
            message: res.msg,
            type: "error"
          });
        }
      });
    }
  },
  destroyed() {
    clearInterval(id);
    let req = {
      name: "killGmapping",
      arg: ""
    };
    srv && (srv.isAdvertised = true);
    let endSrv = new ROSLIB.Service({
      ros: this.$ROS,
      name: "/robot_service",
      serviceType: "robot_service/RobotService"
    });
    endSrv.callService(req, res => {
      if (res.code == -1) {
        this.$message({
          message: res.msg,
          type: "error"
        });
      }
    });
    drawDestroyed();
    this.zoomView = null;
  }
};
</script>

<style scoped>
#map {
  width: 600px;
  height: 600px;
  overflow: hidden;
}
.box-card {
  width: 700px;
}
.el-input {
  width: 20vw;
}
.label {
  margin: 5px;
}
.drawInput {
  margin: 0 5px;
}
.about {
  display: flex;
  justify-content: space-around;
  align-items: center;
}
</style>
