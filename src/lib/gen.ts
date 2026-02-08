import { Instruction } from "./parser";

const DEFAULT_HEADER = {
    IO_MAP: [],
    SCREEN_X: 0b1101110,
    SCREEN_Y: 0b1100000,
    SCREEN_CTRL: 0b1101100,
    STACK_PTR: 0b0,
    STACK_DEPTH: 16
};

export const FORMATS = ["json", "schem"];

class Header {
    IO_MAP: number[];
    SCREEN_X: number;
    SCREEN_Y: number;
    SCREEN_CTRL: number;
    STACK_PTR: number;
    STACK_DEPTH: number;

    constructor(ioMap, screenX, screenY, screenCtrl, stackPtr, stackDepth) {
        this.IO_MAP = ioMap;
        this.SCREEN_X = screenX;
        this.SCREEN_Y = screenY;
        this.SCREEN_CTRL = screenCtrl;
        this.STACK_PTR = stackPtr;
        this.STACK_DEPTH = stackDepth;
    }
}

class CodeGenResult {
    header: Header;
    instructions: string[][];
    lines: string[];

    constructor(header, instrucions, lines) {
        this.header = header;
        this.instructions = instrucions;
        this.lines = lines;
    }
}

export class CodeGen {
    instructions: Instruction[];
    output: CodeGenResult;
    constructor(instructions) {
        this.instructions = instructions;
        this.output = {
            header: DEFAULT_HEADER as Header,
            instructions: [],
            lines: []
        }
    }

    async build(outFile): Promise<string> {
        for(let inst of this.instructions) {
            this.output.instructions.push(inst.build());
            this.output.lines.push(inst.toString());
        }

        let outJson = JSON.stringify(this.output, null, 2);
        return outJson;
    }
}