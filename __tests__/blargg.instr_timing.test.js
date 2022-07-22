import ngbc from '../src/ngbc'
import { checkSerial } from '../src/testUtilities'

jest.setTimeout(120 * 1000)

let emu = new ngbc("headless-non-blocking");
emu.bridge.jest = {
    serialBuffer: ''
}
emu.MMU.load_rom_localfile('testRoms/instr_timing.gb')
emu.run()

let ans = ["i", "n", "s", "t", "r", "_", "t", "i", "m", "i", "n", "g", "\n", "\n", "\n", "P", "a", "s", "s", "e", "d", "\n"]
ans = ans.join('')

it('Check serial output', () => {
    expect.assertions(1);
    return expect(checkSerial(700000, emu, 1)).resolves.toEqual(ans);
});
