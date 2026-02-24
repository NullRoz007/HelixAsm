import { TOKENS, KEYWORDS, CHAR_MAP } from "./asm";
import { evaluateExpression } from "./expr";
import { glDrawLine, GLPoint } from "./gl";
import { Instruction } from "./parser";

const MAX_EXPR_LENGTH = 256;
const MAX_STRING_LENGTH = 256;
const COMMENT_REGEX = '/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*/';

const isInteger = (c) => {
  let x = parseInt(c);
  return !isNaN(x) && Number.isInteger(x);
}

const isValidMacroChar = (c) => {
  let alpha = '@abcdefghijklmnopqrstuvwxyz_:';
  return alpha.indexOf(c.toLowerCase()) != -1;
}

export class Token {
  type: string;
  value: any;
  constructor(type = null, value = null) {
    this.type = type;
    this.value = value;
  }
}

export class Lexer {
  src: string;
  tokenInjectionStream: Token[];
  tokens: Record<string, any>;
  keywords: string[];
  pos: number;
  expressions: any[]; //setup a proper expressions class?
  subroutines: Record<string, Token[]>;
  definitions: Record<string, any>;

  constructor(source) {
    this.tokenInjectionStream = [];
    this.tokens = {};
    this.keywords = KEYWORDS;
    this.pos = 0;
    this.expressions = [];
    this.subroutines = {};
    this.definitions = {};

    for(let t of TOKENS) this.tokens[t] = (v) => { return new Token(t, v) }
    
    let strippedSrc = source.trim();
    let matches = strippedSrc.match(COMMENT_REGEX);
    while(matches) {
      strippedSrc = strippedSrc.replace(matches[0], '');
      matches = strippedSrc.match(COMMENT_REGEX);
    }
  
    this.src = strippedSrc.trim();
  }

  /**
   * Gets a register/memory address from the current position in the source
   * @returns {number}
  */
  getAddress(): number {
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
  getMacro(): string {
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

  getStringFromMacro(macro: string): string {
    if(macro[0] != '"') throw new Error(`Invalid string in macro: ${macro}`);
    if(macro.length <= 2) return "";
    
    let result = '';
    let i = 1;

    while(macro[i] != '"') {
      result += macro[i];
      i++;
    }

    return result;
  }

  stringToTokens(str: string): Token[] {
    const tokens: Token[] = [];

    for(let c of str) {
      let i = CHAR_MAP.indexOf(c.toLowerCase());
      if(i == -1) continue;

      let charCode = (i | 0b00100000); 
      let charTokens = [
        new Token('KWD', 'LD'),
        new Token('REG', 0),
        new Token('INT', charCode),
        new Token('KWD', 'LD'),
        new Token('MEM', 16),
        new Token('REG', 0)
      ];

      tokens.push(...charTokens);
    }
    
    return tokens;
  }

  seperatePointsFromPointString(pointString: string): string[] {
    return pointString.split(',');
  }

  pointsFromLineMacro(macro: string): GLPoint[] {
    let pointStrings: string[] = macro.split(':');
    if(pointStrings.length != 2) throw Error('Invalid point macro!');
    
    let firstPointStr   = pointStrings[0];
    let secondPointStr  = pointStrings[1];

    if(
      firstPointStr.split(',').length != 2 || 
      secondPointStr.split(',').length != 2
    ) throw Error('Invalid point macro!');

    let p1Parts = firstPointStr.split(',');
    let p2Parts = secondPointStr.split(',');
    
    let x1: number = evaluateExpression(p1Parts[0]);
    let y1: number = evaluateExpression(p1Parts[1]);

    let x2: number = evaluateExpression(p2Parts[0]);
    let y2: number = evaluateExpression(p2Parts[1]);
    
    let p1: GLPoint = new GLPoint(x1, y1);
    let p2: GLPoint = new GLPoint(x2, y2);

    return [ p1, p2 ];
  }

  getSubroutine(): Token[] {
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

  peek(): string {
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
  getNextToken(): Token {
    if (this.tokenInjectionStream.length > 0) {
      return this.tokenInjectionStream.shift();
    }
    
    this.skipWhitespace();

    if(this.pos > this.src.length - 1) {                    // EOF
      return this.tokens.EOF(null);
    }

    const currentChar = this.peek();
    
    if(isInteger(currentChar)) {                            //INTEGER
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
        case 'puts':
          let str = this.getStringFromMacro(macro);
          let strTokens = this.stringToTokens(str);

          this.tokenInjectionStream.unshift(...strTokens);
          return null;
        case 'line':
          let initialPoints = this.pointsFromLineMacro(macro);
          let glTokens = glDrawLine(initialPoints[0], initialPoints[1]);
          this.tokenInjectionStream.unshift(...glTokens);
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

  tokenize(): Token[] {
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