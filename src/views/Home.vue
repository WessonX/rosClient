<template>
  <div class="home">
    <el-card class="box-card" shadow="always">
      <div>
        <el-tag>四元数</el-tag>
        <el-table :data="odomData" style="width: 100%">
          <el-table-column prop="name" label="轴" width="180">
          </el-table-column>
          <el-table-column prop="value" label="值"> </el-table-column>
        </el-table>
      </div>
    </el-card>

    <el-card class="box-card" shadow="always">
      <el-tag>连接状态</el-tag>
      <div id="ShowUrl">
        <span>当前连接地址: {{ ShowUrl }}</span>
      </div>
      <div id="ShowStatus">
        <span>当前连接状态: {{ ShowStatus }}</span>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  data: function() {
    return {
      ShowUrl: "",
      ShowStatus: "",
      odomData: [
        {
          name: "ox",
          value: ""
        },
        {
          name: "oy",
          value: ""
        },
        {
          name: "oz",
          value: ""
        },
        {
          name: "ow",
          value: ""
        }
      ]
    };
  }
};
</script>

<style>
.home {
  width: 100%;
}
</style>
