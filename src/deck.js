import { BASE_TYPES, CARD_LIBRARY } from './constants.js?v=20260518-overflow1';

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
    this.removedBase = [];
    this.draw = [];
    this.discard = [];
    this.refill();
  }

  static makeBaseCycle(removedBase = []) {
    const removed = new Map();
    for (const id of removedBase) removed.set(id, (removed.get(id) || 0) + 1);
    const bags = [];
    for (let i = 0; i < 3; i++) {
      const bag = BASE_TYPES.filter(id => (removed.get(id) || 0) <= i);
      bags.push(...shuffle(bag));
    }
    return bags;
  }

  size() {
    return this.draw.length + this.discard.length;
  }

  addCard(cardId) {
    this.extraCards.push(cardId);
    this.discard.push(cardId);
  }

  removeCard(cardId) {
    const extraIndex = this.extraCards.indexOf(cardId);
    if (extraIndex >= 0) {
      this.extraCards.splice(extraIndex, 1);
    } else if (BASE_TYPES.includes(cardId)) {
      const removedCount = this.removedBase.filter(id => id === cardId).length;
      if (removedCount >= 2) return false;
      this.removedBase.push(cardId);
    } else {
      return false;
    }

    const drawIndex = this.draw.indexOf(cardId);
    if (drawIndex >= 0) this.draw.splice(drawIndex, 1);
    else {
      const discardIndex = this.discard.indexOf(cardId);
      if (discardIndex >= 0) this.discard.splice(discardIndex, 1);
    }
    return true;
  }

  refill() {
    const base = Deck.makeBaseCycle(this.removedBase);
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
