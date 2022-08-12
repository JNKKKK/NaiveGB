class APU {
    constructor (ngb) {
        this.ngb = ngb
    }

    init () {
        let audioContext;
        if (typeof window !== 'undefined') {
            let AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContext();
        } else {
            // mock AudioContext
            audioContext = {
                createGain: () => ({
                    gain: {
                        value: 0
                    },
                    connect: () => { },
                    disconnect: () => { },
                }),
                createOscillator: () => ({
                    type: 0,
                    frequency: {
                        value: 0
                    },
                    connect: () => { },
                    disconnect: () => { },
                    start: () => { }
                }),
                createBuffer: () => ({
                    copyToChannel: () => { }
                }),
                createBufferSource: () => ({
                    buffer: 0,
                    loop: 0,
                    connect: () => { },
                    disconnect: () => { },
                    start: () => { },
                    playbackRate: {
                        value: 0
                    }
                }),
            }
        }
        this.channel1 = new Channel12(this, 1, audioContext);
        this.channel2 = new Channel12(this, 2, audioContext);
        this.channel3 = new Channel3(this, 3, audioContext);
        this.channel4 = new Channel4(this, 4, audioContext);

        this.mCycle = 0

        this.reset()
    }

    reset () {
        this.reg = {}
        this.reg.NR50 = 0
        this.reg.NR51 = 0
        this.reg.NR52 = 0
        this.enabled = false
        this.channel1.init()
        this.channel2.init()
        this.channel3.init()
        this.channel4.init()
        // this.mCycle = 0
        this.frame = 7
    }

    step (m) {
        // if (this.enabled == false) return;
        const clockTicks = 2048;
        const framesCount = 8
        this.mCycle += m
        if (this.channel3.playing) this.channel3.updateWave(m)

        if (this.mCycle >= clockTicks) {
            this.mCycle -= clockTicks
            if (this.enabled == false) return;
            this.frame = (this.frame + 1) % framesCount
            switch (this.frame) {
                case 2: case 6: this.updateSweep(); /* Fallthrough. */
                case 0: case 4: this.updateLength(); break;
                case 7: this.updateEnvelope(); break;
                case 1: case 3: case 5: break;
                default:
                    console.log('invalid apu frame:', this.frame)
            }
        }
    }

    updateSweep () {
        this.channel1.updateSweep()
    }

    updateLength () {
        this.channel1.updateLength()
        this.channel2.updateLength()
        this.channel3.updateLength()
        this.channel4.updateLength()
    }

    updateEnvelope () {
        this.channel1.updateEnvelope()
        this.channel2.updateEnvelope()
        this.channel4.updateEnvelope()
    }

    setSoundFlag (channel, value) {
        let mask = 0xFF - (1 << (channel - 1));
        value = value << (channel - 1)
        this.reg.NR52 &= mask;
        this.reg.NR52 |= value;
    };

    skip_bios () {
        this.reg.NR52 = 0xf1
        this.channel1.reg.NR10 = 0x80
        this.channel1.reg.NR11 = 0xbf
        this.channel3.reg.NR30 = 0x7f
        this.channel3.reg.NR32 = 0x9f
        this.channel4.reg.NR41 = 0xff
        this.enabled = true
    }

    rb (addr) {
        switch (addr) {
            // Channel 1 addresses
            case 0xFF10:
                return this.channel1.reg.NR10 | 0x80
            case 0xFF11:
                return this.channel1.reg.NR11 | 0x3f
            case 0xFF12:
                return this.channel1.reg.NR12
            case 0xFF13:
                return this.channel1.reg.NR13 | 0xff
            case 0xFF14:
                return this.channel1.reg.NR14 | 0xbf
            // Channel 2 addresses
            case 0xFF16:
                return this.channel2.reg.NR21 | 0x3f
            case 0xFF17:
                return this.channel2.reg.NR22
            case 0xFF18:
                return this.channel2.reg.NR23 | 0xff
            case 0xFF19:
                return this.channel2.reg.NR24 | 0xbf
            // Channel 3 addresses
            case 0xFF1A:
                return this.channel3.reg.NR30 | 0x7f
            case 0xFF1B:
                return this.channel3.reg.NR31 | 0xff
            case 0xFF1C:
                return this.channel3.reg.NR32 | 0x9f
            case 0xFF1D:
                return this.channel3.reg.NR33 | 0xff
            case 0xFF1E:
                return this.channel3.reg.NR34 | 0xbf
            // channel 3 wave bytes
            case 0xFF30: case 0xFF31: case 0xFF32: case 0xFF33: case 0xFF34: case 0xFF35: case 0xFF36: case 0xFF37:
            case 0xFF38: case 0xFF39: case 0xFF3A: case 0xFF3B: case 0xFF3C: case 0xFF3D: case 0xFF3E: case 0xFF3F:
                if (this.channel3.playing) {
                    if (this.channel3.waveSampleTime == this.ngb.TIMER.total_m * 4) {
                        return this.channel3.waveRam[this.channel3.wavePosition >> 1]
                    } else {
                        return 0xff
                    }
                } else {
                    return this.channel3.waveRam[addr - 0xFF30]
                }
            // Channel 4 addresses
            case 0xFF20:
                return this.channel4.reg.NR41 | 0xff
            case 0xFF21:
                return this.channel4.reg.NR42
            case 0xFF22:
                return this.channel4.reg.NR43
            case 0xFF23:
                return this.channel4.reg.NR44 | 0xbf
            // general audio switch
            case 0xFF24:
                return this.reg.NR50
            case 0xFF25:
                return this.reg.NR51
            case 0xFF26:
                return this.reg.NR52 | 0x70
            default:
                return 0xff
        }
    }

    wb (addr, val) {
        // when powered off, ignore all write operations to regs, except length counter and wave ram
        if (!this.enabled && addr != 0xFF26 && addr != 0xff11 && addr != 0xff16 && addr != 0xff1b && addr != 0xff20 && addr < 0xFF30) return

        let frequency, oldSweepSign;

        switch (addr) {
            // Channel 1 addresses
            case 0xFF10: // NR10 - Channel 1 Sweep register (R/W)
                this.channel1.reg.NR10 = val | 0x80
                this.channel1.sweepPeriod = ((val & 0x70) >> 4);
                oldSweepSign = this.channel1.sweepSign
                this.channel1.sweepSign = (val & 0x08) ? -1 : 1;
                if (oldSweepSign == -1 && this.channel1.sweepSign == 1 && this.channel1.sweepCalculatedSubtract) this.channel1.stop()
                this.channel1.sweepShifts = (val & 0x07);
                break;
            case 0xFF11: // NR11 - Channel 1 Sound length/Wave pattern duty (R/W)
                // todo : bits 6-7
                if (this.enabled) this.channel1.reg.NR11 = val
                this.channel1.setLength(val & 0x3F);
                break;
            case 0xFF12: // NR12 - Channel 1 Volume Envelope (R/W)
                this.channel1.reg.NR12 = val
                this.channel1.envelopeSign = (val & 0x08) ? 1 : -1;
                this.channel1.envelopeInitialVolume = (val & 0xF0) >> 4;
                this.channel1.envelopePeriod = (val & 0x07);
                // disabling DAC should disable the channel immediately
                if ((val >> 3) == 0) {
                    this.setSoundFlag(1, 0)
                } else {
                    if (this.channel1.envelopePeriod == 0 && this.channel1.envelopeAutomatic) {
                        this.channel1.setEnvelopeVolume((this.channel1.envelopeVolume + 1) & 15)
                    }
                }
                break;
            case 0xFF13: // NR13 - Channel 1 Frequency lo (Write Only)
                this.channel1.reg.NR13 = val
                frequency = this.channel1.frequency;
                frequency &= 0xF00;
                frequency |= val;
                this.channel1.setFrequency(frequency);
                break;
            case 0xFF14: // NR14 - Channel 1 Frequency hi (R/W)
                this.channel1.reg.NR14 = val
                frequency = this.channel1.frequency;
                frequency &= 0xFF;
                frequency |= (val & 7) << 8;
                this.channel1.setFrequency(frequency);
                this.channel1.setLengthCheck((val & 0x40) ? true : false, (val & 0x80) ? true : false);
                if (val & 0x80) this.channel1.play();
                break;

            // Channel 2 addresses
            case 0xFF16: // NR21 - Channel 2 Sound Length/Wave Pattern Duty (R/W)
                // todo : bits 6-7
                if (this.enabled) this.channel2.reg.NR21 = val
                this.channel2.setLength(val & 0x3F);
                break;
            case 0xFF17: // NR22 - Channel 2 Volume Envelope (R/W)
                this.channel2.reg.NR22 = val
                this.channel2.envelopeSign = (val & 0x08) ? 1 : -1;
                let envelopeVolume = (val & 0xF0) >> 4;
                this.channel2.setEnvelopeVolume(envelopeVolume);
                this.channel2.envelopePeriod = (val & 0x07);
                // disabling DAC should disable the channel immediately
                if ((val >> 3) == 0) this.setSoundFlag(2, 0);
                break;
            case 0xFF18: // NR23 - Channel 2 Frequency lo data (W)
                this.channel2.reg.NR23 = val
                frequency = this.channel2.frequency;
                frequency &= 0xF00;
                frequency |= val;
                this.channel2.setFrequency(frequency);
                break;
            case 0xFF19: // NR24 - Channel 2 Frequency hi data (R/W)
                this.channel2.reg.NR24 = val
                frequency = this.channel2.frequency;
                frequency &= 0xFF;
                frequency |= (val & 7) << 8;
                this.channel2.setFrequency(frequency);
                this.channel2.setLengthCheck((val & 0x40) ? true : false, (val & 0x80) ? true : false);
                if (val & 0x80) this.channel2.play();
                break;

            // Channel 3 addresses
            case 0xFF1A: // NR30 - Channel 3 Sound on/off (R/W)
                this.channel3.reg.NR30 = val | 0x7f
                // disabling DAC should disable the channel immediately
                if ((val >> 7) == 0) this.channel3.stop()
                break;
            case 0xFF1B: // NR31 - Channel 3 Sound Length (W)
                if (this.enabled) this.channel3.reg.NR31 = val
                this.channel3.setLength(val);
                break;
            case 0xFF1C: // NR32 - Channel 3 Select output level (R/W)
                // todo
                this.channel3.reg.NR32 = val | 0x9f
                break;
            case 0xFF1D: // NR33 - Channel 3 Frequency’s lower data (W)
                this.channel3.reg.NR33 = val
                frequency = this.channel3.frequency;
                frequency &= 0xF00;
                frequency |= val;
                this.channel3.setFrequency(frequency);
                break;
            case 0xFF1E: // NR34 - Channel 3 Frequency’s higher data (R/W)
                this.channel3.reg.NR34 = val
                frequency = this.channel3.frequency;
                frequency &= 0xFF;
                frequency |= (val & 7) << 8;
                this.channel3.setFrequency(frequency);
                this.channel3.setLengthCheck((val & 0x40) ? true : false, (val & 0x80) ? true : false);
                if (val & 0x80) this.channel3.play();

                break;
            // channel 3 wave bytes
            case 0xFF30: case 0xFF31: case 0xFF32: case 0xFF33: case 0xFF34: case 0xFF35: case 0xFF36: case 0xFF37:
            case 0xFF38: case 0xFF39: case 0xFF3A: case 0xFF3B: case 0xFF3C: case 0xFF3D: case 0xFF3E: case 0xFF3F:
                if (this.channel3.playing) {
                    if (this.channel3.waveSampleTime == this.ngb.TIMER.total_m * 4) {
                        this.channel3.waveRam[this.channel3.wavePosition >> 1] = val
                        this.channel3.setWaveBufferByte(this.channel3.wavePosition >> 1, val);
                    }
                } else {
                    let index = addr - 0xFF30;
                    this.channel3.waveRam[index] = val
                    this.channel3.setWaveBufferByte(index, val);
                }
                break;

            // Channel 4 addresses
            case 0xFF20: // NR41 - Channel 4 Sound Length (W)
                if (this.enabled) this.channel4.reg.NR41 = val | 0xc0
                this.channel4.setLength(val & 0x3F);
                break;
            case 0xFF21: // NR42 - Channel 4 Volume Envelope (R/W)
                this.channel4.reg.NR42 = val
                // todo implementation
                // disabling DAC should disable the channel immediately
                if ((val >> 3) == 0) this.setSoundFlag(4, 0);
                break;
            case 0xFF22: // NR43 - Channel 4 Polynomial Counter (R/W)
                // todo
                this.channel4.reg.NR43 = val
                break;
            case 0xFF23: // NR44 - Channel 4 Counter/consecutive; Inital (R/W)
                this.channel4.reg.NR44 = val
                this.channel4.setLengthCheck((val & 0x40) ? true : false);
                if (val & 0x80) this.channel4.play();
                break;

            // general audio switch
            case 0xFF24:
                this.reg.NR50 = val
                break
            case 0xFF25:
                this.reg.NR51 = val
                break
            case 0xFF26:
                this.reg.NR52 = val & 0xF0
                let enabled = (val & 0x80) == 0 ? false : true;
                if (this.enabled && !enabled) { // turn-off APU
                    // console.log('turn-off APU')
                    this.channel1.disable()
                    this.channel2.disable()
                    this.channel3.disable()
                    this.channel4.disable()
                    this.reset()
                }
                if (!this.enabled && enabled) { // turn-on APU
                    // console.log('turn-on APU')
                    this.frame = 7
                }
                this.enabled = enabled
                break;
        }
    }
}


