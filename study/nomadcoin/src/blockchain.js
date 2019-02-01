const CryptoJS = require("crypto-js"),
  hexToBinary = require("hex-to-binary");

const BLOCK_GENERATION_INTERVAL = 10; // 블록이 몇 초마다 생성될 것인지
const DIFFICULTY_ADJUSMENT_INTERVAL = 10; // 몇 블록마다 난이도를 조정할 것인지

class Block { 
  constructor(index, hash, previousHash, timestamp, data, difficulty, nonce) {
    this.index = index; // Block 순서
    this.hash = hash; // Block 해시값
    this.previousHash = previousHash; // 이전 Block의 해시값
    this.timestamp = timestamp; // 생성 시간
    this.data = data; // 데이터
    this.difficulty = difficulty; // 난이도
    this.nonce = nonce; // nonce
  }
}

const genesisBlock = new Block( // 0번째 블록
  0,
  "E1407DF9248B2015F05C00E0EA4202AB874918EBE608269F73D16792FC72F36A", // hash of block
  null,
  1548741927,
  "This is the genesis",
  10,
  0,
);

let blockchain = [genesisBlock];

const getNewestBlock = () => blockchain[blockchain.length - 1]; // blockchain의 마지막 블록을 가져옴

const getTimestamp = () => Math.round(new Date().getTime() / 1000); // 생성 시간을 받아옴

const getBlockchain = () => blockchain;

const createHash = (index, previousHash, timestamp, data, difficulty, nonce) => // 데이터들을 받아 해싱하여 반환
  CryptoJS.SHA256(index + previousHash + timestamp + JSON.stringify(data) + difficulty + nonce).toString();

const createNewBlock = data => { // 새로운 블록을 만듬
  const previousBlock = getNewestBlock(); // 이전 블록을 받아옴 
  const newBlockIndex = previousBlock.index + 1; // 이전 블록 다음 순서
  const newTimestamp = getTimestamp(); // 블록 생성 시간
  const difficulty = findDifficulty(); // 현재 까지 만들어진 블록체인을 통해 블록 난이도를 계산
  const newBlock = findBlock( // 새로운 블록을 만듬
    newBlockIndex,
    previousBlock.hash,
    newTimestamp,
    data,
    difficulty,
  );

  addBlockToChain(newBlock);
  require('./p2p').broadcastNewBlock(); // 현재 서버와 연결된 노드에게 새로운 블록이 만들어졌다고 알림
  return newBlock;
}

const findDifficulty = () => {
  const newestBlock = getNewestBlock() // 블록체인의 가장 최근 생성된 블록을 변수에 저장
  
  // 10(1 * DIFFICULTY_ADJUSMENT_INTERVAL)번째, 20번째, 30번째 블록부터 새로 난이도를 계산
  if (newestBlock.index % DIFFICULTY_ADJUSMENT_INTERVAL === 0 && newestBlock.index !== 0) {
    return calculateNewDifficulty(newestBlock, getBlockchain());
  } else {
    return newestBlock.difficulty;
  }
}

const calculateNewDifficulty = (newestBlock, blockchain) => {
  const lastCalculatedBlock = blockchain[blockchain.length - DIFFICULTY_ADJUSMENT_INTERVAL]; // 이전에 난이도가 계산된 블록을 가져옴
  const timeExpected = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSMENT_INTERVAL;
  const timeTaken = newestBlock.timestamp - lastCalculatedBlock.timestamp; // 가장 최근 블록과 난이도가 계산된 블록 사이의 소요시간
  if (timeTaken < timeExpected / 2) { // 채굴 시간이 예상 시간보다 2배이상 빠르다면 난이도 증가
    return lastCalculatedBlock.difficulty + 1;
  } else if (timeTaken > timeExpected * 2) { // 채굴 시간이 예상 시간보다 2배이상 오래 걸린다면 난이도 감소
    return lastCalculatedBlock.difficulty - 1;
  } else {
    return lastCalculatedBlock.difficulty;
  }
};

const findBlock = (index, previousHash, timestamp, data, difficulty) => {
  let nonce = 0;
  while (true) {
    console.log("Current nonce: ", nonce);
    const hash = createHash(
      index,
      previousHash,
      timestamp,
      data,
      difficulty,
      nonce
    );
    // to do: check amount of zeros (hashMatchesDifficulty)
    if (hashMatchesDifficulty(hash, difficulty)) {
      return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
    } else { // 해시가 앞의 0의 숫자와 맞지 않다면 nonce를 더해줌
      nonce++;
    }
  }
};

