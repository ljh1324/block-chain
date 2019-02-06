const CryptoJS = require("crypto-js"),
  elliptic = require("elliptic"),
  _ = require("lodash"),
  utils = require("./utils");

const ec = new elliptic.ec("secp256k1");

const COINBASE_AMOUNT = 50; // 채굴 보상

class TxOut {
  constructor(address, amount) {
    this.address = address;
    this.amount = amount;
  }
}

class TxIn { // TxInput = 사용되지 않은 TxOut, TxInput은 TxOut이 있어야 함. 즉, TxInput = 이전 TxOutput
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
  //console.log(tx);
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

const signTxIn = (tx, txInIndex, privateKey, uTxOutList) => { // 특정 거래에 대한 증명
  const txIn = tx.txIns[txInIndex]; // 거래 input의 txInIndex번째 input을 가져옴
  //console.log(txIn);
  const dataToSign = tx.id;
  // To Do: Find Tx
  const referencedUTxOut = findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOutList);
  //console.log(uTxOutList[0]);
  if (referencedUTxOut === null) { // 사용할 돈이 없음
    return;
  }
  //console.log(referencedUTxOut);

  const referencedAddress = referencedUTxOut.address;
  if (getPublicKey(privateKey) !== referencedAddress) { // privateKey의 공개키가 transaction output의 address와 동일하지 않을 경우 false 반환
    return false;
  }

  const key = ec.keyFromPrivate(privateKey, "hex");
  const signature = utils.toHexString(key.sign(dataToSign).toDER()); // key를 사용하여 서명
  return signature;
}

const getPublicKey = (privateKey) => { // private key로 부터 public key 생성
  return ec
    .keyFromPrivate(privateKey, "hex")
    .getPublic()
    .encode("hex");
};

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
  const newUTxOuts = newTxs
    .map(tx =>  // 새로운 Transaction에서 txOuts를 이용하여 새로운 UTxOut 배열을 만들어냄
      tx.txOuts.map(
        (txOut, index) => new UTxOut(tx.id, index, txOut.address, txOut.amount)
      )
    )
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

const isTxInStructureValid = (txIn) => { // transaction input의 구조가 유효한지 확인
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

const isAddressValid = (address) => { // 주소가 유효한지 확인
  //console.log("Address");
  //console.log(address);
  //console.log(typeof address);
  if (address.length !== 130) { // 주소 길이는 130
    console.log("The address length is not the expected one");
    return false;
  } else if (address.match("^[a-fA-F0-9]+$") === null) { // 주소는 a-f 또는 A-F 또는 0-9 문자만 있어야 함
    console.log("The address doesn't match the hex patter");
    return false;
  } else if (!address.startsWith("04")) { // 주소는 04로 시작
    console.log("The address doesn't start with 04");
    return false;
  } else {
    return true;
  }
}

const isTxOutStructureValid = (txOut) => { // transaction output의 구조가 유효한지 확인
  // to do
  if (txOut === null) {
    return false;
  } else if (typeof txOut.address !== "string") {
    console.log("The txOut doesn't have a valid string as address");
    return false;
  } else if (!isAddressValid(txOut.address)) {
    console.log("The txOut doesn't have a valid address");
    return false;
  } else if (typeof txOut.amount !== "number") {
    console.log("The txOut doesn't have a valid amount");
    return false;
  } else {
    return true;
  }
}

const isTxStructureValid = (tx) => { // transaction이 유효한지 확인
  if (typeof tx.id !== "string") {
    console.log("Tx ID is not valid");
    return false;
  } else if (!(tx.txIns instanceof Array)) {
    console.log("The txIns are not an array");
    return false;
  } else if (!tx.txIns.map(isTxInStructureValid).reduce((a, b) => a && b, true)) { // 모든 transaction input 구조가 유효한지 확인
    console.log("The structure of one of the txIn is not valid");
    return false;
  } else if (!(tx.txOuts instanceof Array)) {
    console.log("The txOuts are not an array")
    return false;
  } else if (!tx.txOuts.map(isTxOutStructureValid).reduce((a, b) => a && b, true)) { // 모든 transaction output 구조가 유효한지 확인
    console.log("The structure of one of the txOut is not valid");
    return false;
  } else {
    return true;
  }
}

const validateTxIn = (txIn, tx, uTxOutList) => { // transaction input(사용할 transaction output) 검증
  // transaction input은 transaction out을 reference.
  const wantedTxOut = uTxOutList.find(uTxOut => uTxOut.txOutId === txIn.txOutId && uTxOut.txOutIndex === txIn.txOutIndex); // 아직 사용하지 않은 uTxOutList과 같은 id와 index를 가지는 uTxOut을 찾음
  if (wantedTxOut === null) {
    return false;
  } else {
    //console.log('in validateTxIn');
    //console.log(wantedTxOut);
    const address = wantedTxOut.address;
    const key = ec.keyFromPublic(address, "hex"); // 퍼블릭 키(주소)를 받아와 key 생성
    return key.verify(tx.id, txIn.signature); // 돈을 사용할 사람에 의하여 사인이 되었음을 체크
  }
}

const getAmountInTxIn = (txIn, uTxOutList) => findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOutList).amount; // 사용하지 않은 transaction input에 대한 금액을 가져옴

