const DEFAULT_HEADER = {
    IO_MAP: [],
    SCREEN_X: 0b1101110,
    SCREEN_Y: 0b1100000,
    SCREEN_CTRL: 0b1101100,
    STACK_PTR: 0b0,
    STACK_DEPTH: 16
};

export const FORMATS = ["json", "schem"];

export class CodeGen {
    constructor(instructions) {
        this.instructions = instructions;
        this.output = {
            header: DEFAULT_HEADER,
            instructions: [],
            lines: []
        }
    }

    async build(outFile) {
        for(let inst of this.instructions) {
            this.output.instructions.push(inst.build());
            this.output.lines.push(inst.toString());
        }

        let outJson = JSON.stringify(this.output, null, 2);
        return outJson;
    }
}