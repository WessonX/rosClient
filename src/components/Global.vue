<script>
// 中继服务器的地址
const relayAddr = 'ws://47.112.96.50:9090'

// 本地的go代理程序的地址
const localAgent_addr = 'ws://localhost:3000/echo'
  export default
  {
    relayAddr,
    localAgent_addr
  }
</script>