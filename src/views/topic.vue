<template>
  <el-table :data="tableData" style="width: 100%">
    <el-table-column type="selection" width="55"> </el-table-column>
    <el-table-column prop="name" label="name" width="180"> </el-table-column>
    <el-table-column prop="type" label="type" width="180"> </el-table-column>
    <el-table-column prop="value" label="value"> </el-table-column>
  </el-table>
</template>

<script>
/* eslint-disable no-undef */
var ros;
export default {
  data() {
    return {
      tableData: []
    };
  },
  created() {
    ros = this.$ROS;
    var tfClient = new ROSLIB.TFClient({
      ros: ros,
      fixedFrame: "world",
      angularThres: 0.01,
      transThres: 0.01
    });

    // Subscribe to a turtle.
    tfClient.subscribe("odom", function(tf) {
      console.log(tf);
    });
    ros.getTopics(
      res => {
        res.topics.forEach((item, index) => {
          this.tableData.push({
            name: item,
            type: res.types[index],
            value: ""
          });
        });
        console.log(this.tableData);
      },
      e => {
        console.log(e);
      }
    );
  },
  destroyed() {
    ros.close();
    ros = null;
  }
};
</script>
