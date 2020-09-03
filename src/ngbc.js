import CPU from './CPU'
import MMU from './MMU'
import TIMER from './Timer'
import GPU from './GPU'
import JOYPAD from './Joypad'
import Debuger from './Debuger'
import Bridge from './Bridge'
class ngbc {

    constructor (mode) {
        this.mode = mode
        // new bridge
        this.bridge = new Bridge()
        // new components
        this.TIMER = new TIMER(this.bridge)
        this.GPU = new GPU(this.bridge)
        this.MMU = new MMU(this.bridge)
        this.CPU = new CPU(this.bridge)
        this.JOYPAD = new JOYPAD(this.bridge)
        // new Debuger
        this.debuger = new Debuger(this.bridge)
        // register in bridge
        this.bridge.register('CPU',this.CPU)
        this.bridge.register('MMU',this.MMU)
        this.bridge.register('TIMER',this.TIMER)
        this.bridge.register('GPU',this.GPU)
        this.bridge.register('JOYPAD',this.JOYPAD)
        this.bridge.register('Debuger',this.debuger)
        // init components
        this.CPU.init()
        this.GPU.init()
        this.MMU.init()
        this.TIMER.init()
        this.JOYPAD.init()
        this.debuger.init()
        //config GPU
        if (mode == 'headless') this.GPU.setHeadless()
        //config CPU
        this.CPU.skip_bios()
    }

    reset () {
        clearInterval(this.run_interval)
        this.CPU.reset()
        this.MMU.reset()
        this.GPU.reset()
        this.TIMER.reset()
    }

    run_web () {
        var frame = () => {
            var t0 = new Date();
            do {
                this.CPU.exec()
                if (this.CPU.stop) break
                this.CPU.handle_interrupt()
            } while (this.TIMER.total_m < 17556)
            this.TIMER.total_m = 0
            do {
                var t1 = new Date();
            } while ((t1 - t0) / 1000 < (1 / 62))
            document.getElementById('fps').innerHTML = Math.round(1000 / (t1 - t0))
        }
        this.run_interval = setInterval(frame, 1)
        console.log('Run!')
    }

    run_headless () {
        do {
            this.CPU.exec()
            if (this.CPU.stop) break
            this.CPU.handle_interrupt()
            /* eslint-disable */
        } while (1)
        /* eslint-enable */
    }

    run () {
        if (this.mode == 'headless')
            this.run_headless()
        else
            this.run_web()
    }

}

export default ngbc