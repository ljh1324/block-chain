const express = require("express"),
  bodyParser = require("body-parser"),
  morgan = require("morgan"),
  Blockchain = require("./blockchain"),
  P2P = require("./p2p"),
  Wallet = require("./wallet");

const { getBlockchain, createNewBlock, getAccountBalance, } = Blockchain;
const { startP2PServer, connectToPeers } = P2P;
const { initWallet } = Wallet;

// const PORT = 3000;
// 만약 HTTP_PORT가 없을 경우 3000번 포트를 열어줌
// $env:HTTP_PORT = 4000 포트번호 설정 후 yarn dev 실행
// 다른 터미널에서는 $env:HTTP_PORT = 3000 포트번호 설정 후 yarn dev 실행 가능
const PORT = process.env.HTTP_PORT || 3000; 

console.log(process.env.HTTP_PORT);
console.log(PORT);
 
const app = express();
app.use(bodyParser.json());
app.use(morgan("combined"));

app
  .route("/blocks")
  .get((req, res) => {
    res.send(getBlockchain());
  })
  .post((req, res) => {
    //const { body : { data } } = req;
    //const newBlock = createNewBlock(data);
    const newBlock = createNewBlock();
    res.send(newBlock);
  });

app.post("/peers", (req, res) => {
  const {body: {peer} } = req;
  connectToPeers(peer);
  res.send();
});

app.get("/me/balance", (req, res) => {
  const balance = getAccountBalance();
  res.send( {balance} );
});

//app.listen(PORT, () => console.log("Nomadcoin Server running on ", PORT));
const server = app.listen(PORT, () => console.log(`Nomadcoin HTTP Server running on port ${PORT}`));


initWallet(); // 서버 개인키 초기화

// HTTP server(express server)위에 WebSocket server를 올림. 
// WebSocket은 HTTP와 프로토콜이 완전 다르기 때문에 같은 포트에서 실행될 수 있음.
startP2PServer(server); 

 