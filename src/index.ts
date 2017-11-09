'use strict';

import {Scraper} from './apps/scraper';

const run = (data) => {
    return Promise.all(data.map((dat) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                let time = (new Date).toISOString();
                (new Scraper).get().then((data) => {
                    resolve({
                        time: time,
                        result: data
                    });
                });
            }, 1000 * dat);
        });
    }));
};

(() => {

    let data = [1, 2, 3];
    console.log("example Promise");
    run(data).then((res) => {
        console.log('END', JSON.stringify(res));
    });

})();
