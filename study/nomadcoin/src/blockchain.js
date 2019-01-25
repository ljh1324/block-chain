class Block {
  constructor(index, hash, previousHash, timestamp, data) {
    this.index = index;
    this.hash = hash;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.data = data;
  }
}

const genesisBlock = new Block(
  0,
  "E1407DF9248B2015F05C00E0EA4202AB874918EBE608269F73D16792FC72F36A",
  null,
  1548404626633,
  "This is the genesis"
);

let blockchain = [genesisBlock];

console.log(blockchain);