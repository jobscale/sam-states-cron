'use strict';
import {Util} from "./util";

const env = require('../env.json');
const https = require('https');
const http = require('http');
const url = require('url');

export class Http {

    postError = (message) => {
        let username = process.env.AWS_LAMBDA_FUNCTION_NAME;
        let icon = env.icon.error;
        let channel = env.channel.error;
        return this.postSlack(message, username, icon, channel, true);
    };

    /**
     * post slack
     * @param {string} text
     * @param {string} username
     * @param {string} icon
     * @param {string} channel
     * @returns {Promise}
     */
    postSlack = (text, username = 'bot', icon = ':thought_balloon:', channel = '#monitor', okAlways = false) => {
        return new Promise((resolve, reject) => {
            if (okAlways) {
                reject = resolve;
            }
            let options = url.parse(env.url.slack);
            options.method = 'POST';
            options.headers = {
                'Content-Type': 'application/json'
            };
            let req = https.request(options, (res) => {
                if (res.statusCode === 200) {
                    let log = 'posted to slack';
                    console.log(log);
                    resolve(log);
                } else {
                    let log = 'post slack status code ' + res.statusCode;
                    console.log(log);
                    reject(log);
                }
            });
            req.on('error', (e) => {
                let log = 'post slack problem with request ' + e.message;
                console.log(log);
                reject(log);
            });
            req.write(JSON.stringify({
                text: text,
                username: username,
                icon_emoji: icon,
                channel: channel
            }));
            req.end();
        });
    };

    request = (requestUrl, data = {}, method = 'POST', protocol = 'https', contentType = 'application/json') => {
        let options = url.parse(requestUrl);
        options.method = method;
        options.headers = {
            'Content-Type': contentType
        };
        let func = protocol == 'http' ? http.request : https.request;
        return new Promise((resolve, reject) => {
            let req = func(options, (res) => {
                if (res.statusCode === 200) {
                    resolve(res);
                } else {
                    reject(res);
                }
            });
            req.on('error', (e) => {
                console.log(Util.toString(e));
                reject(e);
            });
            req.write(data);
            console.log('post req end');
            req.end();
        });
    };

}
