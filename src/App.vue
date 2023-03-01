<template>
  <div id="app" style="height:100vh">
    <!-- 主容器 -->
    <el-container class="main-container" display="flex">
      <!-- 标题 -->
      <el-header>
        <img src="./img/robot.jpg" />
        <div class="tag">
          <el-dropdown :hide-on-click="false">
            <img src="./img/scan.jpg" />
            <el-dropdown-menu>
              <el-form
                v-show="dropDownFlag"
                ref="form"
                :model="sizeForm"
                label-width="50px"
                size="mini"
              >
                <div class="dropForm">
                  <el-form-item label="SSID1"
                    ><el-input v-model="sizeForm.name1"></el-input
                  ></el-form-item>
                  <el-form-item label="密钥"
                    ><el-input
                      v-model="sizeForm.password1"
                      show-password
                    ></el-input
                  ></el-form-item>
                </div>
                <div class="dropForm">
                  <el-form-item label="SSID2"
                    ><el-input v-model="sizeForm.name2"></el-input
                  ></el-form-item>
                  <el-form-item label="密钥"
                    ><el-input
                      v-model="sizeForm.password2"
                      show-password
                    ></el-input
                  ></el-form-item>
                </div>
                <div class="dropForm">
                  <el-form-item label="地址"
                    ><el-input v-model="sizeForm.addr"></el-input
                  ></el-form-item>
                  <div id="hideWifi">
                    <el-checkbox v-model="sizeForm.hidden1"
                      >1为隐藏wifi</el-checkbox
                    >
                    <el-checkbox v-model="sizeForm.hidden2"
                      >2为隐藏wifi</el-checkbox
                    >
                  </div>
                </div>
                <div class="dropFormBottom">
                  <el-form-item>
                    <el-checkbox v-model="sizeForm.flag"
                      >清空小车原有配置</el-checkbox
                    >
                    <el-button type="primary" @click="onGenerate"
                      >立即生成</el-button
                    >
                    <el-button>取消</el-button>
                  </el-form-item>
                </div>
              </el-form>
              <div id="qrcode" v-if="!dropDownFlag">
                <vue-qr :text="code" :logoSrc="imageUrl" :size="400"></vue-qr>
                <el-button
                  type="primary"
                  @click="reGenerate"
                  style="width:100px"
                  >重新生成</el-button
                >
              </div>
            </el-dropdown-menu>
          </el-dropdown>
          <el-tag effect="dark" type="info">
            {{ url }}
          </el-tag>
          <span
            ><el-tag :type="tag">{{ Status }}</el-tag>
          </span>
        </div>
      </el-header>
      <!-- 包含路由和路由界面的容器 -->
      <el-container>
        <!-- 路由 -->
        <el-aside id="nav" width="150px" height="500px">
          <el-menu
            class="el-menu-vertical-demo"
            :default-active="$route.path"
            router
          >
            <el-menu-item-group>
              <router-link to="/"
                ><el-menu-item
                  ><i class="el-icon-menu"></i><span>首页</span></el-menu-item
                ></router-link
              >
              <router-link to="/setting"
                ><el-menu-item
                  ><i class="el-icon-setting"></i
                  ><span slot="title">设置</span></el-menu-item
                ></router-link
              >
              <router-link to="/drawing"
                ><el-menu-item
                  ><i class="el-icon-picture"></i
                  ><span slot="title">建图</span></el-menu-item
                ></router-link
              >
              <router-link to="/navigation"
                ><el-menu-item
                  ><i class="el-icon-s-promotion"></i
                  ><span slot="title">导航</span></el-menu-item
                ></router-link
              >
              <router-link to="/camera"
                ><el-menu-item
                  ><i class="el-icon-camera-solid"></i
                  ><span slot="title">相机</span></el-menu-item
                ></router-link
              >
              <router-link to="/topic"
                ><el-menu-item
                  ><i class="el-icon-more-outline"></i
                  ><span slot="title">话题展示</span></el-menu-item
                ></router-link
              >
            </el-menu-item-group>
            <el-switch v-model="isCollapse" @change="handleChange"></el-switch>
            <div class="block">
              <el-slider
                v-model="maxspeed"
                :step="0.1"
                :min="0.1"
                :max="1.0"
                style="width:80%;"
                >maxspeed</el-slider
              >
            </div>
          </el-menu>
          <div id="stick"></div>
        </el-aside>
        <!-- 路由页面 -->
        <el-main>
          <router-view @childUrl="appUrl" />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script>
