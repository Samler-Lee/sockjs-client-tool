<template>
  <div class="container">
    <el-card class="server-card">
      <div class="server">
        <el-input class="server-input" size="large" placeholder="e.g. http://localhost:8080/ws" v-model="wsHost" />
        <el-button class="connect-btn" type="primary" size="large" :loading="connecting" @click="connectServer"
          v-if="!isConnected">
          连接
        </el-button>
        <el-button class="connect-btn" type="danger" size="large" @click="disconnectServer" v-else>
          断开
        </el-button>
      </div>
    </el-card>
    <el-card class="logs-card">
      <div class="logs">
        <el-container>
          <el-aside width="15rem" height="100%">
            <el-menu :default-active="currentTopic" @select="changeCurrentTopic">
              <el-menu-item v-for="item in topic" :key="item.topic" :index="item.topic">
                <div class="menu-item">
                  <div class="title">{{ item.name }}</div>
                  <el-tag round effect="dark" style="margin-left: .5rem" v-if="item.unread > 0">{{ item.unread }}</el-tag>
                </div>
              </el-menu-item>
            </el-menu>
          </el-aside>
          <el-main>
            <div class="messages">
              <el-scrollbar height="100%" ref="mainScrollRef">
                <div ref="mainInnerRef">
                  <div
                    class="item"
                    v-for="(item, index) in currentTopic === topic[0].topic ? globalMessage : (messages[currentTopic] ?? globalMessage)"
                    :key="index"
                  >
                    <p class="time" :style="{color: `var(--el-color-${item.type ?? 'info'})`}">{{ item.time }}</p>
                    <p class="content" :style="{color: `var(--el-color-${item.type ?? 'info'})`}">{{ item.content }}</p>
                  </div>
                </div>
              </el-scrollbar>
            </div>

            <div class="toobar">
              <el-button text type="primary" @click="clearTopicMessage">清空日志</el-button>
              <el-button text type="danger" @click="deleteTopic" v-if="currentTopic !== topic[0].topic">删除该订阅</el-button>
            </div>
          </el-main>
        </el-container>
      </div>
    </el-card>
    <el-card class="console-card">
      <div class="console">
        <el-space style="margin-bottom: .5rem;">
          <el-button type="primary" text @click="subscribeTopicDialogVisible = true">添加订阅</el-button>
          <el-button type="primary" text @click="headerSettingDialogVisible = true">设置Headers</el-button>
        </el-space>

        <el-space direction="vertical" wrap style="width: 100%" fill>
          <el-input class="destination-input" type="text" placeholder="请求路径" v-model="sendMessageForm.destination"></el-input>
          <el-input class="message-input" type="textarea" :autosize="{ minRows: 5 }" placeholder="想要发送的数据" v-model="sendMessageForm.messageContent"></el-input>
          <el-button class="message-btn" type="primary" size="large" @click="sendMessage">发送</el-button>
        </el-space>
      </div>
    </el-card>
  </div>

  <el-dialog v-model="subscribeTopicDialogVisible" title="添加订阅">
    <el-form>
      <el-form-item>
        <el-input v-model="subscribeTopicForm.topic" placeholder="Topic ID"></el-input>
      </el-form-item>
      <el-form-item>
        <el-input v-model="subscribeTopicForm.name" placeholder="别称（可选）"></el-input>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="subscribeTopicDialogVisible = false">
        取消
      </el-button>
      <el-button type="primary" @click="subscribeTopic">
        添加
      </el-button>
    </template>
  </el-dialog>

  <el-dialog class="header-setting-dialog" v-model="headerSettingDialogVisible" title="设置Headers">
    <el-form>
      <el-form-item v-for="(item, index) in headers" :key="index">
        <el-space class="item" spacer=" : ">
          <el-input v-model="item.key" placeholder="Header Key"></el-input>
          <el-input v-model="item.val" placeholder="Header Value"></el-input>
        </el-space>
        <el-button type="danger" text @click="removeHeader(item.key)">删除</el-button>
      </el-form-item>
      <el-form-item>
        <div class="add-header" @click="newHeader">添加键值对</div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button type="primary" @click="headerSettingDialogVisible = false">
        完成
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { ElScrollbar } from "element-plus"
import SockJS from "sockjs-client/dist/sockjs.min.js"
import Stomp from "stompjs"
import { ref, nextTick, onMounted } from "vue"

