require('babel-polyfill');

const DenaliToken = artifacts.require('./DenaliToken.sol');

module.exports = function(deployer, network, accounts) {

  deployer.then(async () => {
    return deployer.deploy(DenaliToken)
  })

}

