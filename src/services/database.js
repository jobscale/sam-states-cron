'use strict';

const env = require('../env.json');
const sequelize = require('sequelize');

export class Database {

    protected static sequelize;

    static connection = () => {
        if (Database.sequelize) {
            return Database.sequelize;
        }
        Database.sequelize = new sequelize(env.db);
        return Database.sequelize;
    };

}
