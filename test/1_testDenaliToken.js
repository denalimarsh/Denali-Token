import EVMRevert from './helpers/EVMRevert';

const DenaliToken = artifacts.require('DenaliToken');
const TestContractDenaliToken = artifacts.require('TestContractDenaliToken');

const BigNumber = web3.BigNumber;
const HDWalletAccounts = require("hdwallet-accounts");

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const walletAccounts = HDWalletAccounts(70);

contract('DenaliToken', function (accounts, walletAccounts) {

  const tokenOwner = accounts[0];
  const userOne = accounts[1];
  const userTwo = accounts[2];
  const userThree = accounts[3];

  describe('Deployment and instantiation', function(){

    describe('Happy path:', function(){

      beforeEach(async function() {
        this.token = await DenaliToken.new();
      });

      it('should deploy the token with the correct parameters', async function () {
        this.token.should.exist;
        
        const tokenName = (await this.token.name());
        const tokenSymbol = (await this.token.symbol());
        const tokenDecimals = (await this.token.decimals());

        tokenName.should.be.equal("DenaliToken");
        tokenSymbol.should.be.equal("DMT");
        tokenDecimals.should.be.bignumber.equal(18);
      });

      it('should allow ownership of the token to be transfered to the crowdsale contract', async function () {
        //Confirm that current owner is the address that deployed the token
        const owner = await this.token.owner();
        owner.should.be.equal(tokenOwner);

        //Transfer ownership and confirm new owner
        await this.token.transferOwnership(userTwo);
        const newOwner = await this.token.owner();
        newOwner.should.be.equal(userTwo);
      });

      it('should initially set the \'mintingFinished\' boolean to false', async function () {
        //Check the current minting status
        const mintingStatus = await this.token.mintingFinished();
        mintingStatus.should.be.equal(false);
      });

    });

  });

  describe('Tokens locked for transfers', function(){

    describe('Happy path:', function(){

      beforeEach(async function() {
        this.token = await DenaliToken.new();

        //Mint 5,000 tokens to a user for testing transfers
        this.token.mint(userOne, 5000, { from: tokenOwner });
        //Confirm that there is an availalbe balance for transferring 
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(5000 * 10**18);
      });

      it('should initially lock tokens for all \'transfer\' method calls', async function () {
        //Attempt to 'transfer' tokens from loaded account
        await this.token.transfer(userTwo, 1000, { from: userOne }).should.be.rejectedWith(EVMRevert);
      });

      it('should initially lock tokens for all \'transferFrom\' method calls', async function () {
        //Attempt to transfer tokens from loaded account using 'approve' and 'transferFrom'
        await this.token.approve(userTwo, 1000, { from: userOne }).should.be.rejectedWith(EVMRevert);
        await this.token.transferFrom(userOne, userThree, 1000, { from: userTwo }).should.be.rejectedWith(EVMRevert);

        //Confirm that the user has a token balance of 0 and no transfer has occured
        (await this.token.balanceOf(userThree)).should.be.bignumber.equal(0);
      });

      it('should initially lock tokens for all \'increaseApproval\' method calls', async function () {
        //Attempt to 'increaseApproval' from loaded account
        await this.token.increaseApproval(userTwo, 1000, { from: userOne }).should.be.rejectedWith(EVMRevert);
      });

      it('should initially lock tokens for all \'decreaseApproval\' method calls', async function () {
        //Attempt to 'decreaseApproval' from loaded account
        await this.token.decreaseApproval(userTwo, 1000, { from: userOne }).should.be.rejectedWith(EVMRevert);
      });

    });

  });

  describe('General self-minting functionality (by owner)', function(){

    describe('Happy path:', function(){
      
      beforeEach(async function() {
        this.token = await DenaliToken.new();
      });

      it('should allow the owner of the token contract to mint tokens to a specified address', async function () {
        //Mint tokens and check investor's balance
        await this.token.mint(userOne, 5000, { from: tokenOwner }).should.be.fulfilled;
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(5000 * 10**18);
      });

      it('should log an event upon successful minting of tokens with the user\'s address and number of tokens minted', async function () {
        const mintAmount = 5000;
        
        //Get the logs from the minting token event
        const {logs} = await this.token.mint(userOne, mintAmount, { from: tokenOwner }).should.be.fulfilled;
        const event = logs.find(e => e.event === 'Mint');

        //Check the event's parameters
        event.args.to.should.be.equal(userOne);
        event.args.amount.should.be.bignumber.equal(mintAmount * 10**18);
      });

      it('should increase the total supply correctly upon successive token mints', async function () {
        const mintAmount = 5000;

        //Mint tokens to a user's address and check the total supply
        await this.token.mint(userOne, mintAmount, { from: tokenOwner }).should.be.fulfilled;
        (await this.token.totalSupply()).should.be.bignumber.equal(5000 * 10**18);

        //Mint tokens to the same user's address and check the total supply
        await this.token.mint(userOne, mintAmount, { from: tokenOwner }).should.be.fulfilled;
        (await this.token.totalSupply()).should.be.bignumber.equal(10000 * 10**18);

        //Mint tokens to another unique user's address and check the total supply
        await this.token.mint(userTwo, mintAmount, { from: tokenOwner }).should.be.fulfilled;
        (await this.token.totalSupply()).should.be.bignumber.equal(15000 * 10**18);     
      });

      it('should keep tokens locked for transfers during the first distribution phase', async function () {
        //Load an account with tokens to test transfers
        const transferTokenAmount = 25000;
        await this.token.mint(userOne, transferTokenAmount, { from: tokenOwner }).should.be.fulfilled;

        //Attempt to transfer tokens using 'transfer'
        await this.token.transfer(userTwo, transferTokenAmount, { from: userOne }).should.be.rejectedWith(EVMRevert);
      });

    });

    beforeEach(async function() {
      this.token = await DenaliToken.new();
    });

    it('should not allow the owner to mint tokens to a null address', async function () {
      const nullReceiver = '0x0';
      await this.token.selfMint(1000, { from: nullReceiver }).should.be.rejectedWith('invalid address');
    });

    it('should not allow anyone other than the owner to mint tokens', async function () {
      //Attempt to mint tokens by non-owner
      await this.token.mint(userOne, 5000, { from: userTwo }).should.be.rejectedWith(EVMRevert);
    });

    it('should not allow anyone else besides the owner to self mint tokens during the first distribution phase', async function () {
      //Attempt to self mint tokens by non-owner
      await this.token.selfMint(5000, { from: userTwo }).should.be.rejectedWith(EVMRevert);

      //Attempt to self mint tokens by owner
      await this.token.selfMint(5000, { from: tokenOwner }).should.be.rejectedWith(EVMRevert);
    });

    it('should not allow the owner to finish minting during the first distribution phase', async function () {
      //Attempt by owner to call 'finishMinting' method
      await this.token.finishMinting({ from: tokenOwner }).should.be.fulfilled;

      //Confirm that minting has not been finished
      const mintingStatus = await this.token.mintingFinished();
      mintingStatus.should.be.equal(false);
    });

  });

  describe('General self-minting functionality (by users)', function(){

    describe('Happy path:', function(){
      beforeEach(async function() {
        this.token = await DenaliToken.new();
        //Mint 3 million tokens and enter the second distribution phase
        for(var i = 4; i < 10; i ++){
          await this.token.mint(accounts[i], 500000, { from: tokenOwner });
        }
        //Check total supply is equal to 3 million
        (await this.token.totalSupply()).should.be.bignumber.equal(3000000 * 10**18);
      });

      it('should allow a user to call a method and successfully mint tokens to their address', async function () {
        await this.token.selfMint(1000, {from: userOne}).should.be.fulfilled;
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(1000 * 10**18);
      });

      it('should update a user\'s individual self mint count after a successful self mint', async function () {
        await this.token.selfMint(1000, {from: userOne}).should.be.fulfilled;
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(1000 * 10**18);
      });

      it('should log an event upon successful self minting of tokens with the user\'s address and number of tokens minted', async function () {
        const mintAmount = 1000;
        
        //Get the logs from the minting token event
        const {logs} = await this.token.selfMint(mintAmount, { from: userOne });
        const event = logs.find(e => e.event === 'TokensMintedByUser');

        const currentTotalSupply = ((3000000 + 1000) * 10**18);

        //Check the event's parameters
        event.args._address.should.be.equal(userOne);
        event.args._amount.should.be.bignumber.equal((mintAmount * 10**18).toString());
        event.args._currentTotalSupply.should.be.bignumber.equal((currentTotalSupply).toString());
      });

      it('should increase the total supply correctly upon successive token mints', async function () {
        const mintAmount = 500;
        const initialSupply = 3000000 * 10**18;

        //Mint tokens to a user's address and check the total supply
        await this.token.selfMint(mintAmount, { from: userOne }).should.be.fulfilled;
        (await this.token.totalSupply()).should.be.bignumber.equal(3000500 * 10**18);

        //Mint tokens to the same user's address and check the total supply
        await this.token.selfMint(mintAmount, { from: userOne }).should.be.fulfilled;
        (await this.token.totalSupply()).should.be.bignumber.equal(3001000 * 10**18);

        //Mint tokens to another unique user's address and check the total supply
        await this.token.selfMint(mintAmount, { from: userTwo }).should.be.fulfilled;
        (await this.token.totalSupply()).should.be.bignumber.equal(3001500 * 10**18);     
      });

      it('should keep tokens locked for transfers during the second distribution phase', async function () {
        //Load an account with tokens to test transfers
        const transferTokenAmount = 2500;
        await this.token.selfMint(transferTokenAmount, { from: userOne }).should.be.fulfilled;

        //Attempt to transfer tokens using 'transfer'
        await this.token.transfer(userTwo, transferTokenAmount, { from: userOne }).should.be.rejectedWith(EVMRevert);
      });

    });

    beforeEach(async function() {
      this.token = await DenaliToken.new();
      //Mint 3 million tokens and enter the second distribution phase
      for(var i = 4; i < 10; i ++){
        await this.token.mint(accounts[i], 500000, { from: tokenOwner });
      }
      //Check total supply is equal to 3 million
      (await this.token.totalSupply()).should.be.bignumber.equal(3000000 * 10**18);
    });

    it('should not allow a user to mint tokens to a null address', async function () {
      const nullReceiver = '0x0';
      await this.token.selfMint(1000, { from: nullReceiver }).should.be.rejectedWith('invalid address');
    });

    it('should not allow the owner to self mint tokens', async function () {
      const mintAmount = 5000; 

      //Attempt by token owner to self mint tokens
      await this.token.selfMint(mintAmount, { from: tokenOwner }).should.be.rejectedWith(EVMRevert);
    });

    it('should not allow the owner to mint tokens during the second distribution phase', async function () {
      const mintAmount = 5000; 

      //Attempt to by token owner to mint tokens
      await this.token.mint(userOne, 5000, { from: tokenOwner }).should.be.rejectedWith(EVMRevert);
    });

    it('should not allow the owner to finish minting during the second distribution phase', async function () {
      //Attempt by owner to call 'finishMinting' method
      await this.token.finishMinting({ from: tokenOwner }).should.be.fulfilled;

      //Confirm that minting has not been finished
      const mintingStatus = await this.token.mintingFinished();
      mintingStatus.should.be.equal(false);
    });
});

describe('Tokens unlocked for transfers', function(){

    describe('Happy path', function(){

      beforeEach(async function() {
        this.token = await TestContractDenaliToken.new();

        //Set total supply to 9,999,000 tokens, 1,000 tokens below the total token cap
        this.token.setTotalSupply(9999000);
        //Confirm that the total supply has been correctly set
        (await this.token.totalSupply()).should.be.bignumber.equal(9999000 * 10**18);

        //Mint tokens to preload an account and to increase total supply to equal token cap
        await this.token.selfMint(1000, { from: userOne }).should.be.fulfilled;
        //Confirm account is loaded with tokens
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(1000 * 10**18);
        //Confirm that the total supply is equal to the total token cap
        (await this.token.totalSupply()).should.be.bignumber.equal(10000000 * 10**18);
      });

      it('should unlock tokens for \'transfer\' if the total supply is equal to the total token cap', async function () {
        //Attempt to transfer tokens using 'transfer'
        await this.token.transfer(userTwo, 1000, { from: userOne }).should.be.fulfilled;
        (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(1000 * 10**18);
      });

      it('should unlock tokens for \'transferFrom\' if the total supply is equal to the total token cap', async function () {
        //Attempt to transfer tokens using 'approve' and 'transferFrom'
        await this.token.approve(userTwo, 1000, { from: userOne }).should.be.fulfilled;
        await this.token.transferFrom(userOne, userThree, 1000, { from: userTwo }).should.be.fulfilled;
        (await this.token.balanceOf(userThree)).should.be.bignumber.equal(1000 * 10**18);
      });

      it('should unlock tokens for \'increaseApproval\' if the total supply is equal to the total token cap', async function () {
        //Attempt to call 'increaseApproval'
        await this.token.increaseApproval(userTwo, 1000, { from: userOne }).should.be.fulfilled;
      });

      it('should unlock tokens for \'decreaseApproval\' if the total supply is equal to the total token cap', async function () {
        //Attempt to call 'decreaseApproval'
        await this.token.decreaseApproval(userTwo, 1000, { from: userOne }).should.be.fulfilled;
      });

    });
    
  });

  describe('Minting finished', function(){

    describe('Happy path', function(){

      beforeEach(async function() {
        this.token = await TestContractDenaliToken.new();

        //Set total supply to 9,999,000 tokens, 1,000 tokens below the total token cap
        this.token.setTotalSupply(9999000);
        //Confirm that the total supply has been correctly set
        (await this.token.totalSupply()).should.be.bignumber.equal(9999000 * 10**18);
      });

      it('should not allow the owner of the token contract to finish minting tokens before the total token cap is reached', async function () {
        //Attempt by owner to call 'finishMinting' method
        await this.token.finishMinting({ from: tokenOwner }).should.be.fulfilled;

        //Confirm that minting has not been finished
        const mintingStatus = await this.token.mintingFinished();
        mintingStatus.should.be.equal(false);
      });    

      it('should automatically finish minting once the total supply is equal to the total token cap', async function () {
        //Check the minting status before total token cap is reached
        const mintingStatus = await this.token.mintingFinished();
        mintingStatus.should.be.equal(false);

        //Self mint tokens, increasing the total supply to the total token cap
        await this.token.selfMint(1000, { from: userOne }).should.be.fulfilled;

        //Check the minting status after the total token cap has been reached
        const newMintingStatus = await this.token.mintingFinished();
        newMintingStatus.should.be.equal(true);

      });

      it('should log an event upon automatically finishing minting once the total supply is equal to the total token cap', async function () {
        const mintAmount = 1000;

        //Increase total supply to maximum supply by self minting to capture event logs
        const {logs} = await this.token.selfMint(mintAmount, { from: userOne });
        const event = logs.find(e => e.event === 'MintFinished');

        //Check the event's name
        event.event.should.be.equal('MintFinished');
      });

    });

  });

});