class Channel12 {
    constructor (APU, channelNumber, audioContext) {
        this.APU = APU
        this.channelNumber = channelNumber;
        this.audioContext = audioContext;
    }

    init () {
        this.reset()
    }

    reset () {
        this.reg = {}
        this.reg.NR10 = 0
        this.reg.NR11 = 0
        this.reg.NR12 = 0
        this.reg.NR13 = 0
        this.reg.NR14 = 0
        this.reg.NR21 = 0
        this.reg.NR22 = 0
        this.reg.NR23 = 0
        this.reg.NR24 = 0

        this.playing = false;

        this.soundLength = 64; // defaults to 64 periods
        this.lengthCheck = false;

        this.sweepPeriod = 0; // from 0 to 7
        this.sweepTimer = 0;
        this.sweepShifts = 0;
        this.sweepSign = 1; // +1 / -1 for increase / decrease freq
        this.sweepEnabled = 0;
        this.sweepFrequency = 0;
        this.sweepCalculatedSubtract = false

        this.frequency = 0;

        this.envelopePeriod = 0;
        this.envelopeTimer = 0;
        this.envelopeSign = 1;
        this.envelopeAutomatic = false;
        this.envelopeInitialVolume = 0;
        this.envelopeVolume = 0

        let gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0;
        let oscillator = this.audioContext.createOscillator();
        oscillator.type = 'square';
        oscillator.frequency.value = 1000;
        oscillator.connect(gainNode);
        oscillator.start(0);

        this.gainNode = gainNode;
        this.oscillator = oscillator;
    }

