import ngb from '../src/ngb'
import { checkSerial } from '../src/testUtilities'

jest.setTimeout(120 * 1000)

let emu = new ngb("headless-non-blocking");
emu.jest = {
    serialBuffer: ''
}
emu.MMU.load_rom_localfile('testRoms/cpu_instrs.gb')
emu.run()

let ans = ["c", "p", "u", "_", "i", "n", "s", "t", "r", "s", "\n", "\n", "0", "1", ":", "o", "k", " ", " ", "0", "2", ":", "o", "k", " ", " ", "0", "3", ":", "o", "k", " ", " ", "0", "4", ":", "o", "k", " ", " ", "0", "5", ":", "o", "k", " ", " ", "0", "6", ":", "o", "k", " ", " ", "0", "7", ":", "o", "k", " ", " ", "0", "8", ":", "o", "k", " ", " ", "0", "9", ":", "o", "k", " ", " ", "1", "0", ":", "o", "k", " ", " ", "1", "1", ":", "o", "k", " ", " ", "\n", "\n", "P", "a", "s", "s", "e", "d", " ", "a", "l", "l", " ", "t", "e", "s", "t", "s", "\n"]
ans = ans.join('')

it('Check serial output', () => {
    expect.assertions(1);
    return expect(checkSerial(56200000, emu, 5)).resolves.toEqual(ans);
});
