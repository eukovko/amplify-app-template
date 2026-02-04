/**
 * Domain model for a counter.
 */
export class Counter {
  private _value: number;

  constructor(initialValue = 0) {
    this._value = initialValue;
  }

  get value(): number {
    return this._value;
  }

  increment(): void {
    this._value += 1;
  }

  decrement(): void {
    this._value -= 1;
  }
}
