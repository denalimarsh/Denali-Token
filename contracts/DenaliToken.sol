pragma solidity ^0.4.23;

import './openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol';
import './openzeppelin-solidity/contracts/math/SafeMath.sol';

  /**
   *  DenaliToken implements an ERC20 token which distributes a total of 10 
   *  million tokens, allowing the token owner to mint the first 30% of the 
   *  tokens, with a 500,000 token limit per address. Then, the remaining 70%
   *  of tokens can be claimed users by calling a method on the token contract,
   *  with a 100,000 token limit per address. The two limits are independent.
   *  After 10 million total tokens have been minted, minting is finished and 
   *  tokens are unlocked for transfers. The token owner cannot override the 
   *  second phase distribution by finishing minting early - token minting is
   *  automatically completed once the total supply is equal to 10 million.
   *
   */
contract DenaliToken is MintableToken { 

  using SafeMath for uint256;

  string public constant name = "DenaliToken";
  string public constant symbol = "DMT";
  uint8 public constant decimals = 18;

  bool isTransferable = false;

  uint256 public constant OWNER_MINT_LIMIT = 500000 * (10 ** uint256(decimals));
  uint256 public constant OWNER_MINT_CAP = 3000000 * (10 ** uint256(decimals));
  uint256 public constant SELF_MINT_LIMIT = 100000 * (10 ** uint256(decimals));
  uint256 public constant SELF_MINT_CAP = 10000000 * (10 ** uint256(decimals));

  mapping(address => uint256) public selfMintCount;

  event TokensMintedByUser(
    address _address, 
    uint256 _amount,
    uint256 _currentTotalSupply);

  /**
   * Description: Validates requests for token mints during the first distribution phase.
   *              Mints tokens if the mint request is successfully validated.
   *
   * param _beneficiary: The recipient address of the requested mint.
   * param _amount: The amount of tokens requested for minting.
   * returns:     Boolean result of the attempted transfer.
   */
  function mint(address _beneficiary, uint256 _amount) hasMintPermission public returns (bool) {
    require(totalSupply_.add(calculateTokens(_amount)) <= OWNER_MINT_CAP);
    require(balances[_beneficiary].add(calculateTokens(_amount)) <= OWNER_MINT_LIMIT);

    super.mint(_beneficiary, calculateTokens(_amount));
    return true;
  }

  /**
   * Description: Validates requests for token self mints during the second distribution phase.
   *              Mints tokens directly to users if the mint request is successfully validated.
   *
   * param _amount: The amount of tokens requested for minting.
   * returns:     Boolean result of the attempted transfer.
   */
  function selfMint(uint256 _amount) canMint public returns (bool) {
    require(msg.sender != owner);
    require(totalSupply_ >= OWNER_MINT_CAP);
    require(selfMintCount[msg.sender].add(calculateTokens(_amount)) <= SELF_MINT_LIMIT);
    require(totalSupply_.add(calculateTokens(_amount)) <= SELF_MINT_CAP);

    //Directly mint tokens to user's account.
    uint256 tokenCount = calculateTokens(_amount);
    balances[msg.sender] = balances[msg.sender].add(tokenCount);
    selfMintCount[msg.sender] = selfMintCount[msg.sender].add(tokenCount);
    totalSupply_ = totalSupply_.add(tokenCount);

    //Finish minting and unlock tokens for transfers.
    if(totalSupply_ == SELF_MINT_CAP) {
      isTransferable = true;
      mintingFinished = true;
      emit MintFinished();
    }

    emit TokensMintedByUser(msg.sender, tokenCount, totalSupply_);
    return true;
  }

  /**
   * Description: Overrides Mintable token's 'finishMinting()' method to
   *              reject owner's attempts to finish the minting process.
   *
   * returns success: Boolean result of the attempt to finish minting.
   */
  function finishMinting() onlyOwner canMint public returns (bool) {
    return false;
  }

  /**
   * Description: Calculates the number of tokens from an inputted
   *              integer value, taking into consideration this token's
   *              decimal value.
   *
   * returns uint256: The calculated of tokens
   */
  function calculateTokens(uint256 _amount) pure internal returns (uint256) {
    return _amount.mul(10 ** uint256(decimals));
  }

 /**
   * Description: Overrides ERC20 token 'transfer' method, 
   *              locking functionality until tokens are transferable.
   *
   * param _to: Recipient address of the token transfer.
   * param _value: The amount of tokens to transfer.
   * returns success: Boolean result of the attempted transfer.
   */
  function transfer(address _to, uint _value) canTransfer public returns (bool success) {
    return super.transfer(_to, calculateTokens(_value));
  }

  /**
   * Description: Overrides ERC20 token 'transferFrom' method, 
   *              locking functionality until tokens are transferable.
   *
   * param _from: Address to transfer the tokens from.
   * param _to: Address to transfer the tokens to.
   * param _value: The amount of tokens to transfer.
   * returns success: Boolean result of the attempted transfer.
   */
  function transferFrom(address _from, address _to, uint _value) canTransfer public returns (bool success) {
    return super.transferFrom(_from, _to, calculateTokens(_value));
  }

  /**
   * Description: Overrides ERC20 token 'approve' method, 
   *              locking functionality until tokens are transferable.
   *
   * param _spender: Address approved to spend the tokens.
   * param _value: The amount of tokens approved for spending.
   * returns success: Boolean result of the attempted approval.
   */
  function approve(address _spender, uint _value) canTransfer public returns (bool success) {
    return super.approve(_spender, calculateTokens(_value));
  }

  /*
   * Description: Overrides ERC20 token 'increaseApproval' method, 
   *              locking functionality until tokens are transferable.
   *
   * param _spender: Address to increase approval for.
   * param _value: The amount of tokens to increase approval
   *               by for spending.
   * returns success: Boolean result of the attempted approval.
   */
  function increaseApproval(address _spender, uint _addedValue) canTransfer public returns (bool) {
    return super.increaseApproval(_spender, calculateTokens(_addedValue));
  }

  /**
   * Description: Overrides ERC20 token 'decreaseApproval' method, 
   *              locking functionality until tokens are transferable.
   *
   * param _spender: Address to increase approval for.
   * param _subtractedValue: The amount of tokens to 
   *.                  decrease approval by.
   * returns success: Boolean result of the attempted approval.
   */
  function decreaseApproval(address _spender, uint _subtractedValue) canTransfer public returns (bool) {
    return super.decreaseApproval(_spender, calculateTokens(_subtractedValue));
  }

  /**
   * Description: Modifier to validate requests for token transfers.
   *
   * param _amount: The amount of tokens requested for minting.
   */
  modifier canTransfer() {
    require(isTransferable);
    _;
  }

}
