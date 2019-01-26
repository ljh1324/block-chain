// 클라이언트, 서버, 소켓을 위한 코드

const WebSockets = require("ws");
 Blockchain = require("./blockchain");

 const {getLastBlock} = Blockchain; // 가장 최근 블록 요청

// socket: 서버 사이의 커넥션
// PeerB - PeerA 연결시 PeerB에게는 PeerA 정보가 있음
const sockets = [];

// Message Types
const GET_LATEST = "GET-LATEST";
const GET_ALL = "GET_ALL";
const BLOCKCHAIN_RESPONSE = "BLOCKCHAIN_RESPONSE";

// Message Creators
const getLatest = () => {
  return {
    type: GET_LATEST,
    data: null
  };
};

const getAll = () => {
  return {
    type: GET_ALL,
    data: null
  };
};

const blockchainResponse = (data) => {
  return {
    type: BLOCKCHAIN_RESPONSE,
    data: data
  };
};

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

const initSocketConnection = ws => { // 새로운 소켓이 접속할때마다 호출
  sockets.push(ws);
  handleSocketError(ws);
  handleSocketMessages(ws);
  sendMessage(ws, getLatest()); // 새로운 소켓에게 Message Creator를 통해 GET-LATEST 메시지를 보냄
}

const parseData = data => {
  try { // data가 json으로 만듬. 만들 수 없을 경우 예외 발생.
    return JSON.parse(data); 
  } catch (e) {
    console.log(e);
    return null;
  }
}
const handleSocketMessages = ws => {
  ws.on("message", data => { // ws.send를 통해 받은 메시지를 처리함
    const message = parseData(data);
    if (message === null) {
      return;
    }
    console.log(message);
    switch(message.type) {
      case GET_LATEST:
        sendMessage(ws, getLastBlock());
        break;
    }
  });
};


const sendMessage = (ws, message) => ws.send(JSON.stringify(message));


const handleSocketError = ws => { // 소켓에 에러 발생 혹은 커넥션 종료 시 처리할 이벤트 등록
  const closeSocketConnection = ws => {
    ws.close();
    sockets.splice(sockets.indexOf(ws), 1);
  };
  ws.on("close", () => closeSocketConnection(ws)); // 닫을 때 발생하는 이벤트에 대한 함수 추가
  ws.on("error", () => closeSocketConnection(ws));
};

const connectToPeers = newPeer => { // newPeer = 웹 소켓 서버가 실행되고 있는 URL
  const ws = new WebSockets(newPeer);
  ws.on("open", () => { // ws의 소켓을 열어줌. socket connection 실행. 새로운 소켓이 연결될 때 실행
    console.log('Open Socket!'); // 특정 소켓서버에 연결을 한 서버에게 보여짐. 즉, 자기 자신의 콘솔에 보임
    initSocketConnection(ws);
  });
};

module.exports = {
  startP2PServer,
  connectToPeers,
};