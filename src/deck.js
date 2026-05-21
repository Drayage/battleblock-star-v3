import { BASE_TYPES, CARD_LIBRARY } from './constants.js?v=20260521-ko13';

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

  static fromState(state = {}) {
    const deck = Object.create(Deck.prototype);
    deck.extraCards = [...(state.extraCards || [])];
    deck.removedBase = [...(state.removedBase || [])];
    deck.draw = [...(state.draw || [])];
    deck.discard = [...(state.discard || [])];
    deck.battleExhausted = new Set(state.battleExhausted || []);
    if (!deck.draw.length && !deck.discard.length) deck.refill();
    return deck;
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

  replaceCard(fromId, toId) {
    if (!CARD_LIBRARY[toId] || !this.removeCard(fromId)) return false;
    this.addCard(toId);
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

  beginBattle() {
    this.battleExhausted = new Set();
  }

  pollute(cardId, n = 1) {
    if (!CARD_LIBRARY[cardId]) return;
    for (let i = 0; i < n; i++) {
      const at = Math.min(this.draw.length, 1 + Math.floor(Math.random() * 4));
      this.draw.splice(at, 0, cardId);
    }
  }

  next() {
    let guard = 0;
    while (true) {
      if (!this.draw.length) this.refill();
      const id = this.draw.shift();
      const card = CARD_LIBRARY[id];
      if (card?.exhaust) {
        if (this.battleExhausted && this.battleExhausted.has(id)) {
          // 이번 전투에서 이미 등장한 1회용/소멸 블록은 다시 뽑지 않는다.
          if (++guard > 200) { this.discard.push(id); return card; }
          continue;
        }
        (this.battleExhausted || (this.battleExhausted = new Set())).add(id);
      }
      this.discard.push(id);
      return card;
    }
  }

  preview(n = 3) {
    while (this.draw.length < n) this.refill();
    return this.draw.slice(0, n).map(id => CARD_LIBRARY[id]);
  }

  toState() {
    return {
      extraCards: [...this.extraCards],
      removedBase: [...this.removedBase],
      draw: [...this.draw],
      discard: [...this.discard],
      battleExhausted: [...(this.battleExhausted || [])]
    };
  }
}
