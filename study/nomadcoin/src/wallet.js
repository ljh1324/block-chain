const elliptic = require("elliptic"),
  path = require("path"),
  fs = require("fs"),
  _ = require("lodash"),
  Transactions = require("./transactions");


const { getPublicKey, getTxId, signTxIn, TxIn, Transaction, TxOut } = Transactions;

const ec = new elliptic.ec("secp256k1");

const privateKeyLocation = path.join(__dirname, "privateKey");

const generateFromWallet = () => { // private 키를 불러옴 
  const buffer = fs.readFileSync(privateKeyLocation, "utf8");
  return buffer.toString();
};

const getPublicFromWallet = () => { // privateKeyLocation에 있는 private 키로 부터 public 키 생성
  const privateKey = generateFromWallet();
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

const findAmountInUTxOuts = (amountNeeded, myUTxOuts) => { // 내가 쓰지 않은 transaction output이 amountNeeded 이상인지 확인
  let currentAmount = 0;
  const includedUTxOuts = [];
  for (const myUTxOut of myUTxOuts) {
    includedUTxOuts.push(myUTxOut);
    currentAmount = currentAmount + myUTxOut.amount;
    if (currentAmount >= amountNeeded) { // 현재 금액이 내가 보낼려고 하는 금액보다 클 경우
      const leftOverAmount = currentAmount - amountNeeded; // 현재 금액에서 보내고자 하는 금액을 빼주어 나에게 다시 줄 거스름돈 계산
      return { includedUTxOuts, leftOverAmount };
    }
  }
  console.log("Not enough founds");
  return false;
};

const createTxOut = (receiverAddress, myAddress, amount, leftOverAmount) => { // amount는 receiver에게 leftOverAmount는 나에게 보내기 위한 금액
  const receiverTxOut = new TxOut(receiverAddress, amount);
  if (leftOverAmount === 0) {
    return [receiverTxOut];
  } else {
    const leftOverTxOut = new TxOut(myAddress, leftOverAmount);
    return [receiverTxOut, leftOverTxOut]
  }
};

const createTx = (receiverAddress, amount, privateKey, uTxOutList) => { // receiverAddress에게 amount를 보내는 transaction생성
  const myAddress = getPublicKey(privateKey);
  const myUTxOuts = uTxOutList.filter(uTx0 => uTxO.address === myAddress)

  const { includedUTxOuts, leftOverAmount } = findAmountInUTxOuts(amount, myUTxOuts);

  const toUnsignedTxIn = uTxOut => {
    const txIn = new txIn();
    txIn.txOutId = uTxOut.txOutId;
    txIn.toOutIndex = uTxOut.txOutIndex;
  };

  const unsignedTxIns = includedUTxOuts.map(toUnsignedTxIn);

  const tx = new Transaction();

  tx.txIns = unsignedTxIns;
  tx.txOuts = createTxOuts(receiverAddress, myAddress, amount, leftOverAmount);
  
  tx.id = getTxId(tx);

  tx.txIns = tx.txIns.map((txIn, index) => { // 모든 transaction input에 대한 사인을 함
    txIn.signature = signTxIn(tx, index, privateKey, uTxOutList);
    return txIn;
  });

  return tx;
};



module.exports = {
  initWallet,
  getBalance,
  getPublicFromWallet,
};