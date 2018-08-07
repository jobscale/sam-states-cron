

import { Database } from '../services/database';

const Sequelize = require('sequelize');


export const Weather = Database.connection().define('weather', {
  date: { type: Sequelize.STRING, primaryKey: true },
  caption: { type: Sequelize.TEXT },
}, {
  timestamps: false,
  freezeTableName: true,
});

// -- migrate
// CREATE TABLE `weather` (
//   `date` varchar(26) NOT NULL,
//   `caption` text,
//   PRIMARY KEY (`date`)
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