const wsHost = ref("")
const socket = ref<WebSocket | null>(null)
const stompClient = ref<Stomp.Client | null>(null)
const connecting = ref(false)
const isConnected = ref(false)
const headers = ref<WSHeadersOrigin[]>([])

const mainScrollRef = ref<InstanceType<typeof ElScrollbar>>()
const mainInnerRef = ref<HTMLDivElement>()
const logsToBottom = () => {
  nextTick(() => {
    mainScrollRef.value!.setScrollTop(mainInnerRef.value!.clientHeight)
  })
}

const globalMessage = ref<TopicMessage[]>([])
const messages = ref<TopicMessageSet>({})
const pushGlobalMessage = (content: string, type?: TopicMessage["type"]) => {
  globalMessage.value.push({ time: new Date().toLocaleString(), content, type })
  if (currentTopic.value === topic.value[0].topic) {
    logsToBottom()
  }
}

const convertHeaders = () => {
  return headers.value.reduce((p: WSHeaders, c: WSHeadersOrigin) => {
    p[c.key] = c.val
    return p;
  }, {})
}

const checkServerConnected = () => {
  const connected = isConnected.value && stompClient.value != null
  if (!connected) {
    ElNotification.error({
      type: 'error',
      title: "服务器未连接",
      message: "请先连接服务器，再尝试此操作"
    })
  }

  return connected
}

const connectServer = () => {
  const host = wsHost.value
  if (host.length === 0) {
    pushGlobalMessage('请输入正确的地址', 'warning')
    return false
  }

  connecting.value = true
  try {
    socket.value = new SockJS(host)
    stompClient.value = Stomp.over(socket.value)

    pushGlobalMessage(`${host} 正在连接...`)
    stompClient.value.connect({}, (frame: any) => {
      connecting.value = false
      isConnected.value = true

      pushGlobalMessage(`${host} 连接成功`, 'success')
    }, (error: any) => {
      pushGlobalMessage(`${host} 连接失败: ${error}`, 'danger')
      connecting.value = false
      isConnected.value = false
    })
  } catch (e: any) {
    pushGlobalMessage(`${host} 连接时出现错误: ${e}`, 'danger')
    connecting.value = false
    isConnected.value = false
  }
}

const disconnectServer = () => {
  if (checkServerConnected()) {
    stompClient.value!.disconnect(() => {
      isConnected.value = false
      pushGlobalMessage('已断开连接')
    });
  }
}

const sendMessageForm = ref({
  destination: "",
  messageContent: "",
})
const sendMessage = () => {
  if (checkServerConnected()) {
    stompClient.value!.send(sendMessageForm.value.destination, convertHeaders(), sendMessageForm.value.messageContent);
    pushGlobalMessage(`发送消息 ${sendMessageForm.value.destination ? `[${sendMessageForm.value.destination}]` : ''}: ${sendMessageForm.value.messageContent}`)
  }
}

const topic = ref([
  { name: "全局消息", topic: '#ws-test-global', unread: 0 },
])
const currentTopic = ref(topic.value[0].topic)

const changeCurrentTopic = (key: string) => {
  currentTopic.value = key
  topic.value.filter(item => item.topic === key)[0].unread = 0
  logsToBottom()
}

