// src/config/database.js
require('dotenv').config();

module.exports = {
  development: {
    dialect: 'oracle',
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    dialectOptions: {
      connectString: process.env.DB_CONNECT_STRING || `(description=(address=(protocol=tcps)(port=1522)(host=adb.mx-queretaro-1.oraclecloud.com))(connect_data=(service_name=g347afb73b681f8_devdb_tp.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))`,
      walletLocation: process.env.DB_WALLET_PATH,
      walletPassword: process.env.DB_WALLET_PASSWORD,
      ssl: true
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: console.log,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  },
  test: {
    dialect: 'oracle',
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    dialectOptions: {
      connectString: process.env.DB_CONNECT_STRING,
      walletLocation: process.env.DB_WALLET_PATH,
      walletPassword: process.env.DB_WALLET_PASSWORD,
      ssl: true
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  },
  production: {
    dialect: 'oracle',
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    dialectOptions: {
      connectString: process.env.DB_CONNECT_STRING,
      walletLocation: process.env.DB_WALLET_PATH,
      walletPassword: process.env.DB_WALLET_PASSWORD,
      ssl: true
    },
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    },
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  }
};