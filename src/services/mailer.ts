declare function require(x: string): any;
const nodemailer = require('nodemailer');
const env = require('../env.json');
const _ = require('underscore');

export class Mailer {

    protected trans;

    constructor() {
        this.trans = nodemailer.createTransport(env.mail);
    }

    send = (data) => {
        let mailOptions = _.extend({}, env.mailOptions, data);
        this.trans.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.error(error);
            }
            console.log('Message sent: ' + info.response);
        });
    };

}