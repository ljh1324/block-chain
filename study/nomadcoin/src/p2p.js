// 클라이언트, 서버, 소켓을 위한 코드

const WebSockets = require("ws");

// socket: 서버 사이의 커넥션
// PeerB - PeerA 연결시 PeerB에게는 PeerA 정보가 있음
const sockets = [];

const getSockets = () => sockets;

const startP2PServer =  server => {
  const wsServer = new WebSockets.Server({server}); // WebSocket 서버 생성
  wsServer.on("connection", ws => { // 누군가 나의 웹 서버 소켓과 연결하면
    //console.log(`Hello ${ws}`); // 내 서버에 접속된 web socket을 출력
    console.log(`Hello Socket!`);
    initSocketConnection(ws);
  });
  console.log('Nomadcoin P2P Server Running!');
};

const initSocketConnection = socket => { // 새로운 소켓이 접속할때마다 보여짐
  sockets.push(socket);
  //console.log(sockets);
  socket.on("message", data => {
    console.log(data);
  });
  setTimeout(() => {
    socket.send('Welcome');
  }, 5000);
}

const connectToPeers = newPeer => { // newPeer = 웹 소켓 서버가 실행되고 있는 URL
  const ws = new WebSockets(newPeer);
  ws.on("open", () => { // ws의 소켓을 열어줌. socket connection 실행. 새로운 소켓이 연결될 때 실행
    console.log('Open Socket!');
    initSocketConnection(ws);
  });
};

module.exports = {
  startP2PServer,
  connectToPeers,
};