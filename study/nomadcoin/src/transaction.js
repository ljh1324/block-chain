import { ECANCELED } from "constants";

const CryptoJS = require("crypto-js"),
  elliptic = require("elliptic"),
  utils = require("./utils");

const ec = new elliptic.ec("secp256k1");

class TxOut {
  constructor(address, amount) {
    this.address = address;
    this.amount = amount;
  }
}

class TxInput { // TxInput = 사용되지 않은 TxOut, TxInput은 TxOut이 있어야 함. 즉, TxInput = 이전 TxOutput
  // txOutId
  // txOutIndex
  // signature
}

class Transaction { // 많은 input이 output으로 변할 수 있음
  // ID
  // txIns[]
  // txOuts[]
}

class UTxOut { // 사용하지 않은 Transaction Output. uTxOut은 uTxOutId가 없음
  constructor(txOutId, txOutIndex, address, amount) {
    this.txOutId = txOutId; // 이전 txOut의 ID
    this.txOutIndex = txOutIndex; // 이전 txOut의 Index
    this.address = address;
    this.amount = amount;
  }
}

// 사용하지 않은 Transaction Output 리스트
let uTxOuts = [];

const getTxId = tx => { // tx를 모두 합쳐서 hash화
  const txInContent = tx.txIns
    .map(txIn => txIn.txOutId + txIn.txOutIndex)
    .reduce((a, b) => a + b, ""); // 모든 Id와 Index를 합침. default = ""
  
  /*
    {address: '1234', value: 50}
    {address: '1234', value: 30}
    {address: '1234', value: 20}
    =>
    ['123450', '123430', '123420']
    =>
    123450123430123420
  */
  const txOutContent = tx.txOuts
    .map(txOut => txOut.address + txOut.amount)
    .reduce((a, b) => a + b, "");

  return CryptoJS.SHA256(txInContent + txOutContent).toString();
};

/*

[{id:1}, {id:2}, {id:3}, {id:3}].find(item => item.id == 3)
=> {id: 3}

*/
const findUTxOut = (txOutId, txOutIndex, uTxOutList) => { // uTxOutList에서 txOutId와 txOutIndex를 가지는 UTxOut을 찾음
  return uTxOutList.find(uTxOut => uTxOut.txOutId === txOutId && uTxOut.txOutIndex === txOutIndex);
}

const signTxIn = (tx, txInIndex, privateKey, uTxOut) => { // 특정 거래에 대한 증명
  const txIn = tx.txIns[txInIndex]; // 거래 input의 txInIndex번째 input을 가져옴
  const dataToSign = tx.id;
  // To Do: Find Tx
  const referencedUTxOut = findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOuts);
  
  if (referencedUTxOut === null) { // 사용할 돈이 없음
    return;
  }

  const key = ec.keyFromPrivate(privateKey, "hex");
  const signature = utils.toHexString(key.sign(dataToSign).toDER()); // key를 사용하여 서명
  return signature;
}

// 트랜잭션은 새로운 transaction ouput을 만들 수 있으며
// 어떠한 unspent transaction ouput을 끝내기도 함
// 그래서 새로운 transaction ouput과 unspent transaction output을 가져와야함
const updateUTxOuts = (newTxs, uTxOutList) => {

  /*
  [A(40), B, C, D, E, F]

  input                       output
  A(40) ---> Transaction ---> ZZ(10)
                         ---> MM(30)

  input => spentTxOuts
  output => newUTxOuts
  */


  // transaction의 id, 순서번호 index, txOut의 address, amount를 통해 UTxOut을 만듬
  const newUTxOuts = newTxs.map(tx => { // 새로운 Transaction에서 txOuts를 이용하여 새로운 UTxOut 배열을 만들어냄
    tx.txOuts.map( (txOut, index) => { 
      new UTxOut(tx.id, index, txOut.address, txOut.amount);
    });
  })
  .reduce((a, b) => a.concat(b), []);

  const spentTxOuts = newTxs
    .map(tx => tx.txIns)
    .reduce((a, b) => a.concat(b), [])
    .map(txIn => new UTxOut(txIn.txOutId, txIn.txOutIndex, "", )); // 새로운 Transaction에서 txIn의 이전 txOut을 찾아내 UTxOut 배열로 만들어냄

  const resultingUTxOuts = uTxOutList
    .filter(uTxO => !findUTxOut(uTxO.txOutId, uTxO.txOutIndex, spentTxOuts)) // uTxOutList에서 사용한 txOut를 걸러냄
    .concat(newUTxOuts);

  return resultingUTxOuts;
};

const isTxInStructureValid = (txIn) => {
  // to do
  if (txIn === null) {
    return false;
  } else if (typeof txIn.signature !== "string") {
    return false;
  } else if (typeof txIn.txOutId !== "string") {
    return false;
  } else if (typeof txIn.txOutIndex !== "number") {
    return false;
  } else {
    return true;
  }
}

const isAddressValid = (address) => {
  if (address.length !== 130) {
    return false;
  } else if (address.match("^[a-fA-F0-9]+$") === null) {
    return false;
  } else if (!address.startWith("04")) {
    return false;
  } else {
    return true;
  }
} 

const isTxOutStructureValid = (txOut) => {
  // to do
  if (txOut === null) {
    return false;
  } else if (typeof txOut.address !== "string") {
    return false;
  } else if (isAddressValid(txOut.address)) {
    return false;
  } else if (typeof txOut.amount !== "number") {
    return false;
  } else {
    return true;
  }
}

const isTxStructureValid = (tx) => {
  if (typeof tx.id !== "string") {
    console.log("Tx ID is not valid");
    return false;
  } else if (!(tx.txIns instanceof Array)) {
    console.log("The txIns are not an array");
    return false;
  } else if (!tx.txIns.map(isTxInStructureValid).reduce((a, b) => a && b, true)) {
    console.log("The structure of one of the txIn is not valid");
    return false;
  } else if (!(tx.txOuts instanceof Array )) {
    console.log("The txOuts are not an array")
    return false;
  } else if (!tx.txOut.map(isTxOutStructureValid).reduce((a, b) => a && b, true)) {
    console.log("The structure of one of the txOut is not valid");
    return false;
  } else {
    return true;
  }
}