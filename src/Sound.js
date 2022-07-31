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
                    start: () => { }
                })
            }
        }
        this.channel2 = new Channel1(this, 2, audioContext);

        this.reset()
    }

    reset () {
        this.reg = {}
        this.reg.NR50 = 0
        this.reg.NR51 = 0
        this.reg.NR52 = 0
        this.enable = false

        this.channel2.init()
    }

    update (clockElapsed) {
        if (this.enabled == false) return;

        this.channel2.update(clockElapsed);
    };

    setSoundFlag (channel, value) {
        let mask = 0xFF - (1 << (channel - 1));
        value = value << (channel - 1)
        this.reg.NR52 &= mask;
        this.reg.NR52 |= value;
    };

    rb (addr) {
        switch (addr) {
            // Channel 2 addresses
            case 0xFF16:
                return this.channel2.reg.NR21
            case 0xFF17:
                return this.channel2.reg.NR22
            case 0xFF18:
                return this.channel2.reg.NR23
            case 0xFF19:
                return this.channel2.reg.NR24

            // general audio switch
            case 0xFF24:
                return this.reg.NR50
            case 0xFF25:
                return this.reg.NR51
            case 0xFF26:
                return this.reg.NR52
        }
    }

    wb (addr, val) {
        let frequency;

        switch (addr) {
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
                this.channel2.lengthCheck = (val & 0x40) ? true : false;
                if (val & 0x80) {
                    this.channel2.play();
                }
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
                this.enabled = (val & 0x80) == 0 ? false : true;
                if (!this.enabled) {
                    // todo: clear all regs for all channels
                    // todo: stop sound
                }
                break;
        }
    }
}


class Channel1 {
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
        if (this.playing) return;
        this.playing = true;
        this.APU.setSoundFlag(this.channelNumber, 1);
        this.gainNode.connect(this.audioContext.destination);
        this.clockLength = 0;
        this.clockEnvelop = 0;
        this.clockSweep = 0;
        if (this.sweepShifts > 0) this.checkFreqSweep();
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

        if (this.lengthCheck) {
            this.clockLength += clockElapsed;
            if (this.clockLength > this.soundLengthUnit) {
                this.soundLength--;
                this.clockLength -= this.soundLengthUnit;
                if (this.soundLength == 0) {
                    this.setLength(0);
                    this.stop();
                }
            }
        }
    };
}

export default APU