const validateTx = (tx, uTxOutList) => { // 트랜잭션 검증(구조가 옳바른지, id가 옳바른지, uTxOutList에 해당 tx가 있는지, 서명이 제대로 됬는지, input, output금액이 같은지)
  if (!isTxStructureValid(tx)) { // 트랜잭션 구조가 옳바른지 확인
    return false;
  }
  //console.log("꾸꾸까까?");
  //console.log(tx);

  if (getTxId(tx) !== tx.id) { // tx 해시값과 tx의 id가 다를 경우 거래내역이 옳바르지 않음
    return false;
  }
  //console.log("읭?");
  //console.log(tx);
  //console.log(uTxOutList);
  const hasValidTxIns = tx.txIns.map(txIn => validateTxIn(txIn, tx, uTxOutList)); // transaction input 검증

  if (!hasValidTxIns) { // 트랜잭션 인풋이 유효하지 않다면 false반환
    return false;
  }

  //console.log("뀨");
  //console.log(tx);
  const amountInTxIns = tx.txIns
    .map(txIn => getAmountInTxIn(txIn, uTxOutList))
    .reduce((a, b) => a + b, 0);

  const amountInTxOuts = tx.txOuts
    .map(txOut => txOut.amount)
    .reduce((a, b) => a + b, 0);
  //console.log("뀨2");
  //console.log(tx);

  if (amountInTxIns != amountInTxOuts) { // 트랜잭션 입력의 총 금액과 출력의 총 금액이 같지 않다면 false 반환
    return false;
  } else {
    return true;
  }
};

const validateCoinbaseTx = (tx, blockIndex) => { // 블록 생성시 채굴자에게 주어지는 트랜잭션 검증
  if (getTxId(tx) !== tx.id) {
    console.log("Invalid Conbase tx ID");
    return false;
  } else if (tx.txIns.length !== 1) { // Coinbase transaction은 한 개의 트랜잭션 인풋밖에 없음
    console.log("Coinbase TX should only have one input");
    return false;
  } else if (tx.txIns[0].txOutIndex !== blockIndex) { // coinbase transaction output 인덱스는 블록의 인덱스와 같아야함
    console.log("The txOutIndex of the Coinbase Tx should be the same as the Block Index");
    return false;
  } else if (tx.txOuts.length !== 1) { // Coinbase transaction output은 채굴자에게 감. 채굴자는 단 한 명!
    console.log("Coinbase TX should only have one output");
    return false;
  } else if (tx.txOuts[0].amount !== COINBASE_AMOUNT) {
    console.log(`Coinbase TX shuold have an amount of only ${COINBASE_AMOUNT} and it has ${tx.txOuts[0].amount}`);
    return false;
  } else {
    return true;
  }
};

const createCoinbaseTx = (address, blockIndex) => { // transaction input은 비어있으며 transaction ouput에는 채굴자 주소, 금액이 있는 트랜잭션 생성
  const tx = new Transaction();
  const txIn = new TxIn();
  tx.signature = "";
  txIn.txOutId = "";
  txIn.txOutIndex = blockIndex;
  tx.txIns = [txIn];
  //console.log('fadsfdsfdasfas');
  
  tx.txOuts = [new TxOut(address, COINBASE_AMOUNT)]; 
  //console.log(tx.txOuts[0].address);

  tx.id = getTxId(tx);

  return tx; // coinbase transaction의 input, output은 각각 한 개씩임
};

const hasDuplicates = (txIns) => {
  // _.countBy([6.1, 4.2, 6.3], Math.floor);
  // => { '4': 1, '6': 2 } Math.floor을 적용 후 각 원소가 얼마나 등장하는지 카운팅
  const group = _.countBy(txIns, txIn => txIn.txOutId + txIn.txOutIndex);

  return _(group).map(value => {
    if (value > 1) { // 중복되는 원소가 있을 경우 true반환
      console.log("Found a duplicated txIn");
      return true;
    } else {
      return false;
    }
  }).includes(true); // 하나라도 true가 있을 경우 true 반환.
};

const validateBlockTx = (txs, uTxOutList, blockIndex) => { // 블록의 거래내역이 유효한지 확인
  const coinbaseTx = txs[0];
  if (!validateCoinbaseTx(coinbaseTx, blockIndex)) { // coinbase transaction이 유효하지 않다면 
    console.log("Coinbase Tx is invalid");
    return false;
  }

  const txIns = _(txs)
    .map(tx => tx.txIns)
    .flatten()
    .value();
  //console.log("In ValidateBlockTx");
  //console.log(txIns);
  if (hasDuplicates(txIns)) { // txIns이 중복되었을 경우를 체크(여러 사람에게 같은 transaction output의 돈을 보냄)
    console.log("Found duplicated txIns");
    return false;
  }

  const nonCoinbaseTxs = txs.slice(1); // Coinbase 이후의 transaction list 저장
  //console.log('In validateblocktx');
  //console.log(uTxOutList);
  //console.log(nonCoinbaseTxs);

  return nonCoinbaseTxs
    .map(tx => validateTx(tx, uTxOutList))
    .reduce((a, b) => a && b, true);
};

const processTxs = (txs, uTxOutList, blockIndex) => { // 새로운 transaction list를 받아 검증 후 UTxOuts 업데이트
  //console.log('in processTxs');
  //console.log(txs);
  if (!validateBlockTx(txs, uTxOutList, blockIndex)) { // 블럭의 transaction이 유효한지 확인
    return null;
  }
  return updateUTxOuts(txs, uTxOutList);
};

module.exports = {
  getPublicKey, 
  getTxId,
  signTxIn,
  TxIn,
  Transaction,
  TxOut,
  createCoinbaseTx,
  processTxs,
  validateTx,
}