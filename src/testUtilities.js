function checkSerial (maxM, emu, intervalSecs) {
    return new Promise((resolve) => {
        let interval = setInterval(() => { // check m-cycle every N secs
            console.log('Current M-cycle:', emu.TIMER.total_m, "Wait till:", maxM)
            console.log(emu.bridge.jest.serialBuffer)
            if (emu.TIMER.total_m > maxM) { // m-cycle reaches threshold
                clearInterval(interval)
                emu.stop()
                resolve(emu.bridge.jest.serialBuffer)
            }
        }, intervalSecs * 1000)
    })
}

export { checkSerial }