require('babel-register')

module.exports = {
  networks: {
    development: {
      host: '127.0.0.1',
      port: 9545,
      gas:6700000,
      network_id: '*'
    }
  }
}
