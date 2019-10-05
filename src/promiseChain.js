export default function promiseChain(errorHandler, funcs) {
    let myFuncs = [...funcs];
    return function promiseChainImpl(...args) {
        return new Promise((resolve) => {
            let index = 0;
            function catcher(e) {
                errorHandler(e);
            }
            function thenF(res) {
                if (myFuncs.length && (index < myFuncs.length)) {
                    let f = myFuncs[index++];
                    const r = f(res);
                    if (r && r.then) {
                        return r.then(thenF).catch(catcher);
                    }
                    return r;
                }
                return resolve(res);;
            }
            thenF(args);
        });
    };
}

