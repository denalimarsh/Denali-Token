# DenaliToken: Sample ERC20 Token and Unit Tests

### Background

DenaliToken consists of an example ERC20 token and its complimentary JavaScript test suite, designed as a reference for test driven Solidity smart contract development. The project focuses on the testing of Solidity smart contracts utilizing the popular JavaScript testing frameworks Mocha and Chai built into the Truffle testing framework. In addition to token deployment, owner/user permissions, event triggers, and general functionality, the token's owner and user minting limits are thoroughly tested.

## Description

DenaliToken implements an ERC20 token which distributes a total of 10 million tokens, allowing the token owner to mint the first 30% of the tokens, with a 500,000 token limit per address. Then, the remaining 70% of tokens can be claimed by users by calling a method on the token contract, with a 100,000 token limit per address. The two limits are independent. After 10 million total tokens have been minted, minting is finished and tokens are unlocked for transfers. The token owner cannot override the second phase distribution by finishing minting early - token minting is automatically completed once the total supply is equal to 10 million.

The project contains an associated test suite for confirming that the desired functionality works as expected and that undesired functionality is correctly restricted. Inside the tests directory, `1_testDenaliToken.js` is a collection of tests focused on the token's deployment and functionality. `2_testTokenLimits.js` is a collection of tests specifically designed to comprehensively test the four limits declared within the token's contract: `OWNER_MINT_CAP`, `OWNER_MINT_LIMIT`, `SELF_MINT_CAP`, and `SELF_MINT_LIMIT`.

### Setup

After cloning the repository, install dependencies with

```
npm install
```

## Running the tests

Start the local development server

```
truffle develop
```

Run the project's test suite

```
truffle test
```

Expected output:

![Truffle test suite](/TruffleTests.png)
