import ngbc from '../src/ngbc'
import { checkSerial } from '../src/testUtilities'

jest.setTimeout(120 * 1000)

let emu = new ngbc("headless-non-blocking");
emu.bridge.jest = {
    serialBuffer: ''
}
emu.MMU.load_rom_localfile('testRoms/mem_timing1.gb')
emu.run()

let ans = ["m", "e", "m", "_", "t", "i", "m", "i", "n", "g", "\n", "\n", "0", "1", ":", "o", "k", " ", " ", "0", "2", ":", "o", "k", " ", " ", "0", "3", ":", "o", "k", " ", " ", "\n", "\n", "P", "a", "s", "s", "e", "d", " ", "a", "l", "l", " ", "t", "e", "s", "t", "s", "\n"]
ans = ans.join('')

it('Check serial output', () => {
    expect.assertions(1);
    return expect(checkSerial(1610000, emu, 1)).resolves.toEqual(ans);
});
