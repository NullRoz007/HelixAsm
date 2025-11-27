import { assert, describe, expect, it } from 'vitest'
import { Lexer, Token } from '../src/lib/lexer.mjs'

const src = "LD :1 31";
const expected = [
    new Token('KWD', 'LD'),
    new Token('REG', 1),
    new Token('INT', 31),
    new Token('EOF', null)
];
describe('tokenized source (LD :1 31)', () => {
    it('should produce correct tokens', () => {
        const hlxLexer = new Lexer(src);
        let tokens = hlxLexer.tokenize();
        expect(tokens).toEqual(expected);
    });
});

