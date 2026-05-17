import { BASE_TYPES, CARD_LIBRARY } from './constants.js';

export function shuffle(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export class Deck {
  constructor(extraCards = []) {
    this.extraCards = [...extraCards];
    this.draw = [];
    this.discard = [];
    this.refill();
  }

  static makeBaseCycle() {
    return [...shuffle(BASE_TYPES), ...shuffle(BASE_TYPES), ...shuffle(BASE_TYPES)];
  }

  size() {
    return this.draw.length + this.discard.length;
  }

  addCard(cardId) {
    this.extraCards.push(cardId);
    this.discard.push(cardId);
  }

  refill() {
    const base = Deck.makeBaseCycle();
    const specials = shuffle(this.extraCards);
    const merged = [...base];
    for (const card of specials) {
      const at = Math.floor(Math.random() * (merged.length + 1));
      merged.splice(at, 0, card);
    }
    this.draw = merged;
    this.discard = [];
  }

  next() {
    if (!this.draw.length) this.refill();
    const id = this.draw.shift();
    this.discard.push(id);
    return CARD_LIBRARY[id];
  }

  preview(n = 3) {
    while (this.draw.length < n) this.refill();
    return this.draw.slice(0, n).map(id => CARD_LIBRARY[id]);
  }
}
