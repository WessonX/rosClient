保证已经安装最新版的nodejs的情况下：


## 第一步:项目依赖安装
```
npm install
```
## 第二步:安装vue-cli
```
npm install -g @vue/cli
```
## 第三步：本地运行运行
```
npm run serve
```
保证操作系统已经安装好ROS以及src下拥有gmapping和navigation的launch文件

## 安装rosBridge及其他相关依赖
```
sudo apt-get update
sudo apt-get install ros-kinetic-rosbridge-suite ros-kinetic-tf2-web-republisher ros-kinetic-genpy 

# 工作空间下
git clone https://gitee.com/heavyyang/virtual-wall.git
```

## 在工作空间文件夹下运行 catkin_make

## 修改导航包param下costmap2d的costmap_common_params.yaml配置
```
尾部添加
virtual_layer:
  enabled:              true
  zone_topics:          [/virtual_costamp_layer/zone]
  obstacle_topics:      [/virtual_costamp_layer/obsctacles]
  one_zone:             true 

```
## 修改导航包param下costmap2d的local_costmap_params.yaml配置
```
plugins项添加
- {name: virtual_layer, type: "virtual_costmap_layer::VirtualLayer"}

```

# 实际操作流程
1. 启动远程控制
```
ssh @（小车的ip地址）
```

2. 注意检查~/.bashrc文件：
对于小车上文件，x.x都为小车实际IP地址。
```
export ROS_MASTER_URI=http://192.168.x.x:11311  
export ROS_HOSTNAME=192.168.x.x
```

对于PC上文件,x.x都为小车实际IP地址,y.y为PC机实际地址。
```
export ROS_MASTER_URI=http://192.168.x.x:11311  
export ROS_HOSTNAME=192.168.y.y
```


# issue
有关service的调用，如话题展示，路径下拉框等，在rosbridge出现
```
DeserializationError cannot deserialize: unknown error handler name 'rosmsg' 
```
时
```
sudo apt-get install ros-kinetic-genpy
```
如果要使用rosapi(服务调用相关)，则需要重启rosbridge或者运行以下命令：
```
rosrun rosapi rosapi_node
```
如果要使用机器人的tf相关信息，则需要安装：
```
sudo apt-get install ros-kinetic-tf2-web-republisher
```