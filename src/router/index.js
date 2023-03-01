import Vue from "vue";
import VueRouter from "vue-router";
import Home from "../views/Home.vue";
import Setting from "../views/Setting";
import Drawing from "../views/Drawing";
import Navigation from "../views/Navigation";
import Camera from "../views/Camera";
import Topic from "../views/topic";

Vue.use(VueRouter);

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home
  },
  {
    path: "/setting",
    name: "Setting",
    component: Setting
  },
  {
    path: "/drawing",
    name: "Drawing",
    component: Drawing
  },
  {
    path: "/navigation",
    name: "Navigation",
    component: Navigation
  },
  {
    path: "/camera",
    name: "Camera",
    component: Camera
  },
  {
    path: "/topic",
    name: "Topic",
    component: Topic
  }
];

const router = new VueRouter({
  routes
});

export default router;