    play () {
        this.playing = true;
        this.APU.setSoundFlag(this.channelNumber, 1);
        this.gainNode.connect(this.audioContext.destination);
        // If length counter is zero, it is set to max
        if (this.soundLength <= 0) {
            // console.log('If length counter is zero, it is set to max')
            this.setLength(0)
            // Trigger that un-freezes enabled length should clock it, if the next frame is not length check
            if (this.lengthCheck && (this.APU.frame & 1) == 0) {
                // console.log('Trigger that un-freezes enabled length should clock it. Current frame:', this.APU.frame)
                this.soundLength--;
            }
        }
        // sweep
        this.sweepTimer = this.sweepPeriod ? this.sweepPeriod : 8;
        this.sweepEnabled = this.sweepShifts || this.sweepPeriod
        this.sweepFrequency = this.frequency
        this.sweepCalculatedSubtract = false
        // console.log('sweep:', this.sweepEnabled)
        if (this.sweepShifts) {
            if (this.calcSweepFreq() > 0x7FF) {
                // console.log('of')
                this.stop();
            }
        }
        // envelope
        this.setEnvelopeVolume(this.envelopeInitialVolume)
        this.envelopeTimer = this.envelopePeriod ? this.envelopePeriod : 8
        this.envelopeAutomatic = true;
        // if the next frame is updating envelope, increment the timer
        if ((this.APU.frame + 1) == 7) {
            this.envelopeTimer += 1
        }
        // disable the channel if the DAC is disabled
        if (this.channelNumber == 1 && (this.reg.NR12 >> 3) == 0)
            this.stop()
        if (this.channelNumber == 2 && (this.reg.NR22 >> 3) == 0)
            this.stop()
    };

