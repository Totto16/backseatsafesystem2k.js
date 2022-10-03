export enum KeyState {
    Down,
    Up,
}

export class Keyboard {
    getKeyStateCallback: (key: string) => KeyState

    constructor(getKeyStateCallback: (key: string) => KeyState) {
        this.getKeyStateCallback = getKeyStateCallback
    }

    getKeyState(key: string): KeyState {
        return this.getKeyStateCallback(key)
    }
}
