package core;

import java.util.ArrayList;
import util.Util;

public class Block {
	
	private int blockID;
	private int nonce;
	//private String data;
	private String previousBlockHash;
	private ArrayList<Transaction> transactionList;
	
	public String getPreviousBlockHash() {
		return previousBlockHash;
	}
	public void setPreviousBlockHash(String previousBlockHash) {
		this.previousBlockHash = previousBlockHash;
	}
	public int getBlockID() {
		return blockID;
	}
	public void setBlockID(int blockID) {
		this.blockID = blockID;
	}
	public int getNonce() {
		return nonce;
	}
	public void setNonce(int nonce) {
		this.nonce = nonce;
	}
	
	/*
	public String getData() {
		return data;
	}
	public void setData(String data) {
		this.data = data;
	}
	*/
	
	/*
	public Block(int blockID, String previousBlockHash, int nonce, String data) {
		this.blockID = blockID;
		this.previousBlockHash = previousBlockHash;
		this.nonce = nonce;
		//this.data = data;
	}
	*/
	
	public Block(int blockID, String previousBlockHash, int nonce, ArrayList transactionList) {
		this.blockID = blockID;
		this.previousBlockHash = previousBlockHash;
		this.nonce = nonce;
		this.transactionList = transactionList;
		//this.data = data;
	}
	
	public void addTransaction(Transaction transaction) {
		transactionList.add(transaction);
	}
	
	/*
	public void getInformation() {
		System.out.println("---------------------------");
		System.out.println("블록 번호: " + getBlockID());
		System.out.println("이전 해시: " + getPreviousBlockHash());
		System.out.println("채굴 변수 값: " + getNonce());
		System.out.println("블록 데이터:" + getData());
		System.out.println("블록 해시: " + getBlockHash());
	}
	*/
	
	public void getInformation() {
		System.out.println("---------------------------");
		System.out.println("블록 번호: " + getBlockID());
		System.out.println("이전 해시: " + getPreviousBlockHash());
		System.out.println("채굴 변수 값: " + getNonce());
		System.out.println("트랜잭션 개수:" + transactionList.size() + "개");
		for (int i = 0; i < transactionList.size(); i++) {
			System.out.println(transactionList.get(i).getInformation());
		}
		System.out.println("블록 해시: " + getBlockHash());
	}
	
	/*
	public String getBlockHash() {
		return Util.getHash(nonce + data + previousBlockHash);
	}
	*/
	
	public String getBlockHash() {
		String transactionInformation = "";
		for (int i = 0; i < transactionList.size(); i++) {
			transactionInformation += transactionList.get(i).getInformation();
		}
		return Util.getHash(nonce + transactionInformation);
	}
	
	public void mine() {
		while (true) {
			if (getBlockHash().substring(0, 4).equals("0000")) {
				System.out.println(getBlockID() + "번째 블록의 채굴에 성공했습니다.");
				break;
			}
			nonce++; 
		}
	}
}
