import { Token } from "./lexer.js";

const isInteger = (c) => {
  let x = parseInt(c);
  return !isNaN(x) && Number.isInteger(x);
};

class ExprLexer {
  constructor(expression) {
    this.expression = expression.replaceAll(' ', '');
    this.pos = 0;
  }

  advance() {
    this.pos += 1;
  }

  getNextToken() {
    if (this.pos >= this.expression.length) {
      return new Token("EOF", null);
    }

    let currentChar = this.expression[this.pos];

    if (isInteger(currentChar)) {
      let result = '';
      
      while (isInteger(currentChar)) {
        result += currentChar;
        this.advance();
        currentChar = this.expression[this.pos];
      }

      return new Token("INT", parseInt(result));
    }

    this.advance();
    return new Token("OP", currentChar);
  }

  tokenize() {
    let tokens = [];
    let t = this.getNextToken();

    while (t.type !== "EOF") {
      tokens.push(t);
      t = this.getNextToken();
    }

    tokens.push(new Token("EOF", null));
    return tokens;
  }
}

class ExprParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;

    this.precedence = {
      '+': 10,
      '-': 10,
      '*': 20,
      '/': 20
    };
  }

  peek() {
    return this.tokens[this.pos];
  }

  next() {
    return this.tokens[this.pos++];
  }

  lbp(token) {
    if (token.type == 'OP') {
      return this.precedence[token.value] || 0;
    }
    return 0;
  }

  nud(token) {
    if (token.type == "INT") {
      return { type: "atom", value: token.value };
    }

    if (token.type == "OP" && token.value == "(") {
      let expr = this.parseExpression(0);
      this.next(); // consume ')'
      return expr;
    }

    throw new Error("Unexpected token in nud: " + token.value);
  }

  led(left, token) {
    if (token.type == "OP") {
      let right = this.parseExpression(this.lbp(token));
      return {
        type: "expr",
        op: token.value,
        left,
        right
      };
    }

    throw new Error("Unexpected token in led: " + token.value);
  }

  parseExpression(rbp = 0) {
    let token = this.next();
    let left = this.nud(token);

    while (rbp < this.lbp(this.peek())) {
      let op = this.next();
      left = this.led(left, op);
    }

    return left;
  }

  parse() {
    return this.parseExpression(0);
  }
}

const evaluate = (ast) => {
    if(ast.type == 'atom') return ast.value;
    if(ast.type == 'expr') {
        let left = evaluate(ast.left);
        let right = evaluate(ast.right);
        
        switch(ast.op) {
            case '+':
                return left + right;
            case '-':
                return left - right;
            case '*':
                return left * right;
            case '/':
                return left / right;    
            default: 
                throw new Error("Error evalulating AST!");
        }
    }
}

export const evaluateExpression = (expression) => {
    const lexer = new ExprLexer(expression);
    const tokens = lexer.tokenize();
    const parser = new ExprParser(tokens);
    const ast = parser.parse();
    const result = evaluate(ast);

    return result;
}

