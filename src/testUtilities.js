function checkSerial (maxM, emu, intervalSecs) {
    return new Promise((resolve) => {
        let interval = setInterval(() => { // check m-cycle every N secs
            console.log('Current M-cycle:', emu.TIMER.total_m, ". Wait till:", maxM)
            console.log(emu.jest.serialBuffer)
            if (emu.TIMER.total_m > maxM) { // m-cycle reaches threshold
                clearInterval(interval)
                emu.stop()
                resolve(emu.jest.serialBuffer)
            }
        }, intervalSecs * 1000)
    })
}

function checkGraphic (maxM, emu, intervalSecs) {
    return new Promise((resolve) => {
        let interval = setInterval(() => { // check m-cycle every N secs
            console.log('Current M-cycle:', emu.TIMER.total_m, ". Wait till:", maxM)
            if (emu.TIMER.total_m > maxM) { // m-cycle reaches threshold
                emu.stop()
                clearInterval(interval)
                resolve(arrayHash(emu.GPU.scrn.data))
            }
        }, intervalSecs * 1000)
    })
}

function strHash (str) {
    let hash = 0, chr;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

function arrayHash (arr) {
    arr = [...arr]
    let str = arr.join('|')
    return strHash(str)
}

export { checkSerial, checkGraphic, arrayHash }