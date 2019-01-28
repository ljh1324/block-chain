// 클라이언트, 서버, 소켓을 위한 코드

const WebSockets = require("ws");
 Blockchain = require("./blockchain");

 const {getNewestBlock, getBlockchain, isBlockStructureValid, addBlockToChain, replaceChain} = Blockchain; // 가장 최근 블록 요청

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
        //sendMessage(ws, getLastBlock());
        sendMessage(ws, responseLatest()); // send message to all socket (port:3000 to 4000, port:4000 to 3000)
        break;
      case GET_ALL:
        sendMessage(ws, responseAll());
        break;
      case BLOCKCHAIN_RESPONSE:
        const receivedBlocks = message.data;
        if (receivedBlocks === null) {
          break;
        }
        handleBlockchainResponse(receivedBlocks);
        break;
    }
  });
};

const handleBlockchainResponse = receivedBlocks => {
  if (receivedBlocks.length === 0) {
    console.log("Received blocks have a length of 0");
    return;
  }
  const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
  if (!isBlockStructureValid(latestBlockReceived)) { // 만약 받은 블럭이 제네시스 블럭일 경우 previousHash가 null이므로 block structure가 옳바르지 않음
    console.log("The block structure of the block received is not valid");
    return;
  }
  const newestBlock = getNewestBlock(); // 자신의 가지고 있는 블록체인의 가장 최근 블록을 가져옴

  // 받은 블록 체인의 마지막 블록이 자신이 가지고 있는 블록체인 마지막 블록 보다 앞설 경우
  if (latestBlockReceived.index > newestBlock.index) {
    // 받은 블록 체인의 마지막 블록의 순서번호가 가지고 있는 최근 블록 보다 1번 앞설 경우
    // 받은 블록체인의 이전 블록을 가르키는 해시값이 가지고 있는 블록의 해시값인 경우를 체크해야함
    if (newestBlock.hash === latestBlockReceived.previousHash) {
      if (addBlockToChain(latestBlockReceived)) { // 받은 블록이 체인에 추가될 경우
        broadcastNewBlock();
      }
    }
    else if (receivedBlocks.length === 1) { // responseLatest() 함수로 받은 블록은 길이가 1임. 그러므로 모든 블록을 다시 받아와야 함
      // to do, get all the blocks, we are waaaay behind
      sendMessageToAll(getAll());
    }
    else {
      replaceChain(receivedBlocks);
    }
  }
};

const sendMessage = (ws, message) => ws.send(JSON.stringify(message));

const sendMessageToAll = message => sockets.forEach(ws => sendMessage(ws, message));

const responseLatest = () => blockchainResponse([getNewestBlock()]); 

const responseAll = () => blockchainResponse(getBlockchain());

const broadcastNewBlock = () => sendMessageToAll(responseLatest());

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
  broadcastNewBlock,
};