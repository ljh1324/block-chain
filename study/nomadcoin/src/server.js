const express = require("express"),
 bodyParser = require("body-parser"),
 morgan = require("morgan"),
 Blockchain = require("./blockchain");

 const {getBlockchain, createNewBlock } = Blockchain;

 //const PORT = 3000;
 // 환경변수 HTTP_PORT와 3000포트를 함께 열어줌 두 개의 포트로 열린 서버는 완전히 다른 서버
const PORT = process.env.HTTP_PORT || 3000; 

 const app = express();
 app.use(bodyParser.json());
 app.use(morgan("combined"));

 app.get("/blocks", (req, res) => {
   res.send(getBlockchain());
 });


 app.post("/blocks", (req, res) => {
   const { body : { data } } = req;
   const newBlock = createNewBlock(data);
   res.send(newBlock);
 });

 //app.listen(PORT, () => console.log("Nomadcoin Server running on ", PORT));
 app.listen(PORT, () => console.log(`Nomadcoin Server running on ${PORT}`));