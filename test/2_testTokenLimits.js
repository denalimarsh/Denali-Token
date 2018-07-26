import EVMRevert from './helpers/EVMRevert';

const DenaliToken = artifacts.require('DenaliToken');
const TestContractDenaliToken = artifacts.require('TestContractDenaliToken');

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('DenaliToken', function (accounts) {

  const tokenOwner = accounts[0];
  const userOne = accounts[1];
  const userTwo = accounts[2];
  const userThree = accounts[3];


  describe('\'OWNER_MINT_LIMIT\': Testing first phase individual user minting limit', function(){

    describe('Happy path:', function(){
      
      beforeEach(async function() {
        this.token = await DenaliToken.new();
      });

      it('should correctly store the OWNER_MINT_LIMIT correctly as 500,000 tokens', async function () {
        const savedLimit = await this.token.OWNER_MINT_LIMIT();
        savedLimit.should.be.bignumber.equal(500000 * 10**18);
      });

      it('should allow requested mints if the user\'s balances are under the 500,000 OWNER_MINT_LIMIT', async function () {
        //Mint 250,000 tokens and check user's current balance
        await this.token.mint(userOne, 250000, { from: tokenOwner }).should.be.fulfilled;
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(250000 * 10**18);

        //Mint another 250,000 tokens and check user's current balance
        await this.token.mint(userOne, 250000, { from: tokenOwner }).should.be.fulfilled;
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(500000 * 10**18);
      });

      it('should allow requested successive mints if the user\'s balances are under the 500,000 OWNER_MINT_LIMIT', async function () {
        //Minting 5,000 tokens to the same user address should allow for 100 successful mints
        for(var i = 0; i < 100; i++){
          await this.token.mint(userOne, 5000, { from: tokenOwner }).should.be.fulfilled;
        }
        //Confirm that user has the correct balance of exactly 500,000 tokens
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(500000 * 10**18);
      });

      it('should allow requested mints of exactly 500,000 tokens if the user currently has a balance of 0', async function () {
        //Confirm that the user has a balance of 0
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(0);
        //Mint exactly 500,000 tokens to the user
        await this.token.mint(userOne, 500000, { from: tokenOwner }).should.be.fulfilled;
        //Confirm that the user has a balance of 500,000
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(500000 * 10**18);
      });

      it('should allow requested mints of 1 token if the user currently has a balance of 499,999 tokens', async function () {
        //Mint 499,999 tokens to user, 1 below the 500,000 limit
        await this.token.mint(userOne, 499999, { from: tokenOwner }).should.be.fulfilled;
        //Confirm that user has the correct balance of exactly 499,999 tokens
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(499999 * 10**18);

        //Confirm that the owner can mint 1 more token to user
        await this.token.mint(userOne, 1, { from: tokenOwner }).should.be.fulfilled;
        //Confirm that user has the correct balance of exactly 500,000 tokens
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(500000 * 10**18);
      });

      it('should correctly maintain the 500,000 OWNER_MINT_LIMIT if ownership is transferred to a new address', async function () {
        //Confirm original owner of token contract
        const originalOwner = (await this.token.owner());
        originalOwner.should.be.equal(tokenOwner);

        //Mint 500,000 tokens to a user's address
        await this.token.mint(userOne, 500000, { from: tokenOwner }).should.be.fulfilled;
        //Confirm that the user's balance has reached the mint limit
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(500000 * 10**18);

        //Transfer ownership of token contract
        await this.token.transferOwnership(userTwo);
        //Confirm new owner of token contract
        const newOwner = (await this.token.owner());
        newOwner.should.be.equal(userTwo);

        //Attempt to mint additional tokens to a user whose balance equals the mint limit
        await this.token.mint(userOne, 100, { from: userTwo }).should.be.rejectedWith(EVMRevert);
      });

      it('should correctly maintain the 500,000 OWNER_MINT_LIMIT for multiple unique users if ownership is transferred to a new address', async function () {
        //Confirm original owner of token contract
        const originalOwner = (await this.token.owner());
        originalOwner.should.be.equal(tokenOwner);

        //Mint 500,000 tokens to the first user's address
        await this.token.mint(userOne, 500000, { from: tokenOwner }).should.be.fulfilled;
        //Confirm that the first user's balance has reached the mint limit
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(500000 * 10**18);

        //Mint 250,000 tokens to the second user's address
        await this.token.mint(userTwo, 250000, { from: tokenOwner }).should.be.fulfilled;
        //Confirm that the second user's balance is under the mint limit
        (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(250000 * 10**18);

        //Transfer ownership of token contract
        await this.token.transferOwnership(userThree);
        //Confirm new owner of token contract
        const newOwner = (await this.token.owner());
        newOwner.should.be.equal(userThree);

        //Attempt to mint additional tokens to the first user's address
        await this.token.mint(userOne, 100, { from: userThree }).should.be.rejectedWith(EVMRevert);

        //Mint another 250,000 tokens to the second user's address
        await this.token.mint(userTwo, 250000, { from: userThree }).should.be.fulfilled;
        //Confirm that the second user's balance has reached the mint limit
        (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(500000 * 10**18);

        //Attempt to mint additional tokens to the second user's address
        await this.token.mint(userTwo, 100, { from: userThree }).should.be.rejectedWith(EVMRevert);
      });

      it('should allow requested mints to multiple unique users if each user\'s balances are below the 500,000 OWNER_MINT_LIMIT', async function () {
        //First mint of 125,000 tokens to three different users with unique addresses
        await this.token.mint(userOne, 125000, { from: tokenOwner }).should.be.fulfilled;
        await this.token.mint(userTwo, 125000, { from: tokenOwner }).should.be.fulfilled;
        await this.token.mint(userThree, 125000, { from: tokenOwner }).should.be.fulfilled;
        //Confirm that all three users' balances are below the 500,000 token limit
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(125000 * 10**18);
        (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(125000 * 10**18);
        (await this.token.balanceOf(userThree)).should.be.bignumber.equal(125000 * 10**18);

        //Second mint of 125,000 tokens to three different users with unique addresses
        await this.token.mint(userOne, 125000, { from: tokenOwner }).should.be.fulfilled;
        await this.token.mint(userTwo, 125000, { from: tokenOwner }).should.be.fulfilled;
        await this.token.mint(userThree, 125000, { from: tokenOwner }).should.be.fulfilled;
        //Confirm that all three users' balances are below the 500,000 token limit
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(250000 * 10**18);
        (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(250000 * 10**18);
        (await this.token.balanceOf(userThree)).should.be.bignumber.equal(250000 * 10**18);

        //Third mint of 125,000 tokens to three different users with unique addresses
        await this.token.mint(userOne, 125000, { from: tokenOwner }).should.be.fulfilled;
        await this.token.mint(userTwo, 125000, { from: tokenOwner }).should.be.fulfilled;
        await this.token.mint(userThree, 125000, { from: tokenOwner }).should.be.fulfilled;
        //Confirm that all three users' balances are below the 500,000 token limit
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(375000 * 10**18);
        (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(375000 * 10**18);
        (await this.token.balanceOf(userThree)).should.be.bignumber.equal(375000 * 10**18);

        //Fourth mint of 125,000 tokens to three different users with unique addresses
        await this.token.mint(userOne, 125000, { from: tokenOwner }).should.be.fulfilled;
        await this.token.mint(userTwo, 125000, { from: tokenOwner }).should.be.fulfilled;
        await this.token.mint(userThree, 125000, { from: tokenOwner }).should.be.fulfilled;
        //Confirm that all three users' balances are equal to the 500,000 token limit
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(500000 * 10**18);
        (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(500000 * 10**18);
        (await this.token.balanceOf(userThree)).should.be.bignumber.equal(500000 * 10**18);
      });

    });

    beforeEach(async function() {
      this.token = await DenaliToken.new();
    });

    it('should not allow requested mints larger than the 500,000 OWNER_MINT_LIMIT', async function () {
        //500,001 tokens is just over the 500,000 mint limit
        const overMintAmount = 500001;
        //Attempt to mint tokens over the limit
        await this.token.mint(userOne, overMintAmount, { from: tokenOwner }).should.be.rejectedWith(EVMRevert);
    });

    it('should not allow requested mints if the the mint places user\'s balances above the 500,000 OWNER_MINT_LIMIT', async function () {
        //Minting 5,000 tokens to the same user address should allow for 100 successful mints
        for(var i = 0; i < 100; i++){
          await this.token.mint(userOne, 5000, { from: tokenOwner }).should.be.fulfilled;
        }
        //Confirm that user has the correct balance of exactly 500,000 tokens
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(500000 * 10**18);

        //Attempt to mint tokens now that the user has reached their limit
        await this.token.mint(userOne, 1000, { from: tokenOwner }).should.be.rejectedWith(EVMRevert);
    });

    it('should not allow requested mints if the user\'s balance is equal to the 500,000 OWNER_MINT_LIMIT', async function () {
      //Mint 500,000 tokens to the user
      await this.token.mint(userOne, 500000, { from: tokenOwner }).should.be.fulfilled;
      //Confirm that user has the correct balance of exactly 500,000 tokens
      (await this.token.balanceOf(userOne)).should.be.bignumber.equal(500000 * 10**18);

      //Attempt to self mint 1 token above the limit
      await this.token.mint(userOne, 1, { from: tokenOwner }).should.be.rejectedWith(EVMRevert);
    });

    it('should dynamically not allow requested mints to multiple unique users as they individually reach the 500,000 OWNER_MINT_LIMIT', async function () {
      //First mint of 450,000 tokens to three different users with unique addresses
      await this.token.mint(userOne, 450000, { from: tokenOwner }).should.be.fulfilled;
      await this.token.mint(userTwo, 450000, { from: tokenOwner }).should.be.fulfilled;
      await this.token.mint(userThree, 450000, { from: tokenOwner }).should.be.fulfilled;

      //Confirm that all three users' balances are below the 450,000 token limit
      (await this.token.balanceOf(userOne)).should.be.bignumber.equal(450000 * 10**18);
      (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(450000 * 10**18);
      (await this.token.balanceOf(userThree)).should.be.bignumber.equal(450000 * 10**18);

      //1. First attempted mint 10,000 tokens to the first user, 12,500 to the second user, and 25,000 to the third user
      await this.token.mint(userOne, 10000, { from: tokenOwner }).should.be.fulfilled;
      await this.token.mint(userTwo, 12500, { from: tokenOwner }).should.be.fulfilled;
      await this.token.mint(userThree, 25000, { from: tokenOwner }).should.be.fulfilled;

      //Confirm that all three users' balances are at their expected token amount
      (await this.token.balanceOf(userOne)).should.be.bignumber.equal(460000 * 10**18);
      (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(462500 * 10**18);
      (await this.token.balanceOf(userThree)).should.be.bignumber.equal(475000 * 10**18);

      //2. Second attempted mint 10,000 tokens to the first user, 12,500 to the second user, and 25,000 to the third user
      await this.token.mint(userOne, 10000, { from: tokenOwner }).should.be.fulfilled;
      await this.token.mint(userTwo, 12500, { from: tokenOwner }).should.be.fulfilled;
      await this.token.mint(userThree, 25000, { from: tokenOwner }).should.be.fulfilled;

      //Confirm that all three users' balances are at their expected token amount
      (await this.token.balanceOf(userOne)).should.be.bignumber.equal(470000 * 10**18);
      (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(475000 * 10**18);
      //The third user's balance has reached the 500,000 limit
      (await this.token.balanceOf(userThree)).should.be.bignumber.equal(500000 * 10**18);

      //3. Third attempted mint 10,000 tokens to the first user, 12,500 to the second user, and 25,000 to the third user
      await this.token.mint(userOne, 10000, { from: tokenOwner }).should.be.fulfilled;
      await this.token.mint(userTwo, 12500, { from: tokenOwner }).should.be.fulfilled;
      //This attempted mint to the third user should be rejected, as the user has reached the 500,000 token limit
      await this.token.mint(userThree, 25000, { from: tokenOwner }).should.be.rejectedWith(EVMRevert);

      //Confirm that all three users' balances are at their expected token amount
      (await this.token.balanceOf(userOne)).should.be.bignumber.equal(480000 * 10**18);
      (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(487500 * 10**18);
      (await this.token.balanceOf(userThree)).should.be.bignumber.equal(500000 * 10**18);

      //4. Fourth attempted mint 10,000 tokens to the first user, 12,500 to the second user, and 25,000 to the third user
      await this.token.mint(userOne, 10000, { from: tokenOwner }).should.be.fulfilled;
      await this.token.mint(userTwo, 12500, { from: tokenOwner }).should.be.fulfilled;
      //Attempted mints to the third user should continue to be rejected
      await this.token.mint(userThree, 25000, { from: tokenOwner }).should.be.rejectedWith(EVMRevert);

      //Confirm that all three users' balances are at their expected token amount
      (await this.token.balanceOf(userOne)).should.be.bignumber.equal(490000 * 10**18);
      //The second user's balance has reached the 100,000 limit
      (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(500000 * 10**18);
      (await this.token.balanceOf(userThree)).should.be.bignumber.equal(500000 * 10**18);

      //5. Fifth attempted mint 10,000 tokens to the first user, 12,500 to the second user, and 25,000 to the third user
      await this.token.mint(userOne, 10000, { from: tokenOwner }).should.be.fulfilled;
      //This attempted mint to the second user should be rejected, as the user has reached the 500,000 token limit
      await this.token.mint(userTwo, 12500, { from: tokenOwner }).should.be.rejectedWith(EVMRevert);
      //Attempted mints to the third user should continue to be rejected
      await this.token.mint(userThree, 25000, { from: tokenOwner }).should.be.rejectedWith(EVMRevert);

      //Confirm that all three users' balances are at their expected token amount
      //The first user's balance has reached the 500,000 limit
      (await this.token.balanceOf(userOne)).should.be.bignumber.equal(500000 * 10**18);
      (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(500000 * 10**18);
      (await this.token.balanceOf(userThree)).should.be.bignumber.equal(500000 * 10**18);

      //6. Sixth attempted mint 10,000 tokens to the first user, 12,500 to the second user, and 25,000 to the third user
      //Attempted mints to the first, second, and third user should all be rejected
      await this.token.mint(userOne, 10000, { from: tokenOwner }).should.be.rejectedWith(EVMRevert);
      await this.token.mint(userTwo, 12500, { from: tokenOwner }).should.be.rejectedWith(EVMRevert);
      await this.token.mint(userThree, 25000, { from: tokenOwner }).should.be.rejectedWith(EVMRevert);

      //Confirm that all three users' balances are at their expected token amount
      (await this.token.balanceOf(userOne)).should.be.bignumber.equal(500000 * 10**18);
      (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(500000 * 10**18);
      (await this.token.balanceOf(userThree)).should.be.bignumber.equal(500000 * 10**18);

    });

  });

  describe('\'OWNER_MINT_CAP\': Testing first phase total minting limit', function(){

    describe('Happy path:', function(){

      beforeEach(async function() {
        this.token = await TestContractDenaliToken.new();
        //Set the total supply 1 million tokens below the owner mint cap of 3 million
        this.token.setTotalSupply(2000000);
      });

      it('should correctly store the OWNER_MINT_CAP correctly as 3,000,000 tokens', async function () {
        const savedLimit = await this.token.OWNER_MINT_CAP();
        savedLimit.should.be.bignumber.equal(3000000 * 10**18);
      });

      it('should allow requested mints if the total supply is less than the OWNER_MINT_CAP', async function () {
        //Confirm total supply is less than the owner mint cap
        (await this.token.totalSupply()).should.be.bignumber.equal(2000000 * 10**18);

        //Mint tokens to user
        await this.token.mint(userOne, 500000, { from: tokenOwner }).should.be.fulfilled;
      });

      it('should allow requested mints to multiple unique users if the total supply is less than the OWNER_MINT_CAP', async function () {
        //Confirm total supply is less than the owner mint cap
        (await this.token.totalSupply()).should.be.bignumber.equal(2000000 * 10**18);

        //Mint 150,000 tokens to the first user
        await this.token.mint(userOne, 150000, { from: tokenOwner }).should.be.fulfilled;
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(150000 * 10**18);

        //Confirm total supply is still less than the owner mint cap
        (await this.token.totalSupply()).should.be.bignumber.equal(2150000 * 10**18);

        //Mint 150,000 tokens to the second user
        await this.token.mint(userTwo, 150000, { from: tokenOwner }).should.be.fulfilled;
        (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(150000 * 10**18);

        //Confirm total supply is still less than the owner mint cap
        (await this.token.totalSupply()).should.be.bignumber.equal(2300000 * 10**18);

        //Mint 150,000 tokens to the third user
        await this.token.mint(userThree, 150000, { from: tokenOwner }).should.be.fulfilled;
        (await this.token.balanceOf(userThree)).should.be.bignumber.equal(150000 * 10**18);
      });

      it('should correctly update the total supply to be equal to the OWNER_MINT_CAP when a successful mint raises the total supply to 3,000,000', async function () {
        //Mint tokens but do not surpass the owner mint cap
        await this.token.mint(userOne, 500000, { from: tokenOwner }).should.be.fulfilled;
        //Confirm that the total supply has increased but has not reached the owner mint cap
        (await this.token.totalSupply()).should.be.bignumber.equal(2500000 * 10**18);

        //Mint tokens to reach the owner mint cap
        await this.token.mint(userTwo, 500000, { from: tokenOwner }).should.be.fulfilled;
        //Confirm that the total supply has reached the owner mint cap
        (await this.token.totalSupply()).should.be.bignumber.equal(3000000 * 10**18);
      });

    });

    beforeEach(async function() {
      this.token = await TestContractDenaliToken.new();
      this.token.setTotalSupply(3000000);
      //Confirm total supply is equal to the owner mint cap
      (await this.token.totalSupply()).should.be.bignumber.equal(3000000 * 10**18);
    });

    it('should not allow requested mints if the OWNER_MINT_CAP has been reached', async function () {
      //Attempt to mint tokens
      await this.token.mint(userOne, 1, { from: tokenOwner }).should.be.rejectedWith(EVMRevert);

      //Confirm that no tokens were minted
      (await this.token.balanceOf(userOne)).should.be.bignumber.equal(0);

      //Confirm that the total supply has not increased
      (await this.token.totalSupply()).should.be.bignumber.equal(3000000 * 10**18);
    });

    it('should not allow requested mints if the OWNER_MINT_CAP has been reached even if ownership is transferred', async function () {
      //Confirm original owner of token contract
      const originalOwner = (await this.token.owner());
      originalOwner.should.be.equal(tokenOwner);

      //Attempt to mint tokens
      await this.token.mint(userOne, 1, { from: tokenOwner }).should.be.rejectedWith(EVMRevert);
      //Confirm that no tokens were minted
      (await this.token.balanceOf(userOne)).should.be.bignumber.equal(0);

      //Transfer ownership of token contract
      await this.token.transferOwnership(userTwo);
      //Confirm new owner of token contract
      const newOwner = (await this.token.owner());
      newOwner.should.be.equal(userTwo);

      //Attempt to mint additional tokens to the first user's address
      await this.token.mint(userOne, 1, { from: userTwo }).should.be.rejectedWith(EVMRevert);
      //Confirm that no tokens were minted
      (await this.token.balanceOf(userOne)).should.be.bignumber.equal(0);
    });

  });

  describe('\'SELF_MINT_LIMIT\': Testing second phase individual user self minting limit', function(){

    describe('Happy path:', function(){

      beforeEach(async function() {
        this.token = await TestContractDenaliToken.new();
        //Set the total supply so that we are under the self mint limit
        this.token.setTotalSupply(3000000);
        (await this.token.totalSupply()).should.be.bignumber.equal(3000000 * 10**18);
      });

      it('should correctly store the SELF_MINT_LIMIT correctly as 100,000 tokens', async function () {
        const savedLimit = await this.token.SELF_MINT_LIMIT();
        savedLimit.should.be.bignumber.equal(100000 * 10**18);
      });

      it('should correctly update a user\'s self mint count and balances upon a successful self mint', async function () {
        await this.token.selfMint(1000, {from: userOne}).should.be.fulfilled;
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(1000 * 10**18);
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(1000 * 10**18);
      });

      it('should allow requested self mints by a user if the user\'s self mint count is under the 100,000 SELF_MINT_LIMIT', async function () { 
        //Confirm that the user's self mint count is under the self mint limit
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(0);
        //First self mint of tokens while user is under their self mint limit
        await this.token.selfMint(50000, { from: userOne }).should.be.fulfilled;

        //Confirm that the user's self mint count is under the self mint limit
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(50000 * 10**18);
        //Second self mint of tokens while user is under their self mint limit
        await this.token.selfMint(50000, { from: userOne }).should.be.fulfilled;

        //Confirm that the self mints were both successful
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(100000 * 10**18);

        //Confirm that the user's self mint count has increased to the self mint limit
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(100000 * 10**18);
      });

      it('should allow requested successive self mints by a user if the user\'s balances are under the 100,000 SELF_MINT_LIMIT', async function () {
        //Minting 1000 tokens to the same user address should allow for 100 successful mints
        for(var i = 0; i < 100; i++){
          await this.token.selfMint(1000, { from: userOne }).should.be.fulfilled;
        }
        //Confirm that user has the correct balance of exactly 100,000 tokens
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(100000 * 10**18);
      });

      it('should allow requested self mints of exactly 100,000 tokens if the user currently has a self mint count of 0', async function () {
        //Confirm that the user has not self minted any tokens yet
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(0);

        //Mint exactly 100,000 tokens to the user
        await this.token.selfMint(100000, {from: userOne}).should.be.fulfilled;

        //Confirm that the self mint was successful
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(100000 * 10**18);
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(100000 * 10**18);
      });

      it('should allow requested self mints of 1 token if the user currently has a self mint count of 99,999 tokens', async function () {
        //Self mint tokens to put user at 99,999 tokens and confirm self mint count
        await this.token.selfMint(99999, { from: userOne }).should.be.fulfilled;
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(99999 * 10**18);

        //Self mint 1 more token
        await this.token.selfMint(1, { from: userOne }).should.be.fulfilled;
      });

      it('should allow requested self mints to multiple unique users provided that each user\'s self mint count is below the 100,000 SELF_MINT_LIMIT', async function () {
        //First mint of 25,000 tokens to three different users with unique addresses
        await this.token.selfMint(25000, { from: userOne }).should.be.fulfilled;
        await this.token.selfMint(25000, { from: userTwo }).should.be.fulfilled;
        await this.token.selfMint(25000, { from: userThree }).should.be.fulfilled;
        //Confirm that all three users' self mint counts are below the 100,000 token limit
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(25000 * 10**18);
        (await this.token.selfMintCount(userTwo)).should.be.bignumber.equal(25000 * 10**18);
        (await this.token.selfMintCount(userThree)).should.be.bignumber.equal(25000 * 10**18);

        //Second mint of 25,000 tokens to three different users with unique addresses
        await this.token.selfMint(25000, { from: userOne }).should.be.fulfilled;
        await this.token.selfMint(25000, { from: userTwo }).should.be.fulfilled;
        await this.token.selfMint(25000, { from: userThree }).should.be.fulfilled;
        //Confirm that all three users' self mint counts are below the 100,000 token limit
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(50000 * 10**18);
        (await this.token.selfMintCount(userTwo)).should.be.bignumber.equal(50000 * 10**18);
        (await this.token.selfMintCount(userThree)).should.be.bignumber.equal(50000 * 10**18);

        //Third mint of 25,000 tokens to three different users with unique addresses
        await this.token.selfMint(25000, { from: userOne }).should.be.fulfilled;
        await this.token.selfMint(25000, { from: userTwo }).should.be.fulfilled;
        await this.token.selfMint(25000, { from: userThree }).should.be.fulfilled;
        //Confirm that all three users' self mint counts are below the 100,000 token limit
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(75000 * 10**18);
        (await this.token.selfMintCount(userTwo)).should.be.bignumber.equal(75000 * 10**18);
        (await this.token.selfMintCount(userThree)).should.be.bignumber.equal(75000 * 10**18);

        //Fourth mint of 25,000 tokens to three different users with unique addresses
        await this.token.selfMint(25000, { from: userOne }).should.be.fulfilled;
        await this.token.selfMint(25000, { from: userTwo }).should.be.fulfilled;
        await this.token.selfMint(25000, { from: userThree }).should.be.fulfilled;
        //Confirm that all three users' self mint counts are equal to the 100,000 token limit
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(100000 * 10**18);
        (await this.token.selfMintCount(userTwo)).should.be.bignumber.equal(100000 * 10**18);
        (await this.token.selfMintCount(userThree)).should.be.bignumber.equal(100000 * 10**18);
      });

    });

    beforeEach(async function() {
      this.token = await TestContractDenaliToken.new();
      this.token.setTotalSupply(3000000);
      (await this.token.totalSupply()).should.be.bignumber.equal(3000000 * 10**18);
    });

    it('should not allow requested self mints larger than the 100,000 SELF_MINT_LIMIT', async function () {
      //10,001 tokens is just over the 100,000 self mint limit
      const overMintAmount = 100001;
      //Attempt to mint tokens over the limit
      await this.token.selfMint(overMintAmount, {from: userOne}).should.be.rejectedWith(EVMRevert);
    });

    it('should not allow requested self mints if the requested mint places user\'s self mint count above the 100,000 SELF_MINT_LIMIT', async function () {
      //Minting 1000 tokens to the same user address should allow for 100 successful mints
      for(var i = 0; i < 100; i++){
        await this.token.selfMint(1000, {from: userOne}).should.be.fulfilled;
      }
      //Confirm that user has the correct self mint count of exactly 100,000 tokens
      (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(100000 * 10**18);

      //Attempt to mint tokens now that the user has reached their limit
      await this.token.selfMint(100, {from: userOne}).should.be.rejectedWith(EVMRevert);
    });

    it('should not allow requested self mints if the user\'s self mint count is equal to the 100,000 SELF_MINT_LIMIT', async function () {
      //Mint 100,000 tokens to the user
      await this.token.selfMint(100000, {from: userOne}).should.be.fulfilled;
      //Confirm that user has the correct self mint count of exactly 100,000 tokens
      (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(100000 * 10**18);

      //Attempt to self mint 1 token above the limit
      await this.token.mint(userOne, 1, { from: tokenOwner }).should.be.rejectedWith(EVMRevert);
    });

    it('should dynamically not allow requested self mints to multiple unique users as they individually reach the 100,000 SELF_MINT_LIMIT', async function () {
      //1. First attempted self mint 20,000 tokens to the first user, 25,000 to the second user, and 50,000 to the third user
      await this.token.selfMint(20000, {from: userOne}).should.be.fulfilled;
      await this.token.selfMint(25000, {from: userTwo}).should.be.fulfilled;
      await this.token.selfMint(50000, {from: userThree}).should.be.fulfilled;

      //Confirm that all three users' self mint counts are at their expected token amount
      (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(20000 * 10**18);
      (await this.token.selfMintCount(userTwo)).should.be.bignumber.equal(25000 * 10**18);
      (await this.token.selfMintCount(userThree)).should.be.bignumber.equal(50000 * 10**18);

      //2. Second attempted self mint 20,000 tokens to the first user, 25,000 to the second user, and 50,000 to the third user
      await this.token.selfMint(20000, {from: userOne}).should.be.fulfilled;
      await this.token.selfMint(25000, {from: userTwo}).should.be.fulfilled;
      await this.token.selfMint(50000, {from: userThree}).should.be.fulfilled;

      //Confirm that all three users' self mint counts are at their expected token amount
      (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(40000 * 10**18);
      (await this.token.selfMintCount(userTwo)).should.be.bignumber.equal(50000 * 10**18);
      //The third user's self mint count has reached the 10,000 limit
      (await this.token.selfMintCount(userThree)).should.be.bignumber.equal(100000 * 10**18);

      //3. Third attempted self mint 20,000 tokens to the first user, 25,000 to the second user, and 50,000 to the third user
      await this.token.selfMint(20000, {from: userOne}).should.be.fulfilled;
      await this.token.selfMint(25000, {from: userTwo}).should.be.fulfilled;
      //The attempted self mint to the third user should be rejected, as the user has reached the 100,000 limit
      await this.token.selfMint(50000, {from: userThree}).should.be.rejectedWith(EVMRevert);

      //Confirm that all three users' self mint counts are at their expected token amount
      (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(60000 * 10**18);
      (await this.token.selfMintCount(userTwo)).should.be.bignumber.equal(75000 * 10**18);
      (await this.token.selfMintCount(userThree)).should.be.bignumber.equal(100000 * 10**18);

      //4. Fourth attempted self mint 20,000 tokens to the first user, 25,000 to the second user, and 50,000 to the third user
      await this.token.selfMint(20000, {from: userOne}).should.be.fulfilled;
      await this.token.selfMint(25000, {from: userTwo}).should.be.fulfilled;
      //Attempted self mints to the third user should continue to be rejected
      await this.token.selfMint(50000, {from: userThree}).should.be.rejectedWith(EVMRevert);

      //Confirm that all three users' self mint counts are at their expected token amount
      (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(80000 * 10**18);
      //The second user's self mint count has reached the 10,000 limit
      (await this.token.selfMintCount(userTwo)).should.be.bignumber.equal(100000 * 10**18);
      (await this.token.selfMintCount(userThree)).should.be.bignumber.equal(100000 * 10**18);

      //5. Fifth attempted self mint 20,000 tokens to the first user, 25,000 to the second user, and 50,000 to the third user
      await this.token.selfMint(20000, {from: userOne}).should.be.fulfilled;
      //The attempted self mint to the second user should be rejected, as the user has reached the 100,000 limit
      await this.token.selfMint(25000, {from: userTwo}).should.be.rejectedWith(EVMRevert);
      //Attempted self mints to the third user should continue to be rejected
      await this.token.selfMint(50000, {from: userThree}).should.be.rejectedWith(EVMRevert);

      //Confirm that all three users' self mint counts are at their expected token amount
      //The first user's self mint count has reached the 100,000 limit
      (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(100000 * 10**18);
      (await this.token.selfMintCount(userTwo)).should.be.bignumber.equal(100000 * 10**18);
      (await this.token.selfMintCount(userThree)).should.be.bignumber.equal(100000 * 10**18);

      //6. Sixth attempted self mint 20,000 tokens to the first user, 25,000 to the second user, and 50,000 to the third user
      //Attempted mints to the first, second, and third user should all be rejected
      await this.token.selfMint(20000, {from: userOne}).should.be.rejectedWith(EVMRevert);
      await this.token.selfMint(25000, {from: userTwo}).should.be.rejectedWith(EVMRevert);
      await this.token.selfMint(50000, {from: userThree}).should.be.rejectedWith(EVMRevert);

      //Confirm that all three users' self mint counts are at their expected token amount
      (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(100000 * 10**18);
      (await this.token.selfMintCount(userTwo)).should.be.bignumber.equal(100000 * 10**18);
      (await this.token.selfMintCount(userThree)).should.be.bignumber.equal(100000 * 10**18);

    });

  });

  describe('\'SELF_MINT_CAP\': Testing second phase total self minting limit', function(){

    describe('Happy path:', function(){

      beforeEach(async function() {
        this.token = await TestContractDenaliToken.new();
        //Set the total supply 200,000 tokens below the self mint cap of 10 million
        this.token.setTotalSupply(9800000);
      });

      it('should correctly store the SELF_MINT_CAP correctly as 10,000,000 tokens', async function () {
        const savedLimit = await this.token.SELF_MINT_CAP();
        savedLimit.should.be.bignumber.equal(10000000 * 10**18);
      });

      it('should allow requested self mints if the total supply is less than the SELF_MINT_CAP', async function () {
        //Confirm total supply is less than the self mint cap
        (await this.token.totalSupply()).should.be.bignumber.equal(9800000 * 10**18);

        //Self mint tokens by user
        await this.token.selfMint(100000, {from: userOne}).should.be.fulfilled;
      });

      it('should allow requested self mints by multiple unique users if the total supply is less than the SELF_MINT_CAP', async function () {
        //Confirm total supply is less than the self mint cap
        (await this.token.totalSupply()).should.be.bignumber.equal(9800000 * 10**18);

        //Self mint 50,000 tokens by the first user
        await this.token.selfMint(50000, {from: userOne}).should.be.fulfilled;
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(50000 * 10**18);

        //Confirm total supply is still less than the self mint cap
        (await this.token.totalSupply()).should.be.bignumber.equal(9850000 * 10**18);

        //Self mint 50,000 tokens by the second user
        await this.token.selfMint(50000, {from: userTwo}).should.be.fulfilled;
        (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(50000 * 10**18);

        //Confirm total supply is still less than the self mint cap
        (await this.token.totalSupply()).should.be.bignumber.equal(9900000 * 10**18);

        //Self mint 50,000 tokens by the third user
        await this.token.selfMint(50000, {from: userThree}).should.be.fulfilled;
        (await this.token.balanceOf(userThree)).should.be.bignumber.equal(50000 * 10**18);

        //Confirm total supply has increased as expected
        (await this.token.totalSupply()).should.be.bignumber.equal(9950000 * 10**18);
      });

      it('Should correctly reach the SELF_MINT_CAP when a successful self mint causes the total supply to equal 10,000,000', async function () {
        //Mint tokens to the first user but do not surpass the self mint cap
        await this.token.selfMint(100000, {from: userOne}).should.be.fulfilled;
        //Confirm that the total supply has increased but has not reached the self mint cap
        (await this.token.totalSupply()).should.be.bignumber.equal(9900000 * 10**18);

        //Self mint tokens to the second user reach the self mint cap
        await this.token.selfMint(100000, {from: userTwo}).should.be.fulfilled;
        //Confirm that the total supply is equal to the self mint cap
        (await this.token.totalSupply()).should.be.bignumber.equal(10000000 * 10**18);
      });

    });

    beforeEach(async function() {
      this.token = await TestContractDenaliToken.new();
      this.token.setTotalSupply(10000000);
      //Confirm total supply is equal to the owner mint cap
      (await this.token.totalSupply()).should.be.bignumber.equal(10000000 * 10**18);
    });

    it('should not allow requested self mints by users if the SELF_MINT_CAP has been reached', async function () {
      //Attempt to mint tokens
      await this.token.selfMint(1, {from: userOne}).should.be.rejectedWith(EVMRevert);

      //Confirm that no tokens were minted
      (await this.token.balanceOf(userOne)).should.be.bignumber.equal(0);
      //Confirm that the total supply has not increased
      (await this.token.totalSupply()).should.be.bignumber.equal(10000000 * 10**18);
    });

    it('should not allow requested mints by the owner if the SELF_MINT_CAP has been reached', async function () {
      //Attempt to mint tokens
      await this.token.mint(userOne, 1, { from: tokenOwner }).should.be.rejectedWith(EVMRevert);

      //Confirm that no tokens were minted
      (await this.token.balanceOf(userOne)).should.be.bignumber.equal(0);
      //Confirm that the total supply has not increased
      (await this.token.totalSupply()).should.be.bignumber.equal(10000000 * 10**18);
    });

  });

  describe('\'balances\' vs \'selfMintCount\':', function(){

    describe('Happy path:', function(){

      beforeEach(async function() {
        this.token = await TestContractDenaliToken.new();
      });

      it('should allow an individual user to have a maximum possible token count of 600,000 tokens', async function () {
        //Set the total supply 500,000 tokens below the owner mint cap of 3 million
        this.token.setTotalSupply(2500000);

        //Mint maximum possible tokens during first stage
        await this.token.mint(userOne, 500000, { from: tokenOwner }).should.be.fulfilled;
        //Mint maximum possible tokens during second stage
        await this.token.selfMint(100000, {from: userOne}).should.be.fulfilled;
        //Confirm that the user has a balance of 600,000
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(600000 * 10**18);
      });

      it('should independently validate requested mints and requested self mints for a unique user', async function () {
        //Set the total supply 1 million tokens below the owner mint cap of 3 million
        this.token.setTotalSupply(2000000);

        //Raise first user's balances to equal the owner mint limit
        await this.token.mint(userOne, 500000, { from: tokenOwner }).should.be.fulfilled;
        //Confirm that the first user's balances have increased
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(500000 * 10**18);
        //Confirm that the first user's self mint count has not increased
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(0);

        //Do not allow any additional requested mints to the first user once the user's owner mint limit has been met
        await this.token.mint(userOne, 1, { from: tokenOwner }).should.be.rejectedWith(EVMRevert);

        //Raise the total supply to equal the owner mint count
        await this.token.mint(userTwo, 500000, { from: tokenOwner }).should.be.fulfilled;
        //Confirm that we're in the second distribution phase
        (await this.token.totalSupply()).should.be.bignumber.equal(3000000 * 10**18);

        //First request to self mint tokens by first user
        await this.token.selfMint(50000, {from: userOne}).should.be.fulfilled;
        //Confirm that both the first user's balances and self mint count have increased
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(550000 * 10**18);
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(50000 * 10**18);

        //Second request to self mint tokens by first user
        await this.token.selfMint(50000, {from: userOne}).should.be.fulfilled;
        //Confirm that both the first user's balances and self mint count have increased
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(600000 * 10**18);
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(100000 * 10**18);

        //Do not allow any additional requested mints to the first user once the user's self mint limit has been met
        await this.token.selfMint(1, {from: userOne}).should.be.rejectedWith(EVMRevert);
      });

      it('should independently validate requested mints and requested self mints for multiple users', async function () {
        //Set the total supply 1.5 million tokens below the owner mint cap of 3 million
        this.token.setTotalSupply(1500000);

        //Raise first user's balances to equal the owner mint limit
        await this.token.mint(userOne, 500000, { from: tokenOwner }).should.be.fulfilled;
        //Confirm that the first user's balances have increased
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(500000 * 10**18);
        //Confirm that the first user's self mint count has not increased
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(0);
        //Do not allow any additional requested mints to the first user once the user's owner mint limit has been met
        await this.token.mint(userOne, 1, { from: tokenOwner }).should.be.rejectedWith(EVMRevert);

        //Raise second user's balances to equal the owner mint limit
        await this.token.mint(userTwo, 500000, { from: tokenOwner }).should.be.fulfilled;
        //Confirm that the second user's balances have increased
        (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(500000 * 10**18);
        //Confirm that the second user's self mint count has not increased
        (await this.token.selfMintCount(userTwo)).should.be.bignumber.equal(0);
        //Do not allow any additional requested mints to the second user once the user's owner mint limit has been met
        await this.token.mint(userTwo, 1, { from: tokenOwner }).should.be.rejectedWith(EVMRevert);

        //Raise third user's balances to equal the owner mint limit
        await this.token.mint(userThree, 500000, { from: tokenOwner }).should.be.fulfilled;
        //Confirm that the third user's balances have increased
        (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(500000 * 10**18);
        //Confirm that the third user's self mint count has not increased
        (await this.token.selfMintCount(userTwo)).should.be.bignumber.equal(0);

        //Confirm that we're in the second distribution phase (3 million tokens have been minted)
        (await this.token.totalSupply()).should.be.bignumber.equal(3000000 * 10**18);

        //First request to self mint tokens by first user
        await this.token.selfMint(50000, {from: userOne}).should.be.fulfilled;
        //Confirm that both the first user's balances and self mint count have increased
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(550000 * 10**18);
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(50000 * 10**18);

        //First request to self mint tokens by second user
        await this.token.selfMint(50000, {from: userTwo}).should.be.fulfilled;
        //Confirm that both the second user's balances and self mint count have increased
        (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(550000 * 10**18);
        (await this.token.selfMintCount(userTwo)).should.be.bignumber.equal(50000 * 10**18);

        //Second request to self mint tokens by first user
        await this.token.selfMint(50000, {from: userOne}).should.be.fulfilled;
        //Confirm that both the third user's balances and self mint count have increased
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(600000 * 10**18);
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(100000 * 10**18);

        //Do not allow any additional requested mints to the first user once the user's self mint limit has been met
        await this.token.selfMint(1, {from: userOne}).should.be.rejectedWith(EVMRevert);

        //Second request to self mint tokens by second user
        await this.token.selfMint(50000, {from: userTwo}).should.be.fulfilled;
        //Confirm that both the first user's balances and self mint count have increased
        (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(600000 * 10**18);
        (await this.token.selfMintCount(userTwo)).should.be.bignumber.equal(100000 * 10**18);

        //Do not allow any additional requested mints to the first user once the user's self mint limit has been met
        await this.token.selfMint(1, {from: userTwo}).should.be.rejectedWith(EVMRevert);
      });

    });

    describe('Balances are predictable during minting due to locked tokens:', function(){

      beforeEach(async function() {
        this.token = await TestContractDenaliToken.new();
      });

      it('should not allow token transfers to interfere with balances during the minting process', async function () {
        //Set the total supply 500,000 tokens below the owner mint cap of 3 million
        this.token.setTotalSupply(2500000);

        //Load first user with 50,000 tokens for attempted transferring
        await this.token.mint(userOne, 250000, { from: tokenOwner }).should.be.fulfilled;

        //Attempt to decrease balance by transferring tokens with 'transfer'
        await this.token.transfer(userTwo, 10000, { from: userOne }).should.be.rejectedWith(EVMRevert);
        //Attempt to decrease balance by transferring tokens with 'approve' and 'transferFrom'
        await this.token.approve(userTwo, 10000, { from: userOne }).should.be.rejectedWith(EVMRevert);
        await this.token.transferFrom(userOne, userThree, 10000, { from: userTwo }).should.be.rejectedWith(EVMRevert);

        //Confirm the first user's balance is unchanged
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(250000 * 10**18);
        //Confirm the second and third users did not receive any tokens
        (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(0);
        (await this.token.balanceOf(userThree)).should.be.bignumber.equal(0);

        //Increase first user's balances to the owner mint limit
        await this.token.mint(userOne, 250000, { from: tokenOwner }).should.be.fulfilled;
        //Attempt to mint again
        await this.token.mint(userOne, 1, { from: tokenOwner }).should.be.rejectedWith(EVMRevert);

        //Confirm the first user's balance is 500,000
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(500000 * 10**18);
      });

      it('should not allow token transfers to interfere with balances during the self minting process', async function () {
        //Set the total supply 500,000 tokens below the self mint cap of 10 million
        this.token.setTotalSupply(9500000);

        //Self mint tokens to user
        await this.token.selfMint(50000, {from: userOne}).should.be.fulfilled;
        //Confirm that both the first user's balances and self mint count have increased
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(50000 * 10**18);
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(50000 * 10**18);

        //Attempt to decrease balance by transferring tokens with 'transfer'
        await this.token.transfer(userTwo, 1000, { from: userOne }).should.be.rejectedWith(EVMRevert);
        //Attempt to decrease balance by transferring tokens with 'approve' and 'transferFrom'
        await this.token.approve(userTwo, 1000, { from: userOne }).should.be.rejectedWith(EVMRevert);
        await this.token.transferFrom(userOne, userThree, 1000, { from: userTwo }).should.be.rejectedWith(EVMRevert);

        //Confirm the first user's balance and self mint count are unchanged
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(50000 * 10**18);
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(50000 * 10**18);

        //Confirm the second and third users did not receive any tokens
        (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(0);
        (await this.token.balanceOf(userThree)).should.be.bignumber.equal(0);
        //Confirm the second and third users' self mint count has not increased
        (await this.token.selfMintCount(userTwo)).should.be.bignumber.equal(0);
        (await this.token.selfMintCount(userThree)).should.be.bignumber.equal(0);

        //Increase first user's balances to the self mint limit
        await this.token.selfMint(50000, {from: userOne}).should.be.fulfilled;
        //Attempt to self mint again
        await this.token.selfMint(1, {from: userOne}).should.be.rejectedWith(EVMRevert);

        //Confirm the first user's balance is 100,000
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(100000 * 10**18);
      });

      it('should not allow token transfers to interfere with balances during both the minting and self minting process', async function () {
        //Set the total supply 500,000 tokens below the owner mint cap of 3 million
        this.token.setTotalSupply(2500000);

        //Load first user with 250,000 tokens for attempted transferring
        await this.token.mint(userOne, 250000, { from: tokenOwner }).should.be.fulfilled;
        //Attempt to decrease balance by transferring tokens with 'transfer'
        await this.token.transfer(userTwo, 10000, { from: userOne }).should.be.rejectedWith(EVMRevert);
        //Attempt to decrease balance by transferring tokens with 'approve' and 'transferFrom'
        await this.token.approve(userTwo, 10000, { from: userOne }).should.be.rejectedWith(EVMRevert);
        await this.token.transferFrom(userOne, userThree, 10000, { from: userTwo }).should.be.rejectedWith(EVMRevert);

        //Confirm the first user's balance is unchanged
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(250000 * 10**18);
        //Confirm the second and third users did not receive any tokens
        (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(0);
        (await this.token.balanceOf(userThree)).should.be.bignumber.equal(0);

        //Increase first user's balances to the owner mint limit
        await this.token.mint(userOne, 250000, { from: tokenOwner }).should.be.fulfilled;
        //Confirm the first user's balance is equal to the owner mint limit
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(500000 * 10**18);

        //Confirm that we are in the second distribution phase
        (await this.token.totalSupply()).should.be.bignumber.equal(3000000 * 10**18);

        //Self mint tokens to user
        await this.token.selfMint(50000, {from: userOne}).should.be.fulfilled;
        //Confirm that both the first user's balances and self mint count have increased
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(550000 * 10**18);
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(50000 * 10**18);

        //Attempt to decrease balance by transferring tokens with 'transfer'
        await this.token.transfer(userTwo, 1000, { from: userOne }).should.be.rejectedWith(EVMRevert);
        //Attempt to decrease balance by transferring tokens with 'approve' and 'transferFrom'
        await this.token.approve(userTwo, 1000, { from: userOne }).should.be.rejectedWith(EVMRevert);
        await this.token.transferFrom(userOne, userThree, 1000, { from: userTwo }).should.be.rejectedWith(EVMRevert);

        //Confirm the first user's balance and self mint count are unchanged
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(550000 * 10**18);
        (await this.token.selfMintCount(userOne)).should.be.bignumber.equal(50000 * 10**18);
        //Confirm the second and third users did not receive any tokens
        (await this.token.balanceOf(userTwo)).should.be.bignumber.equal(0);
        (await this.token.balanceOf(userThree)).should.be.bignumber.equal(0);
        //Confirm the second and third users' self mint count has not increased
        (await this.token.selfMintCount(userTwo)).should.be.bignumber.equal(0);
        (await this.token.selfMintCount(userThree)).should.be.bignumber.equal(0);

        //Increase first user's balances to the self mint limit
        await this.token.selfMint(50000, {from: userOne}).should.be.fulfilled;
        //Attempt to self mint again
        await this.token.selfMint(1, {from: userOne}).should.be.rejectedWith(EVMRevert);

        //Confirm the first user's balance is 600,000
        (await this.token.balanceOf(userOne)).should.be.bignumber.equal(600000 * 10**18);
        //Confirm that the total supply is correct
        (await this.token.totalSupply()).should.be.bignumber.equal(3100000 * 10**18);
      });

    });

  });

});