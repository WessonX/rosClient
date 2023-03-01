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
      robotId: ""
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
  },
  methods: {
    setConnect() {
      if (this.addrOrId) {
        if (/[0-9a-zA-Z]+/.test(this.robotId)) {
          let id = this.robotId;
          let localUrl = "ws://127.0.0.1:9000";
          fetch("http://localhost:4658/admin/connect", {
            method: "POST",
            mode: "cors",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              entity: { id: id },
              clientURI: localUrl
            })
          })
            .then(res => res.json())
            .then(json => {
              if (json.code === 200) {
                this.$message({
                  message: json.msg,
                  type: "error"
                });
                this.ShowUrl = localUrl;
                this.$ROS.close();
                this.$ROS.connect(this.ShowUrl);
                this.$emit("childUrl", this.ShowUrl.slice(5));
                sessionStorage.setItem("store", this.ShowUrl);
              } else {
                this.$message({
                  message: json.msg,
                  type: "error"
                });
              }
            })
            .catch(e => console.log(e));
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
