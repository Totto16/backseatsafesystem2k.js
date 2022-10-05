import * as Word from "./builtins/Word"

export enum KeyState {
    Down,
    Up,
}

export type KeyStates = {
    [key in string]?: KeyState
}

export class Keyboard {
    listenElement: HTMLElement
    pressedKeys: KeyStates

    static DEFAULT_STATE = KeyState.Up

    constructor(listenElement: HTMLElement) {
        this.listenElement = listenElement
        this.pressedKeys = {}

        listenElement.addEventListener("keyup", (event: KeyboardEvent) => {
            this.pressedKeys[event.code] = KeyState.Up
        })
        listenElement.addEventListener("keydown", (event: KeyboardEvent) => {
            this.pressedKeys[event.code] = KeyState.Down
        })
    }

    getKeyState(_key: string | Word.Word): KeyState {
        const key = typeof _key === "string" ? _key : String.fromCharCode(_key)
        return this.pressedKeys[key] ?? Keyboard.DEFAULT_STATE
    }
}
