export const ALU_MAP = {
  "AD": 0b001, 
  "SB": 0b010,
  "AN": 0b011,
  "OR": 0b100,
  "NO": 0b101,
  "XO": 0b110,

  //special
  "OVERRIDE": 0b111 
};

export const SPECIAL_INST_MAP = {
  "PP": 0,
  "PO": 0,
  "JZ": 0b01110011,
  "JP": 0b11111111,
  "RT": 0,
  "RI": 0b11101111,
  "SL": 0b00011000,
  "SR": 0b00010100
}