

import { Scraper } from './apps/scraper';

const run = (data) => Promise.all(data.map((dat) => new Promise((resolve, reject) => {
  setTimeout(() => {
    const time = (new Date()).toISOString();
    (new Scraper()).get().then((data) => {
      resolve({
        time,
        result: data,
      });
    });
  }, 1000 * dat);
})));

(() => {
  const data = [1, 2, 3];
  console.log('example Promise');
  run(data).then((res) => {
    console.log('END', JSON.stringify(res));
  });
})();