    stop () {
        this.playing = false;
        this.APU.setSoundFlag(this.channelNumber, 0);
        this.gainNode.disconnect();
    };

    calcSweepFreq () {
        let oldFreq = this.sweepFrequency;
        let newFreq = oldFreq + this.sweepSign * (oldFreq >> this.sweepShifts);
        if (this.sweepSign == -1) this.sweepCalculatedSubtract = true
        return newFreq;
    };

    setFrequency (value) {
        this.frequency = value;
        this.oscillator.frequency.value = 131072 / (2048 - this.frequency);
    };

    setLength (value) {
        this.soundLength = 64 - (value & 0x3F);
    };

    setLengthCheck (enabled, triggering) {
        if ((!this.lengthCheck) && enabled) { // if enabling length check
            // Enabling length check when the next frame is not length check will result in extra clock
            if ((this.APU.frame & 1) == 0 && this.soundLength > 0) {
                // console.log('Enabling length in first half of length period should clock length. Current frame:', this.APU.frame)
                this.soundLength--;
                if (this.soundLength == 0 && !triggering) {
                    this.stop();
                }
            }
        }
        this.lengthCheck = enabled
    }

    setEnvelopeVolume (volume) {
        this.envelopeVolume = volume;
        this.gainNode.gain.value = this.envelopeVolume * 1 / 100;
    };

