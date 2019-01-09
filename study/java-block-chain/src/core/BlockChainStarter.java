package core;

import java.util.ArrayList;

import util.Util;

public class BlockChainStarter {

	public static void main(String[] args) {
		
		/*
		int nonce = 0;
		while (true) {
			if (Util.getHash(nonce + "").substring(0, 6).equals("000000")) {
				System.out.println("정답: " + nonce);
				break;
			}
			nonce++;
		}
		*/
		
		/*
		Block block = new Block(1, 0, "데이터");
		block.mine();
		block.getInformation();
		*/
		
		/*
		Block block1 = new Block(1, null, 0, "데이터");
		block1.mine();
		block1.getInformation();
		
		Block block2 = new Block(2, block1.getBlockHash(), 0, "변조 데이터");
		block2.mine();
		block2.getInformation();
		
		Block block3 = new Block(3, block2.getBlockHash(), 0, "데이터");
		block3.mine();
		block3.getInformation();
		
		Block block4 = new Block(4, block3.getBlockHash(), 0, "데이터");
		block4.mine();
		block4.getInformation();
		*/
		
		/*
		Transaction transaction = new Transaction("이정환", "정동화", 1.5);
		System.out.println(transaction.getInformation());
		 */
		
		Block block1 = new Block(1, null, 0, new ArrayList());
		block1.mine();
		block1.getInformation();
		
		Block block2 = new Block(2, block1.getBlockHash(), 0, new ArrayList());
		block2.addTransaction(new Transaction("이정환", "박지훈", 1.5));
		block2.addTransaction(new Transaction("이정환", "정동화", 0.7));
		block2.mine();
		block2.getInformation();
		
		Block block3 = new Block(3, block2.getBlockHash(), 0, new ArrayList());
		block3.addTransaction(new Transaction("이정환", "원종성", 2.5));
		block3.addTransaction(new Transaction("이정환", "한혁재", 1.7));
		block3.mine();
		block3.getInformation();
		
		Block block4 = new Block(4, block3.getBlockHash(), 0, new ArrayList());
		block4.addTransaction(new Transaction("이정환", "김남곤", 7.5));
		block4.mine();
		block4.getInformation();
		
	}

}
