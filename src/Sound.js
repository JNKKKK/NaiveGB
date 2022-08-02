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

        this.reset()
    }

    reset () {
        this.reg = {}
        this.reg.NR50 = 0
        this.reg.NR51 = 0
        this.reg.NR52 = 0
        this.enable = false
        this.channel1.init()
        this.channel2.init()
        this.channel3.init()
        this.channel4.init()
    }

    update (clockElapsed) {
        if (this.enable == false) return;
        this.channel1.update(clockElapsed);
        this.channel2.update(clockElapsed);
        this.channel3.update(clockElapsed);
        this.channel4.update(clockElapsed);
    };

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
        this.enable = true
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
                return this.channel3.waveRam[addr - 0xFF30]
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
        // when powered off, ignore all write operations to regs
        if (!this.enable && addr != 0xFF26 && addr < 0xFF30) return

        let frequency;

        switch (addr) {
            // Channel 1 addresses
            case 0xFF10: // NR10 - Channel 1 Sweep register (R/W)
                this.channel1.reg.NR10 = val | 0x80
                this.channel1.clockSweep = 0;
                this.channel1.sweepTime = ((val & 0x70) >> 4);
                this.channel1.sweepSign = (val & 0x08) ? -1 : 1;
                this.channel1.sweepShifts = (val & 0x07);
                this.channel1.sweepCount = this.channel1.sweepShifts;
                break;
            case 0xFF11: // NR11 - Channel 1 Sound length/Wave pattern duty (R/W)
                // todo : bits 6-7
                this.channel1.reg.NR11 = val
                this.channel1.setLength(val & 0x3F);
                break;
            case 0xFF12: // NR12 - Channel 1 Volume Envelope (R/W)
                this.channel1.reg.NR12 = val
                this.channel1.envelopeSign = (val & 0x08) ? 1 : -1;
                this.channel1.setEnvelopeVolume((val & 0xF0) >> 4);
                this.channel1.envelopeStep = (val & 0x07);
                // disabling DAC should disable the channel immediately
                if ((val >> 3) == 0) this.setSoundFlag(1, 0);
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
                this.channel1.setLengthCheck((val & 0x40) ? true : false);
                if (val & 0x80) this.channel1.play();
                break;

            // Channel 2 addresses
            case 0xFF16: // NR21 - Channel 2 Sound Length/Wave Pattern Duty (R/W)
                // todo : bits 6-7
                this.channel2.reg.NR21 = val
                this.channel2.setLength(val & 0x3F);
                break;
            case 0xFF17: // NR22 - Channel 2 Volume Envelope (R/W)
                this.channel2.reg.NR22 = val
                this.channel2.envelopeSign = (val & 0x08) ? 1 : -1;
                let envelopeVolume = (val & 0xF0) >> 4;
                this.channel2.setEnvelopeVolume(envelopeVolume);
                this.channel2.envelopeStep = (val & 0x07);
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
                this.channel2.setLengthCheck((val & 0x40) ? true : false);
                if (val & 0x80) this.channel2.play();
                break;

            // Channel 3 addresses
            case 0xFF1A: // NR30 - Channel 3 Sound on/off (R/W)
                this.channel3.reg.NR30 = val | 0x7f
                // disabling DAC should disable the channel immediately
                if ((val >> 7) == 0) this.setSoundFlag(3, 0);
                break;
            case 0xFF1B: // NR31 - Channel 3 Sound Length (W)
                this.channel3.reg.NR31 = val
                this.channel3.setLength(val);
                break;
            case 0xFF1C: // NR32 - Channel 3 Select output level (R/W)
                // todo
                this.channel3.reg.NR32 = val | 0x9f
                break;
            case 0xFF1D: // NR33 - Channel 3 Frequency’s lower data (W)
                this.channel3.reg.NR33 = val
                frequency = this.channel3.getFrequency();
                frequency &= 0xF00;
                frequency |= val;
                this.channel3.setFrequency(frequency);
                break;
            case 0xFF1E: // NR34 - Channel 3 Frequency’s higher data (R/W)
                this.channel3.reg.NR34 = val
                frequency = this.channel3.getFrequency();
                frequency &= 0xFF;
                frequency |= (val & 7) << 8;
                this.channel3.setFrequency(frequency);
                this.channel3.setLengthCheck((val & 0x40) ? true : false);
                if (val & 0x80) this.channel3.play();

                break;
            // channel 3 wave bytes
            case 0xFF30: case 0xFF31: case 0xFF32: case 0xFF33: case 0xFF34: case 0xFF35: case 0xFF36: case 0xFF37:
            case 0xFF38: case 0xFF39: case 0xFF3A: case 0xFF3B: case 0xFF3C: case 0xFF3D: case 0xFF3E: case 0xFF3F:
                let index = addr - 0xFF30;
                this.channel3.waveRam[index] = val
                this.channel3.setWaveBufferByte(index, val);
                break;

            // Channel 4 addresses
            case 0xFF20: // NR41 - Channel 4 Sound Length (W)
                this.channel4.reg.NR41 = val | 0xc0
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
                    this.channel1.disable()
                    // this.channel1.reset()
                    this.channel2.disable()
                    // this.channel2.reset()
                    this.channel3.disable()
                    // this.channel3.reset()
                    this.channel4.disable()
                    // this.channel4.reset()
                    this.reset()
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

        this.soundLengthUnit = 0x4000; // 1 / 256 second of instructions
        this.soundLength = 64; // defaults to 64 periods
        this.lengthCheck = false;

        this.sweepTime = 0; // from 0 to 7
        this.sweepStepLength = 0x8000; // 1 / 128 seconds of instructions
        this.sweepCount = 0;
        this.sweepShifts = 0;
        this.sweepSign = 1; // +1 / -1 for increase / decrease freq

        this.frequency = 0;

        this.envelopeStep = 0;
        this.envelopeStepLength = 0x10000;// 1 / 64 seconds of instructions
        this.envelopeCheck = false;
        this.envelopeSign = 1;

        this.clockLength = 0;
        this.clockEnvelop = 0;
        this.clockSweep = 0;

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
            this.setLength(0)
            // Trigger that un-freezes enabled length should clock it
            if (this.lengthCheck && this.clockLength < (this.soundLengthUnit / 2)) {
                this.soundLength--;
            }
        }
        this.clockEnvelop = 0;
        this.clockSweep = 0;
        if (this.sweepShifts > 0) this.checkFreqSweep();
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

    checkFreqSweep () {
        let oldFreq = this.frequency;
        let newFreq = oldFreq + this.sweepSign * (oldFreq >> this.sweepShifts);
        if (newFreq > 0x7FF) {
            newFreq = 0;
            this.stop();
        }
        return newFreq;
    };

    setFrequency (value) {
        this.frequency = value;
        this.oscillator.frequency.value = 131072 / (2048 - this.frequency);
    };

    setLength (value) {
        this.soundLength = 64 - (value & 0x3F);
    };

    setLengthCheck (bool) {
        if ((!this.lengthCheck) && bool) { // if enabling length check
            // Enabling length in first half of length period should clock length
            if (this.clockLength < this.soundLengthUnit / 2) {
                this.soundLength--;
                if (this.soundLength <= 0) {
                    this.soundLength = 0
                    this.stop();
                }
            }
        }
        this.lengthCheck = bool
    }

    setEnvelopeVolume (volume) {
        this.envelopeCheck = volume > 0 && volume < 16 ? true : false;
        this.envelopeVolume = volume;
        this.gainNode.gain.value = this.envelopeVolume * 1 / 100;
    };

    disable () {
        this.oscillator.disconnect();
    };

    enable () {
        this.oscillator.connect(this.gainNode);
    };

    update (clockElapsed) {
        this.clockEnvelop += clockElapsed;
        this.clockSweep += clockElapsed;

        if ((this.sweepCount || this.sweepTime) && this.clockSweep > (this.sweepStepLength * this.sweepTime)) {
            this.clockSweep -= (this.sweepStepLength * this.sweepTime);
            this.sweepCount--;

            let newFreq = this.checkFreqSweep(); // process and check new freq

            if (this.channelNumber == 1) { // if channel 1
                this.reg.NR13 = newFreq & 0xFF;
                this.reg.NR14 &= 0xF8;
                this.reg.NR14 |= (newFreq & 0x700) >> 8;
            } else { // if channel 2
                this.reg.NR23 = newFreq & 0xFF;
                this.reg.NR24 &= 0xF8;
                this.reg.NR24 |= (newFreq & 0x700) >> 8;
            }

            this.setFrequency(newFreq);

            this.checkFreqSweep(); // check again with new value
        }

        if (this.envelopeCheck && this.clockEnvelop > this.envelopeStepLength) {
            this.clockEnvelop -= this.envelopeStepLength;
            this.envelopeStep--;
            this.setEnvelopeVolume(this.envelopeVolume + this.envelopeSign);
            if (this.envelopeStep <= 0) {
                this.envelopeCheck = false;
            }
        }

        this.clockLength += clockElapsed;
        if (this.clockLength > this.soundLengthUnit) {
            this.clockLength -= this.soundLengthUnit;
            if (this.lengthCheck) this.soundLength--;
            if (this.soundLength <= 0) {
                this.soundLength = 0
                if (this.lengthCheck) {
                    this.stop();
                }
            }
        }
    };
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
        if (typeof this.waveRam === 'undefined') this.waveRam = Array(16).fill(0)

        this.playing = false;

        this.soundLength = 0;
        this.soundLengthUnit = 0x4000; // 1 / 256 second of instructions
        this.lengthCheck = false;

        this.clockLength = 0;

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
            this.setLength(0)
            // Trigger that un-freezes enabled length should clock it
            if (this.lengthCheck && this.clockLength < (this.soundLengthUnit / 2)) {
                this.soundLength--;
            }
        }

        if ((this.reg.NR30 >> 7) == 0) this.stop()
    };

    stop () {
        this.playing = false;
        this.APU.setSoundFlag(this.channelNumber, 0);
        this.gainNode.disconnect();
    };

    setFrequency (value) {
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

    setLengthCheck (bool) {
        if ((!this.lengthCheck) && bool) { // if enabling length check
            // Enabling length in first half of length period should clock length
            if (this.clockLength < this.soundLengthUnit / 2) {
                this.soundLength--;
                if (this.soundLength <= 0) {
                    this.soundLength = 0
                    this.stop();
                }
            }
        }
        this.lengthCheck = bool
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

    update (clockElapsed) {
        this.clockLength += clockElapsed;
        if (this.clockLength > this.soundLengthUnit) {
            this.clockLength -= this.soundLengthUnit;
            if (this.lengthCheck) this.soundLength--;
            if (this.soundLength <= 0) {
                this.soundLength = 0
                if (this.lengthCheck) {
                    this.stop();
                }
            }
        }
    };
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

        this.soundLengthUnit = 0x4000; // 1 / 256 second of instructions
        this.soundLength = 64; // defaults to 64 periods
        this.lengthCheck = false;

        this.clockLength = 0;

    }

    play () {
        this.playing = true;
        this.APU.setSoundFlag(this.channelNumber, 1);

        // If length counter is zero, it is set to max
        if (this.soundLength <= 0) {
            this.setLength(0)
            // Trigger that un-freezes enabled length should clock it
            if (this.lengthCheck && this.clockLength < (this.soundLengthUnit / 2)) {
                this.soundLength--;
            }
        }

        if ((this.reg.NR42 >> 3) == 0) this.stop()
    };

    stop () {
        this.playing = false;
        this.APU.setSoundFlag(this.channelNumber, 0);
    };

    update (clockElapsed) {
        this.clockLength += clockElapsed;
        if (this.clockLength > this.soundLengthUnit) {
            this.clockLength -= this.soundLengthUnit;
            if (this.lengthCheck) this.soundLength--;
            if (this.soundLength <= 0) {
                this.soundLength = 0
                if (this.lengthCheck) {
                    this.stop();
                }
            }
        }
    };

    setLength (value) {
        this.soundLength = 64 - (value & 0x3F);
    };

    setLengthCheck (bool) {
        if ((!this.lengthCheck) && bool) { // if enabling length check
            // Enabling length in first half of length period should clock length
            if (this.clockLength < this.soundLengthUnit / 2) {
                this.soundLength--;
                if (this.soundLength <= 0) {
                    this.soundLength = 0
                    this.stop();
                }
            }
        }
        this.lengthCheck = bool
    }

    disable () {
    };
    enable () {
    };
}

export default APU