import { createjoystick, destroyjoystick, move } from "./components/joystick";
import vueQr from "vue-qr";
export default {
  components: {
    vueQr
  },
  data() {
    return {
      isCollapse: true,
      maxspeed: 0.3,
      url: "0.0.0.0",
      Status: "checking...",
      tag: "info",
      intervalID: -1,
      sizeForm: {
        name1: "",
        password1: "",
        hidden1: false,
        name2: "",
        password2: "",
        hidden2: false,
        addr: "",
        flag: false
      },
      checked: false,
      imageUrl: require("./img/robot2.jpg"),
      dropDownFlag: true
    };
  },
  mounted() {
    [...document.getElementsByTagName("input")].slice(0, -1).forEach(x => {
      x.onkeydown = e => {
        if (e.stopPropagation) e.stopPropagation();
        else e.cancelBubble = true;
      };
    });
    let url = sessionStorage.getItem("store");
    if (url) {
      this.$URL = url;
      this.url = url.slice(5);
      this.$ROS.close();
      this.$ROS.connect(url);
      this.$ROS.on("close", () => {
        this.$message({
          message: "机器人连接已经断开,请检查后重新连接",
          type: "error"
        });
        if (this.$router.history.current.name != "Setting")
          this.$router.push({
            name: "Setting"
          });
      });
    }
    // 循环检测连接状态并更新
    const state = { 0: "CONNECTING", 1: "OPEN", 2: "CLOSING", 3: "CLOSED" };
    const tag = { 0: "info", 1: "success", 2: "warning", 3: "danger" };
    this.intervalID = setInterval(() => {
      console.log("i am only one.");
      if (this.$ROS.socket && this.$ROS.socket.readyState) {
        if (this.Status != state[this.$ROS.socket.readyState]) {
          this.Status = state[this.$ROS.socket.readyState];
          this.tag = tag[this.$ROS.socket.readyState];
        }
      }
    }, 1500);
    createjoystick(this.$ROS);
    // 闭包访问速度
    document.onkeydown = e => {
      //事件对象兼容
      let e1 =
        e || event || window.event || arguments.callee.caller.arguments[0];
      //键盘按键判断:左箭头-37;上箭头-38；右箭头-39;下箭头-40
      //w 87;a 65;s 83;d 68
      if ((e1 && e1.keyCode == 37) || e1.keyCode == 65) {
        console.log("left");
        move(0, this.maxspeed);
      } else if ((e1 && e1.keyCode == 38) || e1.keyCode == 87) {
        console.log("up");
        move(this.maxspeed, 0);
      } else if ((e1 && e1.keyCode == 39) || e1.keyCode == 68) {
        console.log("right");
        move(0, -this.maxspeed);
      } else if ((e1 && e1.keyCode == 40) || e1.keyCode == 83) {
        console.log("down");
        move(-this.maxspeed, 0);
      } else if (e1 && e1.keyCode == 90) {
        move(0, 0);
      }
    };
  },
  computed: {
    code() {
      let str = {
        data: [
          "netcfg",
          Date.now(),
          this.sizeForm.flag,
          [
            [
              this.sizeForm.name1,
              this.sizeForm.password1,
              this.sizeForm.hidden1
            ],
            [
              this.sizeForm.name2,
              this.sizeForm.password2,
              this.sizeForm.hidden2
            ]
          ],
          this.sizeForm.addr
        ]
      };
      return JSON.stringify(str);
    }
  },
  methods: {
    handleChange() {
      // 根据开关值显示或者销毁手柄
      console.log("isCollapse:" + this.isCollapse);
      if (this.isCollapse) {
        createjoystick(this.$ROS);
      } else {
        destroyjoystick();
      }
    },
    appUrl(value) {
      this.url = value;
    },
    onGenerate() {
      this.dropDownFlag = false;
    },
    reGenerate() {
      this.dropDownFlag = true;
    }
  },
  destroyed() {
    this.$ROS.close();
    this.$ROS = null;
    clearInterval(this.intervalID);
  }
};
</script>

<style>
#hideWifi {
  width: calc(10vw + 50px);
}
#qrcode {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.dropForm {
  display: flex;
  justify-content: space-between;
  padding-left: 5px;
}
.dropForm .el-input {
  width: 10vw;
}
.dropFormBottom .el-checkbox {
  width: calc(10vw + 50px);
}
.el-form-item:nth-child(2) {
  margin-right: 50px;
}
/* .el-form-item {
  display: flex;
  align-items: center;
} */
.el-dropdown-link {
  cursor: pointer;
  color: #409eff;
}
.el-icon-arrow-down {
  font-size: 12px;
}
.el-dropdown-menu__item {
  height: 50px;
}
.el-dropdown-menu__item:hover {
  background-color: #fff;
}
.tag {
  display: flex;
  align-items: center;
}
body {
  margin: 0;
  padding: 0;
}
a {
  text-decoration: none;
}
#app {
  font-family: "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", SimSun, sans-serif;
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.el-header {
  box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.05);
  -webkit-box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.05);
  transition: background-color 0.3s ease-in-out;
  background-color: #fff;
  border-bottom: 1px solid #dcdfe6;
  width: 100%;
  display: flex;
  justify-content: space-between;
}
.el-header img {
  height: 58px;
}
.tag img {
  height: 40px;
  margin-right: 5px;
  transition: all 0.5s;
}
.tag img:hover {
  transform: scale(1.3);
}
.el-container {
  height: calc(100% - 60px);
}
.el-aside {
  background-color: #fff;
  color: #d3dce6;
  text-align: center;
  line-height: 125px;
}
.el-main {
  background-color: #e9eef3;
  color: #333;
}
.main-container {
  display: flex;
  justify-content: space-between;
  height: 100%;
}
</style>
