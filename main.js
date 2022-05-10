const sha256 = require('js-sha256');
const ecLib = require('elliptic').ec;
const ec = new ecLib('secp256k1');

class Block {
    constructor(preHash, transcationPool, difficulty) {
        this.difficulty = difficulty;
        this.blockHeader = this.computeBlockHeader(preHash, transcationPool);
        this.blockBody = transcationPool;
        this.blockHash = this.computeBlockHash();
    }
    computeBlockHeader(preHash, transcationPool) {
        return {
            preHash: preHash,
            merkleRoot: sha256(transcationPool),
            timestamp: Date.now()
        }
    }
    getAnswer(difficulty) {
        let answer = ''
        for (let i = 0; i < difficulty; i++) {
            answer = answer + '0'
        }
        return answer
    }
    computeBlockHash() {
        return this.miningProcess(this.difficulty)
    }
    /**
     * 挖矿 - 计算nonce
     * @param {*} difficulty 
     * @returns 
     */
    miningProcess(difficulty) {
        // 挖矿前验证交易池内交易信息的合法性
        this.validateBlockTransactions()
        const answer = this.getAnswer(difficulty);
        const header = this.blockHeader;
        let headerHash;
        let nonce = 0;
        while (true) {
            nonce = nonce + 1
            header.nonce = nonce;
            headerHash = sha256(JSON.stringify(header))
            if (headerHash.substring(0, difficulty) === answer) {
                this.blockHeader = header;
                console.log('Mining success: ', nonce)
                break;
            }
        }
        return headerHash
    }
    /**
     * 验证区块内的交易的合法性
     */
    validateBlockTransactions() {
        this.blockBody.forEach(item => {
            console.log(item)
            if (!item.isValid()) {
                throw Error('transcationPool verification failed')
            }
        })
        return true
    }
}

class Transaction {
    constructor(from, to, amount) {
        this.from = from;
        this.to = to;
        this.amount = amount
    }
    computeTransactionHash() {
        const transcationInfo = {
            form: this.from,
            to: this.to,
            amount: this.amount
        }
        return sha256(JSON.stringify(transcationInfo)).toString()
    }
    /**
     * 签名
     * @param {*} key  
     */
    sign(key) {
        this.signature = key.sign(this.computeTransactionHash(), 'base64').toDER('hex')
        console.log(73, this.amount)
        console.log(68, this.signature)
    }
    isValid() {
        // 挖矿奖励首笔交易不用验证
        if (this.from === '') return true
        const keyObj = ec.keyFromPublic(this.from, 'hex')
        return keyObj.verify(this.computeTransactionHash(), this.signature)
    }
}

class Chain {
    constructor() {
        this.chain = [this.createFoundationBlock()];
        this.TranscationPool = [];
        this.minerReward = 50;
    }
    createFoundationBlock() {
        const transaction = new Transaction('', '', 0);
        return new Block('', [transaction], 2)
    }
    createNewBlock(transcationPool) {
        const len = this.chain.length
        const block = new Block(this.chain[len - 1].blockHash, transcationPool, 2)
        this.addToChain(block)
    }
    addToChain(block) {
        this.checkBlock(block)
        this.checValidBlock(this.chain)
        this.chain.push(block)
    }
    /**
     * 将交易信息添加到交易信息池子里面
     * @param {*} transaction 
     */
    addTransactionToPool(transaction) {
        console.log(100, transaction.isValid())
        if (!transaction.isValid()) {
            throw Error('Valid Transaction!')
        }
        this.TranscationPool.push(transaction);
    }
    /**
     * 给自己发放挖矿奖励
     * @param {*} minerRewardAddress 
     */
    mineTransactionPool(minerRewardAddress) {
        // 第一步 - 发放矿工奖励给自己
        const minerRewardTransaction = new Transaction('', minerRewardAddress, this.minerReward);
        this.TranscationPool.push(minerRewardTransaction);
        this.createNewBlock(this.TranscationPool)
    }
    checkBlock(block) {
        if (block.blockHash !== block.computeBlockHash()) {
            throw Error('The incoming block information was tampered')
        }
        return true
    }
    /**
     * 验证链上的区块是否断裂
     * @param {*} chain 
     * @returns 
     */
    checValidBlock(chain) {
        const len = chain.length
        chain.forEach((block, index) => {
            if (!block.validateBlockTransactions()) {
                throw Error('发现非法交易')
            }
            if (index < len - 1 && block.blockHash !== chain[index + 1].blockHeader.preHash) {
                throw Error(`Block fracture in ${block.blockHash}`)
            }
        })
        return true
    }
}

// 发送方公私钥对
const keyPairSender = ec.genKeyPair();
const privateKeySender = keyPairSender.getPrivate('hex')
const publicKeySender = keyPairSender.getPublic('hex')

// 接受方公私钥对
const keyPairReceiver = ec.genKeyPair();
const privateKeyReceiver = keyPairReceiver.getPrivate('hex')
const publicKeyReceiver = keyPairReceiver.getPublic('hex')

const chain = new Chain();

const transaction1 = new Transaction(publicKeySender, publicKeyReceiver, 10);
transaction1.sign(keyPairSender)
// transaction1.amount = 5
chain.addTransactionToPool(transaction1);

// const transaction2 = new Transaction('addr2', 'addr3', 5);
// chain.addTransactionToPool(transaction2);


chain.mineTransactionPool(publicKeySender)

console.log(chain)
debugger