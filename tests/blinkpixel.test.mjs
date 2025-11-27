import { assert, describe, expect, it } from 'vitest'
import { Lexer } from '../src/lib/lexer.mjs'
import { Parser } from '../src/lib/parser.mjs'

const src = `
LD :1 31
LD #110 :1
LD :2 1
LD #108 :1
LD :1 1
LD #108 :1
JP 0
`;

const expected = [
    ["0b00111111", "0b11100110"],
    ["0b11011100", "0b00000110"],
    ["0b00000011", "0b11101010"],
    ["0b11011000", "0b00000110"],
    ["0b00000011", "0b11100110"],
    ["0b11011000", "0b00000110"],
    ["0b00000000", "0b11111111"]
];


describe('compiled blink pixel instructions', () => {
  it('should contain correct data & op codes', () => {
    const hlxLexer = new Lexer(src);
    const tokens = hlxLexer.tokenize();
    const parser = new Parser(tokens);
    parser.parse();

    let result = [];
    
    for(let instruction of parser.instructions) {
      let raw = instruction.build();
      result.push(raw);
    }

    expect(result).toEqual(expected);
  });
});