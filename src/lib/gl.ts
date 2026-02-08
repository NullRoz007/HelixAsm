import { Token } from './lexer';

export class GLPoint {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

const glDrawPixel = (p: GLPoint): Token[] => {
  /*LD #64 :0
  LD :6 #65
  AD :0
  LD #65 :0
  LD :1 3
  LD #66 :1
  LD :1 0
  LD #66 :1*/

  let tokens: Token[] = [
    //LD :0 X
    new Token('KWD', 'LD'),
    new Token('REG', 0),
    new Token('INT', p.x),

    //LD #64 :0
    new Token('KWD', 'LD'),
    new Token('MEM', 64),
    new Token('REG', 0),

    //LD :0 Y
    new Token('KWD', 'LD'),
    new Token('REG', 0),
    new Token('INT', p.y),

    //LD #65 :0
    new Token('KWD', 'LD'),
    new Token('MEM', 65),
    new Token('REG', 0),

    /*LD :0 3
      LD #66 :0
    */
    new Token('KWD', 'LD'),
    new Token('REG', 0),
    new Token('INT', 3),
    new Token('KWD', 'LD'),
    new Token('MEM', 66),
    new Token('REG', 0),
    
    /*LD :0 0
      LD #66 :0
    */
    new Token('KWD', 'LD'),
    new Token('REG', 0),
    new Token('INT', 0),
    new Token('KWD', 'LD'),
    new Token('MEM', 66),
    new Token('REG', 0),
  ]

  return tokens;
}

export const glDrawLine = (a: GLPoint, b: GLPoint): Token[] => {
    let lineTokens: Token[] = [];

    //DDA
    let diffX = b.x - a.x;
    let diffY = b.y - a.y;
    let step = Math.abs(diffX) > Math.abs(diffY) ? 
        Math.abs(diffX) : 
        Math.abs(diffY);

    let xIncr = diffX / step;
    let yIncr = diffY / step;
    let x = a.x;
    let y = a.y;
    let points: GLPoint[] = [];

    for(let i = 0; i <= step; i++) {
        let p: GLPoint = new GLPoint(Math.round(x), Math.round(y));
        points.push(p);

        x += xIncr;
        y += yIncr;
    }
    
    //Convert points to tokens representing a draw instruction:
    for(let p of points) {
        let pTokens = glDrawPixel(p);
        lineTokens.push(...pTokens);
    }

    return lineTokens;
} 