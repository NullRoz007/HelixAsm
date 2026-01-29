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
    this.tokenInjectionStream = [];
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
    while (isInteger(this.peek())) {
      result += this.peek();
      this.advance();
    }
    return parseInt(result);
  }

  /**
   * Gets a macro (@macro-type) from the current position in the source
   */
  getMacro() {
    let result = '';
    let n = 0;
    
    while(this.peek() != ';') {
      result += this.peek();
      this.advance();
      if(++n > MAX_EXPR_LENGTH) {
        throw new Error(`Max expression length (${MAX_EXPR_LENGTH}) exceeded. Did you forget a ';'?\n${result}`);
      }
    }
    
    this.advance();
    return result.trim();
  }

  getSubroutine() {
    const computedTokens = [];

    while(true) {
      const nextToken = this.getNextToken();
      if(nextToken == null) continue;
      if(nextToken.type == 'ESR') break;
      if(nextToken.type == 'EOF') break;
      if(nextToken.type != null) computedTokens.push(nextToken);
    }

    return computedTokens;
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

  peek() {
    return this.src[this.pos];
  }

  skipWhitespace() {
    while (this.peek() === ' ' || this.peek() === '\n' || this.peek() === '\t') {
      this.advance();
    }
  }

  /**
   * Gets the next available Token from the source
   * @returns {Token}
   */
  getNextToken() {
    if (this.tokenInjectionStream.length > 0) {
      return this.tokenInjectionStream.shift();
    }
    
    this.skipWhitespace();


    if(this.pos > this.src.length - 1) {                    //EOF
      return this.tokens.EOF(null);
    }

    const currentChar = this.peek();

    if(isInteger(currentChar)) {                     //INTEGER
      let result = '';

      while(isInteger(this.peek())) {
        result += this.peek();
        this.advance();
      }

      return this.tokens.INT(parseInt(result));
    } 
    
    if(currentChar == ':' || currentChar == '#') {   //REGISTER || MEM
      this.advance();
      const addr = this.getAddress();
      return currentChar === ':' ? 
        this.tokens.REG(addr) : 
        this.tokens.MEM(addr);
    } 
    
    if(currentChar == '@') {                         //MACRO
      this.advance();

      let macroType = '';
      while(isValidMacroChar(this.peek())) {
        macroType += this.peek();
        this.advance();
      }

      this.skipWhitespace();
      const macro = this.getMacro();
      
      console.log('@'+macroType + " "+macro);

      switch (macroType) {
        case 'expr':
          let result = evaluateExpression(macro);
          this.expressions.push({'expr': macro, 'value': result});
          return this.tokens.INT(result);          
        case 'label': 
          return this.tokens.LBL(macro);
        case 'start':
          let subTokens = this.getSubroutine();
          this.subroutines[macro] = subTokens;
          console.log(subTokens);
          return null;
        case 'route':
          return this.tokens.ROUTE(macro);
        case 'end':
          return this.tokens.ESR(null);
        case 'repeat':
          if(!isInteger(macro)) throw new Error(`Invalid repeat value: ${macro}`);
          
          let repeat = parseInt(macro);
          let repTokens = this.getSubroutine();
          let expanded = [];
          for(let i = 0; i < repeat; i++) {
            for(let t of repTokens) {
              expanded.push(new Token(t.type, t.value));    
            }
          }

          this.tokenInjectionStream.unshift(...expanded);
          return null;
        case 'define':
          let { name, tokens } = this.evaluateDefine(macro);
          if(tokens.length != 1) {
            console.log(tokens);
            throw new Error(`Definitions may only contain a single reg, mem addr, or imm value: ${macro}`);
          }

          this.definitions[name] = tokens;
          return null;
        default: 
          throw new Error(`Unknown Macro Type: ${macroType}`);
      }

    }
    
    //KEYWORD
    let keyword = '';
    while(this.peek() && this.peek() != ' ' && this.peek() != '\n') {
      keyword += this.peek();
      this.advance();
    }

    if(this.keywords.indexOf(keyword) != -1) {
      return this.tokens.KWD(keyword);
    } 
    
    if(this.definitions[keyword] !== undefined) {
      return this.definitions[keyword][0];
    }
    
    throw new Error(`Unknown Keyword: ${keyword}`);
  }

  tokenize() {
    const computedTokens = [];

    while(true) {
      const nextToken = this.getNextToken();
      if(nextToken == null) continue;
      computedTokens.push(nextToken);

      if(nextToken.type == 'EOF') break;
    }

    this.tokens = computedTokens;
    return computedTokens;
  }
}