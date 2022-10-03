export enum CursorMode {
    Blinking = 0,
    Visible = 1,
    Invisible = 2,
}

export type Duration = number

export type Instant = number

export class Cursor {
    visible: boolean
    time_of_next_toggle: Instant
    TOGGLE_INTERVAL: Duration = 400
    constructor(visible: boolean, time_of_next_toggle: Instant) {
        this.visible = visible
        this.time_of_next_toggle = time_of_next_toggle
    }
}