    disable () {
        this.oscillator.disconnect();
    };

    enable () {
        this.oscillator.connect(this.gainNode);
    };


    updateSweep () {
        if (!(this.playing && this.sweepEnabled)) return;
        this.sweepTimer -= 1
        if (this.sweepTimer == 0) {
            if (this.sweepPeriod) {
                this.sweepTimer = this.sweepPeriod // reload sweep timer
                // console.log('updateSweep')
                let newFreq = this.calcSweepFreq(); // calc new freq
                if (newFreq > 0x7FF) {
                    // console.log('of')
                    this.stop();
                } else {
                    if (this.sweepShifts) {
                        this.reg.NR13 = newFreq & 0xFF;
                        this.reg.NR14 &= 0xF8;
                        this.reg.NR14 |= (newFreq & 0x700) >> 8;

                        this.setFrequency(newFreq)
                        this.sweepFrequency = newFreq

                        newFreq = this.calcSweepFreq(); // calc freq again
                        if (newFreq > 0x7FF) {
                            // console.log('of')
                            this.stop();
                        }
                    }
                }
            } else {
                this.sweepTimer = 8
            }
        }
    }

    updateLength () {
        if (this.lengthCheck && this.soundLength > 0) {
            this.soundLength--;
            // console.log('len check:', this.soundLength, 'cy:', this.APU.ngb.TIMER.total_m * 4)
            if (this.soundLength == 0) {
                // console.log('stopped by length check')
                this.stop();
            }
        }
    }

