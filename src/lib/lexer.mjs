import { TOKENS, KEYWORDS } from "./asm.mjs";
import { evaluateExpression } from "./expr.mjs";

const MAX_EXPR_LENGTH = 50;

const isInteger = (c) => {
  let x = parseInt(c);
  return !isNaN(x) && Number.isInteger(x);
}

const isValidMacroChar = (c) => {
  let alpha = '@abcdefghijklmnopqrstuvwxyz_';
  return alpha.indexOf(c.toLowerCase()) != -1;
}

export class Token {
  constructor(type = null, value = null) {
    this.type = type;
    this.value = value;
  }
}

export class Lexer {
  /**
   * @param {string} source - HSM Source Code File 
   */
  constructor(source) {
    this.src = source.trim();
    this.tokens = {};
    this.keywords = KEYWORDS;
    this.pos = 0;
    this.expressions = [];
    this.subroutines = {};
    this.definitions = {};

    for(let t of TOKENS) this.tokens[t] = (v) => { return new Token(t, v) }
  }

  /**
   * Gets a register/memory address from the current position in the source
   * @returns {number}
  */
  getAddress() {
    let result = '';
    let next_char = this.src[this.pos + 1];

    while(isInteger(next_char)) {
      result += next_char;
      this.advance();
      next_char = this.src[this.pos + 1];
    }
    
    return parseInt(result);
  }

  /**
   * Gets a macro (@macro-type) from the current position in the source
   */
  getMacro() {
    let result = '';
    let next_char = this.src[this.pos + 1];
    let max = MAX_EXPR_LENGTH;
    let n = 0;
    
    while(next_char != ';') {
      result += next_char;
      this.advance();
      next_char = this.src[this.pos + 1];

      n++;
      if(n > max) {
        throw new Error(`Max expression length (${MAX_EXPR_LENGTH}) exceeded. Did you forget a ';'?\n${result}`);
      }

 
    }
    
    return result;
  }

  getSubroutine() {
    let nextToken = new Token();
    let computedTokens = [];

    while (nextToken.type != "ESR") {
      nextToken = this.getNextToken();
      if(!nextToken) break;

      if(nextToken.type != null) computedTokens.push(nextToken);
    }

    return computedTokens.splice(0, computedTokens.length - 1);
  }

  getLabel(name) {
    return this.labels.map((l) => l.name == name)[0] || null;
  }

  evaluateDefine(macro) {
    const parts = macro.split('=');
    if(parts.length != 2) throw new Error(`Invalid definition: ${macro}`);

    const name = parts[0].trim();
    const raw_value = parts[1].trim();

    let definitionLexer = new Lexer(raw_value);
    let tokens = definitionLexer.tokenize();
    tokens.pop();
    
    return { name, tokens };
  }

  /**
   * Advances the Lexer n positions
   * @param {number} n - positions to advance the Lexer, defaults to 1
   */
  advance(n = 1) {
    this.pos += n;
  }

  /**
   * Gets the next available Token from the source
   * @returns {Token}
   */
  getNextToken() {
    let token = new Token();
    let currentChar = this.src[this.pos];

    if (currentChar == ' ' || currentChar == '\n') {
      this.advance();
      return token;
    }

    if(this.pos > this.src.length - 1) {                    //EOF
      token = this.tokens.EOF(null);
    } else if(isInteger(currentChar)) {                     //INTEGER
      let result = '';

      while(isInteger(currentChar)) {
        result += currentChar;
        currentChar = this.src[this.pos + 1];
        this.advance();
      }

      token = this.tokens.INT(parseInt(result));
    } else if(currentChar == ':' || currentChar == '#') {   //REGISTER || MEM
      let result = this.getAddress();
      token = currentChar == ':' ? 
        this.tokens.REG(result) : 
        this.tokens.MEM(result);
    } else if(currentChar == '@') {                         //MACRO
      let macroType = '';

      while(isValidMacroChar(currentChar)) {
        currentChar = this.src[this.pos + 1];
        if(currentChar == ' ' || currentChar == ';') break;

        macroType += currentChar;
        this.advance();
      }

      const macro = this.getMacro().trim();

      switch (macroType) {
        case 'expr':
          let result = evaluateExpression(macro);
          this.expressions.push({'expr': macro, 'value': result});
          token = this.tokens.INT(result);
          break;
        case 'label': 
          token = this.tokens.LBL(macro);
          break;
        case 'start':
          this.advance(2);

          let subTokens = this.getSubroutine();
          this.subroutines[macro] = subTokens;
          break;
        case 'route':
          token = this.tokens.ROUTE(macro);
          break;
        case 'end':
          token = this.tokens.ESR(null);
          return token;
          break;
        case 'define':
          let { name, tokens } = this.evaluateDefine(macro);
          if(tokens.length != 1) {
            throw new Error(`Definitions may only contain a single reg, mem addr, or imm value: ${macro}`);
          }

          this.definitions[name] = tokens;
          break;
        default: 
          throw new Error(`Unknown Macro Type: ${macroType}`);
      }

      this.advance(2);

    } else {                                                //KEYWORD
      let keyword = '';
      while(currentChar != ' ' && currentChar != '\n') {
        keyword += currentChar;

        if(this.pos + 1 >= this.src.length) break;
        currentChar = this.src[this.pos + 1];
        
        if(keyword == 'RT') break;
        this.advance();
      }

      if(this.keywords.indexOf(keyword) != -1) {
        token = this.tokens.KWD(keyword);
      } else if(this.definitions[keyword] !== undefined) {
        token = this.definitions[keyword][0];
      } else {
        token = null;
        throw new Error(`Unknown Keyword: ${keyword}`);
      } 
    }

    this.advance();
    return token;
  }

  tokenize() {
    let nextToken = new Token();
    let computedTokens = [];

    while (nextToken.type != "EOF") {
      nextToken = this.getNextToken();
      
      if(!nextToken) break;
     
      if(nextToken.type != null) { 
        computedTokens.push(nextToken);
      }
    }

    this.tokens = computedTokens;
    return computedTokens;
  }
}
