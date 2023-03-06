import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import ElementUI from "element-ui";
import "element-ui/lib/theme-chalk/index.css";
import { ros } from "./state/store";
import { ROS2D } from "./js/ROS2D";
import global_ from "./components/Global"
import VueCookies from 'vue-cookies'
window.ROS2D = ROS2D;

Vue.config.productionTip = false;
Vue.use(VueCookies)
Vue.use(ElementUI);
Vue.prototype.$ROS = ros;
Vue.prototype.$URL = "";
Vue.prototype.$GLOBAL = global_

new Vue({
  router,
  render: h => h(App)
}).$mount("#app");