    updateEnvelope () {
        if (this.envelopePeriod) {
            if (this.envelopeAutomatic) {
                this.envelopeTimer -= 1
                if (this.envelopeTimer == 0) {
                    this.envelopeTimer = this.envelopePeriod
                    let volume = this.envelopeVolume + this.envelopeSign
                    if (volume < 15 && volume >= 0) {
                        this.setEnvelopeVolume(volume)
                    } else {
                        this.envelopeAutomatic = false
                    }
                }
            }
        } else {
            this.envelopeTimer = 8
        }
    }

}

class Channel3 {
    constructor (APU, channelNumber, audioContext) {
        this.APU = APU
        this.channelNumber = channelNumber;
        this.audioContext = audioContext;
    }

    init () {
        this.reset()
    }

    reset () {
        this.reg = {}
        this.reg.NR30 = 0x7f
        this.reg.NR31 = 0
        this.reg.NR32 = 0x9f
        this.reg.NR33 = 0
        this.reg.NR34 = 0
        // if reset again, do not erase wave ram
        // if first time reset, initialize wave rom with 0
        if (typeof this.waveRam === 'undefined') this.waveRam = Array(16).fill(0)

        this.playing = false;

        this.soundLength = 0;
        this.lengthCheck = false;

        this.wavePeriod = 0
        this.waveCycles = 0
        this.wavePosition = 0
        this.waveSampleTime = 0
        this.wavePlaying = 0

        this.frequency = 0

        this.buffer = new Float32Array(32);

        let gainNode = this.audioContext.createGain();
        gainNode.gain.value = 1;
        this.gainNode = gainNode;

        this.baseSpeed = 65536;
        let waveBuffer = this.audioContext.createBuffer(1, 32, this.baseSpeed);

        let bufferSource = this.audioContext.createBufferSource();
        bufferSource.buffer = waveBuffer;
        bufferSource.loop = true;
        bufferSource.connect(gainNode);
        bufferSource.start(0);

        this.waveBuffer = waveBuffer;
        this.bufferSource = bufferSource;
    }

    play () {
        this.playing = true;
        this.APU.setSoundFlag(this.channelNumber, 1);
        this.waveBuffer.copyToChannel(this.buffer, 0, 0);

        this.gainNode.connect(this.audioContext.destination);

        // If length counter is zero, it is set to max
        if (this.soundLength <= 0) {
            // console.log('If length counter is zero, it is set to max')
            this.setLength(0)
            // Trigger that un-freezes enabled length should clock it, if the next frame is not length check
            if (this.lengthCheck && (this.APU.frame & 1) == 0) {
                // console.log('Trigger that un-freezes enabled length should clock it. Current frame:', this.APU.frame)
                this.soundLength--;
            }
        }

        // wave
        if (this.wavePlaying) {
            if (this.waveCycles == 4) {
                let position = (this.wavePosition + 1) & 31;
                let byte = this.waveRam[position >> 1];
                switch (position >> 3) {
                    case 0:
                        this.waveRam[0] = byte;
                        break;
                    case 1:
                    case 2:
                    case 3:
                        this.waveRam[0] = this.waveRam[(position >> 1) & 12]
                        this.waveRam[1] = this.waveRam[((position >> 1) & 12) + 1]
                        this.waveRam[2] = this.waveRam[((position >> 1) & 12) + 2]
                        this.waveRam[3] = this.waveRam[((position >> 1) & 12) + 3]
                        break;
                }
            }
        }
        this.wavePosition = 0
        this.waveCycles = this.wavePeriod + 8
        this.wavePlaying = true


        // disable the channel if the DAC is disabled
        if ((this.reg.NR30 >> 7) == 0) this.stop()
    };

    stop () {
        this.playing = false;
        this.wavePlaying = false
        this.APU.setSoundFlag(this.channelNumber, 0);
        this.gainNode.disconnect();
    };

    setFrequency (value) {
        this.frequency = value
        this.wavePeriod = ((0x7ff + 1) - this.frequency) * 2;
        value = 65536 / (2048 - value);
        this.bufferSource.playbackRate.value = value / this.baseSpeed;
    };

    getFrequency () {
        let freq = 2048 - 65536 / (this.bufferSource.playbackRate.value * this.baseSpeed);
        return freq | 1;
    };

