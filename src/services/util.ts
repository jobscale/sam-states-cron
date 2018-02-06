'use strict';

export class Util {

    static init = (caption) => {
        console.log(process.env);
        Object.assign(process.env, {
            AWS_LAMBDA_FUNCTION_NAME: caption,
            AWS_REGION: process.argv[1]
        }, process.env);
        console.log(process.env);
        return caption;
    };

    static run = (func, event = {}, context = {
        fail: (x) => { console.error(x); },
        succeed: (x) => { console.log(x); }
    }, callback = (x) => { console.log(x); }) => {
        func(event, context, callback);
    };

    static toString = (target) => {
        try {
            // Note: cache should not be re-used by repeated calls to JSON.stringify.
            let cache = [];
            JSON.stringify(target, (key, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (cache.indexOf(value) !== -1) {
                        // Circular reference found, discard key
                        return;
                    }
                    // Store value in our collection
                    cache.push(value);
                }
                return value;
            });
            cache = null; // Enable garbage collection
        } catch (e) {
            console.warn(e);
        }
        return target.toString();
    };

    static isJsonString = (str) => {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    };

    static isJson = (json) => {
        try {
            JSON.stringify(json);
        } catch (e) {
            return false;
        }
        return true;
    };

}