const hashMatchesDifficulty = (hash, difficulty) => {
  const hashInBinary = hexToBinary(hash);
  const requiredZeros = "0".repeat(difficulty); // 0를 difficulty 만큼 반복
  console.log('Trying difficulty: ', difficulty, 'with hash ', hashInBinary);
  return hashInBinary.startsWith(requiredZeros);
};

const getBlocksHash = (block) => createHash(block.index, block.previousHash, block.timestamp, block.data, block.difficulty, block.nonce); // block의 해시값 반환

const isTimestampValid = (newBlock, oldBlock) => {
  return (
    oldBlock.timestamp - 60 < newBlock.timestamp && // oldBlock의 생성 시간의 1분전 보다 새로운 블록의 생성 시간이 클 경우
    newBlock.timestamp - 60 < getTimestamp() // newBlock의 생성 시간의 1분전 보다 현재 시간보다 작을 경우
  );
}

const isBlockValid = (candidateBlock, latestBlock) => { // 후보 블록이 유효한지 확인
  if (!isBlockStructureValid(candidateBlock)) { // 후보 블록이 옳바른 구조를 가지지 않을 경우
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
  } else if (!isTimestampValid(candidateBlock, latestBlock)) {
    console.log("The timestamp of this block is dodgy");
    return false;
  }

  return true;
};

const isBlockStructureValid = (block) => { // 블록의 구조가 유효한지 확인
  return (
    typeof block.index === 'number' &&
    typeof block.hash === 'string' &&
    typeof block.previousHash === 'string' &&
    typeof block.timestamp === 'number' &&
    typeof block.data === 'string'
  );
};

const isChainValid = (candidateChain) => { // 체인이 유효한지 확인
  const isGenesisValid = block => { // 제네시스 블럭인지 확인
    return JSON.stringify(block) === JSON.stringify(genesisBlock);
  };
  if (!isGenesisValid(candidateChain[0])) { // 첫 번째 블록이 제네시스 블록이 아닐 경우
    console.log("The candidateChain's genesisBlock is not the same as our genesisBlock")
    return false;
  }
  for (let i = 1; i < candidateChain.length; i++) {
    // genesis block은 검증이 필요 없기 때문에 1부터 시작
    if (!isBlockValid(candidateChain[i], candidateChain[i - 1])) {
      // i번째 블록이 이전 i - 1번 체인의 해시 값을 가지는지 확인, 순서 번호 확인
      return false;
    }
  }
  return true;
};

const sumDifficulty = anyBlockchain => 
  anyBlockchain
    .map(block =>  block.difficulty) // block 배열의 각 원소 difficulty를 받아와 array를 만듬
    .map(difficulty => Math.pow(2, difficulty)) // difficulty 배열의 각 원소를 제곱해주어 array를 만듬 
    .reduce((a, b) => a + b) // 배열의 원소를 모두 더해줌. ex. [1, 2, 3].reduce((a, b) => a + b) : 1(첫번쨰 원소) + 2(두번째 원소) = 3, 3(첫번째 원소 + 두번째 원소) + 3 = 

const replaceChain = candidateChain => { // 후보체인을 비교를 통해 현재 체인과 바꿈
  if (
    isChainValid(candidateChain) && 
    sumDifficulty(candidateChain) > sumDifficulty(getBlockchain()) // 만약 후보 체인의 난이도가 더 높을 경우 더 높은 체인으로 바꿈. 더 긴체인을 바꿀 수 있으므로 데이터 소실 위험이 있음
    //candidateChain.length > getBlockchain().length // 후보 체인과 길이를 비교하여 더 긴 체인으로 체인을 바꿈
  ) {
    // 가지고 있는 블록체인 보다 더 긴 블록체인이 올 경우
    blockchain = candidateChain;
    return true;
  } else {
    return false;
  }
};

const addBlockToChain = candidateBlock => { // 후보 블록을 블록체인을 추가함
  if (isBlockValid(candidateBlock, getNewestBlock())) { // 새로운 후보 블록이 유효할 경우
    getBlockchain().push(candidateBlock);
    return true;
  } else {
    return false;
  }
};

//addBlockToChain(createNewBlock("Hi"));
//console.log(getBlockchain());

module.exports = {
  getNewestBlock,
  getBlockchain,
  createNewBlock,
  isBlockStructureValid,
  addBlockToChain,
  replaceChain,
}