    setLength (value) {
        this.soundLength = 256 - value;
    };

    setLengthCheck (enabled, triggering) {
        if ((!this.lengthCheck) && enabled) { // if enabling length check
            // Enabling length check when the next frame is not length check will result in extra clock
            if ((this.APU.frame & 1) == 0 && this.soundLength > 0) {
                // console.log('Enabling length in first half of length period should clock length. Current frame:', this.APU.frame)
                this.soundLength--;
                if (this.soundLength == 0 && !triggering) {
                    this.stop();
                }
            }
        }
        this.lengthCheck = enabled
    }

    setWaveBufferByte (index, value) {
        let bufferIndex = index * 2;

        this.buffer[bufferIndex] = (value >> 4) / 8 - 1; // value in buffer is in -1 -> 1
        this.buffer[bufferIndex + 1] = (value & 0x0F) / 8 - 1;
    };

    disable () {
        this.bufferSource.disconnect();
    };

    enable () {
        this.bufferSource.connect(this.gainNode);
    };

    updateLength () {
        if (this.lengthCheck && this.soundLength > 0) {
            this.soundLength--;
            // console.log('len check:',this.soundLength)
            if (this.soundLength == 0) {
                // console.log('stopped by length check')
                this.stop();
            }
        }
    }

    updateWave (m) {
        let t = m * 4
        this.waveCycles -= t

        while (this.waveCycles <= 2) {
            this.wavePosition += 1;
            if (this.wavePosition >= 32) this.wavePosition -= 32
            this.waveSampleTime = this.APU.ngb.TIMER.total_m * 4 - 2 + this.waveCycles
            this.waveCycles += this.wavePeriod
        }
    }

}

class Channel4 {
    constructor (APU, channelNumber, audioContext) {
        this.APU = APU
        this.channelNumber = channelNumber;
        this.audioContext = audioContext;
    }

    init () {
        this.reset()
    }

    reset () {
        this.reg = {}
        this.reg.NR41 = 0xff
        this.reg.NR42 = 0
        this.reg.NR43 = 0
        this.reg.NR44 = 0

        this.playing = false;

        this.soundLength = 64; // defaults to 64 periods
        this.lengthCheck = false;
    }

    play () {
        this.playing = true;
        this.APU.setSoundFlag(this.channelNumber, 1);

        // If length counter is zero, it is set to max
        if (this.soundLength <= 0) {
            // console.log('If length counter is zero, it is set to max')
            this.setLength(0)
            // Trigger that un-freezes enabled length should clock it, if the next frame is not length check
            if (this.lengthCheck && (this.APU.frame & 1) == 0) {
                // console.log('Trigger that un-freezes enabled length should clock it. Current frame:', this.APU.frame)
                this.soundLength--;
            }
        }

        // disable the channel if the DAC is disabled
        if ((this.reg.NR42 >> 3) == 0) this.stop()
    };

    stop () {
        this.playing = false;
        this.APU.setSoundFlag(this.channelNumber, 0);
    };

    updateLength () {
        if (this.lengthCheck && this.soundLength > 0) {
            this.soundLength--;
            // console.log('len check:',this.soundLength)
            if (this.soundLength == 0) {
                // console.log('stopped by length check')
                this.stop();
            }
        }
    }

    updateEnvelope () {
    }

    setLength (value) {
        this.soundLength = 64 - (value & 0x3F);
    };

    setLengthCheck (enabled, triggering) {
        if ((!this.lengthCheck) && enabled) { // if enabling length check
            // Enabling length check when the next frame is not length check will result in extra clock
            if ((this.APU.frame & 1) == 0 && this.soundLength > 0) {
                // console.log('Enabling length in first half of length period should clock length. Current frame:', this.APU.frame)
                this.soundLength--;
                if (this.soundLength == 0 && !triggering) {
                    this.stop();
                }
            }
        }
        this.lengthCheck = enabled
    }

    disable () {
    };

    enable () {
    };
}

export default APU