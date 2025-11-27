import { assert, describe, expect, it } from 'vitest'
import { Token } from '../src/lib/lexer.mjs'
import { Parser, Instruction } from '../src/lib/parser.mjs'

let tokens = [
    new Token('KWD', 'LD'),
    new Token('REG', 1),
    new Token('INT', 31),
    new Token('EOF', null)
];

let expected = new Instruction();
expected.line = 'LD: REG(1) <- INT(31)';
expected.memAddr = 0;
expected.immValue = 31;
expected.immFlag = 1;
expected.aluCtrl = 7;
expected.regAddr = 1;
expected.writeFlag = 1;
expected.clearFlag = 0;

describe('parsed tokens (4)', () => {
    let parser = new Parser(tokens);
    parser.parse();
    it('should produce single instruction', () => {
        expect(parser.instructions.length).toEqual(1)
    })

    it('should produce expected instruction', () => {
        expect(parser.instructions[0]).toEqual(expected)
    })
})

