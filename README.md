# sockjs-client-tool
[![Build](https://github.com/Samler-Lee/sockjs-client-tool/actions/workflows/build.yml/badge.svg)](https://github.com/Samler-Lee/sockjs-client-tool/actions/workflows/build.yml)
[![Pages Deploy](https://github.com/Samler-Lee/sockjs-client-tool/actions/workflows/pages-deploy.yml/badge.svg)](https://github.com/Samler-Lee/sockjs-client-tool/actions/workflows/pages-deploy.yml)
[![CodeQL](https://github.com/Samler-Lee/sockjs-client-tool/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/Samler-Lee/sockjs-client-tool/actions/workflows/github-code-scanning/codeql)

一个基于sockjs的websocket调试工具

## 特性
- 支持SockJS连接
- 支持多订阅区分显示
- 支持Headers动态设置

## 在线使用地址
[http://ws-tool.samler.cn](http://ws-tool.samler.cn)

## 离线版本
离线版本需要您的设备中已安装Node.js环境，如未安装，请先安装Node.js，或是直接使用在线版本。

### 下载或Clone本项目
```shell
git clone https://github.com/Samler-Lee/sockjs-client-tool.git
```
或
```shell
git clone git@github.com:Samler-Lee/sockjs-client-tool.git
```

### 到项目路径中安装依赖
```shell
npm i
```

### 运行项目
```shell
npm run dev
```

### 构建项目（可选）
```shell
npm run build
```
或
```shell
npm run build-only
```

## 技术栈
[Vue 3](https://vuejs.org)、[element-plus](https://element-plus.org/)、[sockjs-client](https://github.com/sockjs/sockjs-client)、[stompjs](https://github.com/jmesnil/stomp-websocket)

## 许可证
[MIT](https://opensource.org/licenses/MIT)