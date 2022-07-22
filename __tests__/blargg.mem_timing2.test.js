import ngb from '../src/ngb'
import { checkGraphic, arrayHash, checkSerial } from '../src/testUtilities'

jest.setTimeout(120 * 1000)

let emu = new ngb("headless-non-blocking");
emu.jest = {
    serialBuffer: ''
}
emu.MMU.load_rom_localfile('testRoms/mem_timing2.gb')
emu.run()

let ans = -898750556

it('Check graphic output', () => {
    expect.assertions(1);
    return expect(checkGraphic(2610000, emu, 1)).resolves.toEqual(ans);
});
