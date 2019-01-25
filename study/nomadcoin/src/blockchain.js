const CryptoJS = require("crypto-js");

class Block { // Block의 순서, Block의 해시값, 이전 Block의 해시값, 생성 시간, 데이터를 가짐
  constructor(index, hash, previousHash, timestamp, data) {
    this.index = index;
    this.hash = hash;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.data = data;
  }
}

const genesisBlock = new Block( // 0번째 블록
  0,
  "E1407DF9248B2015F05C00E0EA4202AB874918EBE608269F73D16792FC72F36A", // hash of block
  null,
  1548404626633,
  "This is the genesis"
);

let blockchain = [genesisBlock];

const getLastBlock = () => blockchain[blockchain.length - 1]; // blockchain의 마지막 블록을 가져옴

const getTimestamp = () => new Date().getTime() / 1000; // 생성 시간을 받아옴

const getBlockchain = () => blockchain;

const createHash = (index, previousHash, timestamp, data) => // 데이터들을 받아 해싱하여 반환
  CryptoJS.SHA256(index + previousHash + timestamp + JSON.stringify(data)).toString();

const createNewBlock = data => { // 새로운 블록을 만듬
  const previousBlock = getLastBlock(); // 이전 블록을 받아옴 
  const newBlockIndex = previousBlock.index + 1; // 이전 블록 다음 순서
  const newTimestamp = getTimestamp(); // 블록 생성 시간
  const newHash = createHash( // 블록 해시 생성
    newBlockIndex,
    previousBlock.hash,  // 이전 블록의 해시값
    newTimestamp, 
    data
  );

  const newBlock = new Block( // 새로운 블록을 만듬
    newBlockIndex,
    newHash,
    previousBlock.hash,
    newTimestamp,
    data
  );
  addBlockToChain(newBlock);
  return newBlock;
}

const getBlocksHash = (block) => createHash(block.index, block.previousHash, block.timestamp, block.data); // block의 해시값 반환

const isNewBlockValid = (candidateBlock, latestBlock) => {
  if (!isNewStructureValid(candidateBlock)) { // 후보 블록이 옳바른 구조를 가지지 않을 경우
    console.log('The candidate block structure is not valid');
    return false;
  }
  else if (latestBlock.index + 1 !== candidateBlock.index) { // 최근 블록의 순서 + 1과 후보 블록의 순서가 다를 경우
    console.log('The candidate block doesnt hava a valid index');
    return false;
  } else if (latestBlock.hash !== candidateBlock.previousHash) { // 최근 블록의 해시값과 후보 블록의 이전 해시값이 다를 경우
    console.log('The previouseHash of candidate block is not the hash of the latest block');
    return false;
  } else if(getBlocksHash(candidateBlock) !== candidateBlock.hash) { // 후보 블록의 해시값이 옳바르지 않을 경우
    console.log('The hash of this block is invalid');
    return false;
  }
  return true;
};

const isNewStructureValid = (block) => {
  return (
    typeof block.index === 'number' &&
    typeof block.hash === 'string' &&
    typeof block.previousHash === 'string' &&
    typeof block.timestamp === 'number' &&
    typeof block.data === 'string'
  );
};

const isChainValid = (candidateChain) => {
  const isGenesisValid = block => { // 제네시스 블럭인지 확인
    return JSON.stringify(block) === JSON.stringify(genesisBlock);
  };
  if (!isGenesisValid(candidateChain[0])) { // 첫 번째 블록이 제네시스 블록이 아닐 경우
    console.log("The candidateChain's genesisBlock is not the same as our genesisBlock")
    return false;
  }
  for (let i = 1; i < candidateChain.length; i++) {
    // genesis block은 검증이 필요 없기 때문에 1부터 시작
    if (!isNewBlockValid(candidateChain[i], candidateChain[i - 1])) {
      // i번째 블록이 이전 i - 1번 체인의 해시 값을 가지는지 확인
      return false;
    }
  }
  return true;
};

const replaceChain = candidateChain => {
  if (isChainValid(candidateChain) && candidateChain.length > getBlockchain().length) {
    // 가지고 있는 블록체인 보다 더 긴 블록체인이 올 경우
    blockchain = candidateChain;
    return true;
  } else {
    return false;
  }
};

const addBlockToChain = candidateBlock => {
  if (isNewBlockValid(candidateBlock, getLastBlock())) { // 새로운 후보 블록이 유효할 경우
    getBlockchain().push(candidateBlock);
    return true;
  } else {
    return false;
  }
};

//addBlockToChain(createNewBlock("Hi"));
//console.log(getBlockchain());

module.exports = {
  getBlockchain,
  createNewBlock,
}