<template>
  <div class="about">
    <el-card class="settingCard" shadow="always">
      <div slot="header" class="clearfix">
        <span>设置连接</span>
        <el-button
          class="card-button"
          @click="setConnect"
          type="text"
          size="medium"
          >connect</el-button
        >
      </div>
      <div class="setting">
        <el-switch
          v-model="addrOrId"
          active-text="本地ID连接"
          inactive-text="按地址连接"
          class="switch"
        >
        </el-switch>
        <div v-show="!addrOrId">
          <label>地址: </label>
          <el-input placeholder="请输入目标主机地址" v-model="inputUrl">
            <template slot="prepend">ws://</template>
          </el-input>
        </div>
        <div v-show="addrOrId">
          <label>ID: </label>
          <el-input placeholder="请输入ID" v-model="robotId"> </el-input>
        </div>
        <div v-show="!addrOrId">
          <label>端口: </label>
          <el-input placeholder="请输入目标主机端口" v-model="inputPort">
            <template slot="prepend"></template>
          </el-input>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  data: function() {
    return {
      inputUrl: "192.168.10.6",
      inputPort: "9090",
      addrOrId: false,
      robotId: "",
      socket:""
    };
  },
  mounted() {
    this.$URL = sessionStorage.getItem("store");
    if (this.$URL) {
      this.ShowUrl = this.$URL;
      this.inputUrl = this.ShowUrl.replace(/.*\/\/([0-9.]+):.*/, "$1");
      this.inputPort = this.ShowUrl.replace(/.*:([0-9]+)/, "$1");
    }
    window.addEventListener("beforeunload", () => {
      if (this.ShowUrl) sessionStorage.setItem("store", this.ShowUrl);
    });
    [...document.getElementsByTagName("input")].slice(1).forEach(x => {
      x.onkeydown = e => {
        if (e.stopPropagation) e.stopPropagation();
        else e.cancelBubble = true;
      };
    });

    // 与localAgent建立websocket连接
    this.socket = new WebSocket("ws://localhost:3000/echo");
    this.socket.onopen = function () {
        console.log("connected to localAgent");
    };
  },
  methods: {
    setConnect() {
      var that = this
      // 通过id建立连接
      if (this.addrOrId) {
        if (/[0-9a-zA-Z]+/.test(this.robotId)) {
          // 将robotID通过websocket连接，发送给localAgent
          this.socket.send(this.robotId)

          this.socket.onmessage = function (e) {
            var obj = JSON.parse(e.data)
            var isSuccess = "fail"
            isSuccess = obj.isSuccess
            var addr
            // 如果成功，则和localAgent建立连接
            if (isSuccess == "success" ) {
              addr = that.$GLOBAL.localAgent_addr
            } else {
              // 不成功，则通过frp建立ros连接
              addr = that.$GLOBAL.relayAddr
            }
            
            // 将连接状态存储到sessionStorage中
            sessionStorage.setItem("isSuccess",isSuccess)
            that.initializeRos(addr)
          }
        } else {
          this.$message({
            message: "id只允许字母与数字",
            type: "error"
          });
        }
      } else {
        if (
          /(?<=(\b|\D))(((\d{1,2})|(1\d{2})|(2[0-4]\d)|(25[0-5]))\.){3}((\d{1,2})|(1\d{2})|(2[0-4]\d)|(25[0-5]))(?=(\b|\D))/.test(
            this.inputUrl
          ) &&
          /\d+/.test(this.inputPort)
        ) {
          this.ShowUrl = "ws://" + this.inputUrl + ":" + this.inputPort;
          console.log("reset url:" + this.ShowUrl);
          this.$ROS.close();
          this.$ROS.connect(this.ShowUrl);
          this.$emit("childUrl", this.ShowUrl.slice(5));
          sessionStorage.setItem("store", this.ShowUrl);
        } else {
          this.$message({
            message: "ip地址或者端口输入错误，请重试",
            type: "error"
          });
        }
      }
    },

    // 初始化ros的连接配置
    initializeRos(addr) {
      console.log("addr:",addr)
      this.$ROS.close();
      this.$ROS.connect(addr)
    }
  }
};
</script>

<style>
.settingCard {
  width: 480px;
}

.card-button {
  float: right;
  padding: 3px;
}
.el-tag {
  margin: 5px;
}
.switch {
  margin-bottom: 5px;
}
</style>