const subscribeTopicForm = ref({
  name: "",
  topic: "",
})
const subscribeTopicDialogVisible = ref(false)
const subscribeTopic = () => {
  if (checkServerConnected()) {
    if (subscribeTopicForm.value.topic.length === 0) {
      ElMessage.error("请输入Topic ID")
      return false
    }

    const topicId = subscribeTopicForm.value.topic
    stompClient.value!.subscribe(topicId, msg => {
      console.log(topicId, msg)
      messages.value[topicId].push({ time: new Date().toLocaleString(), content: msg.body })

      // 日志滚动到底部，或是记录未读消息数量
      if (currentTopic.value === topicId) {
        logsToBottom()
      } else {
        console.log(topic.value.filter(item => item.topic === topicId))
        topic.value.filter(item => item.topic === topicId)[0].unread++
      }
    }, convertHeaders())

    topic.value.push({
      name: subscribeTopicForm.value.name.length === 0 ? subscribeTopicForm.value.topic : subscribeTopicForm.value.name,
      topic: subscribeTopicForm.value.topic,
      unread: 0
    })
    messages.value[subscribeTopicForm.value.topic] = []
    globalMessage.value.push({ time: new Date().toLocaleString(), content: `订阅 ${subscribeTopicForm.value.topic}` })

    subscribeTopicForm.value.name = ""
    subscribeTopicForm.value.topic = ""
  }

  subscribeTopicDialogVisible.value = false
}


const headerSettingDialogVisible = ref(false)
const newHeader = () => {
  headers.value.push({ key: "", val: "" })
}

const removeHeader = (key: string) => {
  headers.value = headers.value.filter(item => item.key !== key)
}

const clearTopicMessage = () => {
  if (currentTopic.value === topic.value[0].topic) {
    globalMessage.value = []
  } else {
    messages.value[currentTopic.value] = []
  }
}

const deleteTopic = () => {
  const topicId = currentTopic.value
  let idx = 0
  topic.value = topic.value.filter((item, index) => {
    const match = item.topic !== topicId
    if (!match) {
      idx = index
    }
    return match
  })

  if (checkServerConnected()) {
    stompClient.value!.unsubscribe(topicId);
    globalMessage.value.push({ time: new Date().toLocaleString(), content: `取消订阅 ${topicId}` })
    currentTopic.value = topic.value[idx - 1].topic
  }
}

onMounted(() => {
  pushGlobalMessage("欢迎使用SockJS在线测试工具")
  pushGlobalMessage("如果在使用过程中遇到任何问题，欢迎加我QQ进行讨论：1045704373")
})
</script>

<style scoped lang="scss">
.container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  box-sizing: border-box;

  .server {
    display: flex;
    align-items: center;
    justify-content: center;

    .server-input {
      flex: 1;

      .el-input__wrapper {
        border-start-end-radius: unset;
        border-end-end-radius: unset;
      }
    }
  }

  .el-card {
    margin-bottom: 1rem;
  }

  .logs-card {
    position: relative;
    flex: 1;
    box-sizing: border-box;

    .logs {
      height: 100%;

      .el-container {
        height: 100%;

        .el-menu {
          height: 100%;

          .menu-item {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;

            .title {
              max-width: 10rem;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          }
        }

        .el-main {
          .messages {
            height: 100%;

            .item {
              margin-bottom: .5rem;
              display: flex;
              align-items: flex-start;

              p {
                margin: 0;
                font-size: .835rem;
                color: #343a40;
              }

              .time {
                margin-right: 1rem;
                white-space: nowrap;
              }

              .content {
                white-space: break-spaces;
              }
            }
          }

          .toobar {
            position: absolute;
            top: .5rem;
            right: 1rem;
          }
        }
      }
    }
  }
}

.header-setting-dialog {
  .item {
    flex: 1;
  }

  .add-header {
    cursor: pointer;
    width: 100%;
    height: 5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px dashed #dcdfe6;
    color: #868e96;
    user-select: none;
    transition: color, border-color ease .3s;

    &:hover {
      color: #868e96;
      border-color: #868e96;
    }
  }
}
</style>

<style lang="scss">
.server {
  .server-input .el-input__wrapper {
    border-start-end-radius: unset;
    border-end-end-radius: unset;
  }

  .connect-btn {
    border-start-start-radius: unset;
    border-end-start-radius: unset;

    width: 8rem;
  }

  .console {
    .message-input {
      flex: 1;
    }
  }
}

.logs-card .el-card__body {
  position: absolute;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
}

.header-setting-dialog {
  .item .el-space__item {
    flex: 1;
  }
}
</style>
