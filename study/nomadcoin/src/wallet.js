const elliptic = require("elliptic"),
  path = require("path"),
  fs = require("fs"),
  _ = require("lodash"),
  Transactions = require("./transactions");


const { getPublicKey, getTxId, signTxIn, TxIn, Transaction, TxOut } = Transactions;

const ec = new elliptic.ec("secp256k1");

const privateKeyLocation = path.join(__dirname, "privateKey");

const getPrivateFromWallet = () => { // private 키를 불러옴 
  const buffer = fs.readFileSync(privateKeyLocation, "utf8");
  return buffer.toString();
};

const getPublicFromWallet = () => { // privateKeyLocation에 있는 private 키로 부터 public 키 생성
  const privateKey = getPrivateFromWallet();
  const key = ec.keyFromPrivate(privateKey, "hex");
  return key.getPublic().encode("hex");
}

const generatePrivateKey = () => { // 개인키 생성
  const keyPair = ec.genKeyPair();
  const privateKey = keyPair.getPrivate();
  return privateKey.toString(16);
};

const getBalance = (address, uTxOuts) => { // transaction output(TxOut)의 address에 해당하는 잔고를 반환
  //console.log(address);
  //console.log(uTxOuts);
  //console.log(uTxOuts[0].address);
  return _(uTxOuts).filter(uTxO => uTxO.address === address)
    .map(uTxO => uTxO.amount)
    .sum();
};

const initWallet = () => { // 개인키 파일이 없다면 개인키 생성 후 저장
  if (fs.existsSync(privateKeyLocation)) {
    return;
  }
  const newPrivateKey = generatePrivateKey();

  fs.writeFileSync(privateKeyLocation, newPrivateKey);
};

/*
  만약 uTxOutList에 쓸 수 있는 금액이 각각 50원 20원일 때 30원을 2명에게 보낸다고 하면
  50원을 이용해서 30원을 다른 1명에게 보내고 20원은 나에게 받지만 uTxOutList가 업데이트 되지 않아
  다른 1명에게 다시 30원을 보낸다고 했을 때 20원밖에 쓸 수 있는 금액이 남아있지 않아 돈이 모자라다고 나옴.
*/

const findAmountInUTxOuts = (amountNeeded, myUTxOuts) => { // 내가 쓰지 않은 transaction output이 amountNeeded 이상인지 확인
  let currentAmount = 0;
  const includedUTxOuts = [];
  for (const myUTxOut of myUTxOuts) {
    includedUTxOuts.push(myUTxOut);
    currentAmount = currentAmount + myUTxOut.amount;
    if (currentAmount >= amountNeeded) { // 현재 금액이 내가 보낼려고 하는 금액보다 클 경우
      const leftOverAmount = currentAmount - amountNeeded; // 현재 금액에서 보내고자 하는 금액을 빼주어 나에게 다시 줄 거스름돈 계산
      console.log("Enough funds!")
      return { includedUTxOuts, leftOverAmount };
    }
  }
  throw Error("Not enough funds");
  //return false;
};

const createTxOuts = (receiverAddress, myAddress, amount, leftOverAmount) => { // transaction output 생성. amount는 receiver에게 leftOverAmount는 나에게 보내기 위한 금액
  const receiverTxOut = new TxOut(receiverAddress, amount);
  if (leftOverAmount === 0) {
    return [receiverTxOut];
  } else {
    const leftOverTxOut = new TxOut(myAddress, leftOverAmount);
    return [receiverTxOut, leftOverTxOut]
  }
};

const filterUTxOutsFromMempool = (uTxOutList, mempool) => { // 이미 mempool에 있는 트랜잭션 인풋을 uTxOutList에서 걸러냄
  console.log("끄아앙");
  console.log(mempool);
  const txIns = _(mempool)
    .map(tx => tx.txIns)
    .flatten()
    .value();
  console.log("끄아앙2");
  
  const removables = [];
  for (const uTxOut of uTxOutList) {
    const txIn = _.find(txIns, 
      txIn => txIn.txOutIndex === uTxOut.txOutIndex && txIn.txOutId === uTxOut.txOutId
    );
    if (txIn !== undefined) { // uTxOutList에서 mempool안에 같은 트랜잭션을 찾을 경우
      removables.push(uTxOut);
    }
  }

  return _.without(uTxOutList, ...removables);
};

const createTx = (receiverAddress, amount, privateKey, uTxOutList, mempool) => { // receiverAddress에게 amount를 보내는 transaction생성
  const myAddress = getPublicKey(privateKey);
  //console.log('in createTx');
  //console.log(uTxOutList);
  const myUTxOuts = uTxOutList.filter(uTxO => uTxO.address === myAddress) // 나의 uTxOutList를 가져옴
  //console.log(myUTxOuts);
  const filteredUTxOuts = filterUTxOutsFromMempool(myUTxOuts, mempool)

  const { includedUTxOuts, leftOverAmount } = findAmountInUTxOuts(amount, filteredUTxOuts); // amount를 채우는데 필요한 uTxOutList를 가져옴

  const toUnsignedTxIn = uTxOut => { // UTxOut에서 TxIn에 해당하는 값만 추출
    const txIn = new TxIn();
    txIn.txOutId = uTxOut.txOutId;
    txIn.txOutIndex = uTxOut.txOutIndex;
    return txIn;
  };

  const unsignedTxIns = includedUTxOuts.map(toUnsignedTxIn);

  const tx = new Transaction();

  tx.txIns = unsignedTxIns;
  tx.txOuts = createTxOuts(receiverAddress, myAddress, amount, leftOverAmount);
  
  tx.id = getTxId(tx);
  
  //console.log(tx);
  //console.log(uTxOutList);
  tx.txIns = tx.txIns.map((txIn, index) => { // 모든 transaction input에 대한 사인을 함
    txIn.signature = signTxIn(tx, index, privateKey, uTxOutList);
    return txIn;
  });
  
  //console.log(tx);
  //console.log(uTxOutList)

  return tx;
};

module.exports = {
  initWallet,
  getBalance,
  getPublicFromWallet,
  createTx,
  getPrivateFromWallet,
};