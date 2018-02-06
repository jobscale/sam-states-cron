'use strict';

const env = require('../env.json');
const client = require('cheerio-httpcli');
const _ = require('lodash');

import {Weather} from '../models/weather';
import {Mailer} from "../services/mailer";

export class Scraper {

    protected requestUrl = "http://www.tenki.jp/forecast/6/30/6200/27100/";

    get = () => {
        return new Promise((resolve, reject) => {
            client.fetch(this.requestUrl).then((result) => {
                let $:Function = result.$;
                let body = this.getBody($);
                let data = this.getData($);
                let title = data.caption + ' - ' + $("title").text();
                console.log(data);
                if (env.mail.enable) {
                    (new Mailer).send({
                        subject: title,
                        html: body.html()
                    });
                }
                if (env.db.enable) {
                    this.store(data);
                }
                resolve('OK');
            });
        });
    };

    getBody = ($) => {
        return $(".today-weather");
    };

    getData = ($) => {
        return {
            date: $(".left-style").first().text(),
            caption: $(".weather-telop").first().text()
        };
    };

    store = (data) => {

        // Create new instance
        let model = Weather.build({
            date: data.date,
            caption: data.caption
        });

        // Save to database
        model.save().then((anotherTask) => {
            // you can now access the currently saved task with the variable anotherTask... nice!
            if (env.debug) {
                console.log('succeeded: ', anotherTask);
            }
        }).catch((error) => {
            // Ooops, do some error-handling
            console.error(error);
        });
    };

}

