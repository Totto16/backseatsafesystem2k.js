import { Cursor } from "./cursor"
import { Display } from "./display"
import { Keyboard } from "./keyboard"
import { Timer } from "./timer"

export class Periphery {
    private _timer: Timer
    private _keyboard: Keyboard
    private _display: Display
    private _cursor: Cursor

    constructor(
        timer: Timer,
        keyboard: Keyboard,
        display: Display,
        cursor: Cursor
    ) {
        this._timer = timer
        this._keyboard = keyboard
        this._display = display
        this._cursor = cursor
    }

    get timer(): Timer {
        return this._timer
    }

    get keyboard(): Keyboard {
        return this._keyboard
    }

    get display(): Display {
        return this._display
    }

    get cursor(): Cursor {
        return this._cursor
    }
}
