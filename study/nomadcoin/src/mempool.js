// mempool = 블록으로 만들어지지 않은 transaction에 대한 Pool
// 돈을 보낼 때 트랜잭션은 mem pool에 있으며 누군가 블록에 포함시키기로 결정 후 채굴을 하면 블록에 포함됨

const _ = require("lodash"),
  Transactions = require("./transactions");

const { validateTx } = Transactions;

let mempool = [];

const getMempool = () => _.cloneDeep(mempool);

const getTxInsInPool = mempool => { // memPool의 transaction.txIns 반환
  return _(mempool)
    .map(tx => tx.txIns)
    .flatten()
    .value();
}

const isTxValidForPool = (tx, mempool) => { // tx가 mempool에 들어갈 수 있는 지 확인(똑같은 transaction output을 사용하면 안됨)
  //console.log("ㄱㅁ");
  //console.log(tx);
  const txInsInPool = getTxInsInPool(mempool);

  const isTxInAlreadyInPool = (txIns, txIn) => {
    return _.find(txIns, txInInPool => {
      return (
        txIn.txOutIndex === txInInPool.txOutIndex && 
        txIn.txOutId === txInInPool.txOutId
      )
    });
  };

  for(const txIn of tx.txIns) {
    if (isTxInAlreadyInPool(txInsInPool, txIn)) {
      return false;
    }
  }
  return true;
};

const hasTxIn = (txIn, uTxOutList) => { // uTxOutList에 txIn이 있는지 확인
  const foundTxIn = uTxOutList.find(uTxO => uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex);

  return foundTxIn !== undefined;
}

const updateMempool = (uTxOutList) => { // uTxOutList에 이미 인풋이 있는 트랜잭션을 발견하면 인풋에 해당하는 아웃풋이 있으며 해당 트랜잭션은 멤풀에서 제거되어야 함
  const invalidTx = [];

  for (const tx of mempool) {
    for (const txIn of tx.txIns) {
      if (!hasTxIn(txIn, uTxOutList)) { // uTxOutList에 transaction input이 있을 경우 해당 transaction input은 이미 사용했다는 뜻이므로 멤풀에서 제거되어야 함
        invalidTx.push(tx);
        break;
      }
    }
  }

  if (invalidTx.length > 0) {
    mempool = _.without(mempool, ...invalidTx);
  }
};

const addToMempool = (tx, uTxOutList) => { // mempool에 tx 추가
  if (!validateTx(tx, uTxOutList)) { // 해당 transaction이 구조가 옳바른지, uTxOutList있는지, 제대로 서명되어 있나 확인
    throw Error("This transaction is invalid. Will not add it to pool");
  } else if (!isTxValidForPool(tx, mempool)) {
    throw Error("This tx is not valid for the pool. Will not add it.");
  }
  mempool.push(tx);
}

module.exports = {
  addToMempool,
  getMempool,
  updateMempool,
}