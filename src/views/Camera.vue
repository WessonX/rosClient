<template>
  <el-card shadow="always">
    <div slot="header" class="clearfix">
      <el-tag type="info">{{ value }}</el-tag>
    </div>
    <img id="mjpeg" width="600" height="400" />
  </el-card>
</template>
<style scoped>
.el-card {
  width: 650px;
  height: 510px;
}
</style>
<script>
let imageTopic;
export default {
  data() {
    return {
      value: "/usb_cam/image_raw/compressed"
    };
  },
  mounted() {
    let ros = this.$ROS;
    ros.getTopicsForType("sensor_msgs/CompressedImage", res => {
      res.forEach(element => {
        if (/compressed$/.test(element)) {
          this.value = element;
          console.log(element);
        }
      });
    });
    this.openCamera();
  },
  methods: {
    openCamera() {
      let ros = this.$ROS;

      let img = document.getElementById("mjpeg");
      // eslint-disable-next-line no-undef
      imageTopic = new ROSLIB.Topic({
        ros: ros,
        name: this.value,
        messageType: "sensor_msgs/CompressedImage",
        throttle_rate: 33
      });
      imageTopic.subscribe(e => {
        img.src = "data:image/jpeg;base64," + e.data;
      });
    }
  },
  destroyed() {
    imageTopic && imageTopic.unsubscribe();
  }
};
</script>
