import { PseudoFile } from "."
import { Address } from "./address_constants"
import { Cursor } from "./cursor"
import { Display } from "./display"
import { Keyboard } from "./keyboard"
import { Machine } from "./machine"
import { Periphery } from "./periphery"
import { DrawHandle } from "./terminal"
import { Timer } from "./timer"

export interface Size2D {
    width: number
    height: number
}

export const SCREEN_SIZE: Size2D = {
    width: 1280,
    height: 720,
}

export const OPCODE_LENGTH: number = 16

export const TARGET_FPS: number = 60

export class Register {
    //#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
    index: number
    constructor(index: number) {
        this.index = index
    }

    static from(value: number): Register {
        return new Register(value)
    }
}

export type Path = string

export type Action = {
    /// Execute a ROM file (typically *.backseat)
    Run: {
        /// The path to the ROM file to be executed
        path: Path

        /// Applying this flag makes the application quit when executing the 'halt and catch fire'-
        /// instruction.
        exitOnHalt: boolean
    }
    /// Emit a sample program as machine code
    Emit: {
        /// Output path of the machine code to be written
        path: Path
    }
    /// Write the available opcodes and other information such as constants in JSON format
    Json: {
        /// Output path of the JSON file to be written
        path: Path
    }
}

export type PossibleActions = "Run" | "Emit" | "Json"

/// The typescript web based implementation of the backseat-safe-system-2k, everything was modifies from the reference implementation
export interface Args<P extends PossibleActions = PossibleActions> {
    action: P
    arguments: Action[P]
}

export function runProgramm(handle: DrawHandle, file: PseudoFile, args: Args) {
    switch (args.action) {
        case "Run":
            {
                const { path, exitOnHalt } = args.arguments as Action["Run"]
                run(file, handle, exitOnHalt)
            }
            break
        case "Emit":
            {
                const { path } = args.arguments as Action["Emit"]
                throw new Error("NOT implemented atm!")
                //  emit(path.as_deref()),
            }
            break

        case "Json":
            {
                const { path } = args.arguments as Action["Json"]
                throw new Error("NOT implemented atm!")
                //print_json(path.as_deref()),
            }
            break
        default:
            throw new Error(`unimplemented Action: ${args.action}!`)
    }
}


export enum Constant {
    Register = 0,
    Address,
    UnsignedInteger
}

export type PossibleConstants = Register | Address | number;

/* 
fn print_json(output_filename: Option<&Path>) -> Result<(), Box<dyn Error>> {
    #[derive(Serialize)]
    struct JsonInfo {
        opcodes: HashMap<&'static str, OpcodeDescription>,
        constants: HashMap<&'static str, Constant>,
        flags: HashMap<&'static str, usize>,
    }

    let json_info = JsonInfo {
        opcodes: Opcode::as_hashmap(),
        constants: HashMap::from([
            (
                "ENTRY_POINT",
                Constant::Address(address_constants::ENTRY_POINT),
            ),
            (
                "NUM_REGISTERS",
                Constant::UnsignedInteger(NUM_REGISTERS as _),
            ),
            ("FLAGS", Constant::Register(Processor::FLAGS.0.into())),
            (
                "INSTRUCTION_POINTER",
                Constant::Register(Processor::INSTRUCTION_POINTER.0.into()),
            ),
            (
                "STACK_POINTER",
                Constant::Register(Processor::STACK_POINTER.0.into()),
            ),
            (
                "STACK_START",
                Constant::Address(address_constants::STACK_START),
            ),
            (
                "STACK_SIZE",
                Constant::UnsignedInteger(address_constants::STACK_SIZE as _),
            ),
            (
                "FIRST_FRAMEBUFFER_START",
                Constant::Address(address_constants::FIRST_FRAMEBUFFER_START),
            ),
            (
                "SECOND_FRAMEBUFFER_START",
                Constant::Address(address_constants::SECOND_FRAMEBUFFER_START),
            ),
            (
                "FRAMEBUFFER_SIZE",
                Constant::UnsignedInteger(address_constants::FRAMEBUFFER_SIZE as _),
            ),
            (
                "TERMINAL_WIDTH",
                Constant::UnsignedInteger(terminal::WIDTH as _),
            ),
            (
                "TERMINAL_HEIGHT",
                Constant::UnsignedInteger(terminal::HEIGHT as _),
            ),
            (
                "TERMINAL_BUFFER_SIZE",
                Constant::UnsignedInteger(address_constants::TERMINAL_BUFFER_SIZE as _),
            ),
            (
                "TERMINAL_BUFFER_START",
                Constant::Address(address_constants::TERMINAL_BUFFER_START),
            ),
            (
                "TERMINAL_BUFFER_END",
                Constant::Address(address_constants::TERMINAL_BUFFER_END),
            ),
            (
                "TERMINAL_CURSOR_POINTER",
                Constant::Address(address_constants::TERMINAL_CURSOR_POINTER),
            ),
            (
                "TERMINAL_CURSOR_MODE",
                Constant::Address(address_constants::TERMINAL_CURSOR_MODE),
            ),
            (
                "TERMINAL_CURSOR_MODE_BLINKING",
                Constant::UnsignedInteger(CursorMode::Blinking as _),
            ),
            (
                "TERMINAL_CURSOR_MODE_VISIBLE",
                Constant::UnsignedInteger(CursorMode::Visible as _),
            ),
            (
                "TERMINAL_CURSOR_MODE_INVISIBLE",
                Constant::UnsignedInteger(CursorMode::Invisible as _),
            ),
            (
                "DISPLAY_WIDTH",
                Constant::UnsignedInteger(display::WIDTH as _),
            ),
            (
                "DISPLAY_HEIGHT",
                Constant::UnsignedInteger(display::HEIGHT as _),
            ),
        ]),
        flags: Flag::as_hashmap(),
    };
    let json_string = serde_json::to_string_pretty(&json_info).unwrap();
    match output_filename {
        Some(filename) => std::fs::write(filename, &json_string)?,
        None => println!("{json_string}"),
    }

    Ok(())
} */
/* 
fn emit(output_filename: Option<&Path>) -> Result<(), Box<dyn Error>> {
    let opcodes = &[
        Opcode::MoveRegisterImmediate {
            // starting color
            register: 0.into(),
            immediate: 0xFF,
        },
        Opcode::MoveRegisterImmediate {
            // num iterations
            register: 42.into(),
            immediate: (display::WIDTH * display::HEIGHT) as Word,
        },
        // outer loop start
        Opcode::MoveRegisterImmediate {
            // current loop counter
            register: 1.into(),
            immediate: 0,
        },
        Opcode::AddTargetSourceImmediate {
            // current color
            target: 0.into(),
            source: 0.into(),
            immediate: 0x200,
        },
        Opcode::MoveRegisterImmediate {
            register: 2.into(),
            immediate: address_constants::FIRST_FRAMEBUFFER_START,
        },
        // inner loop start
        Opcode::MovePointerSource {
            pointer: 2.into(),
            source: 0.into(),
        },
        Opcode::AddTargetSourceImmediate {
            target: 2.into(),
            source: 2.into(),
            immediate: Word::SIZE as Word,
        },
        Opcode::AddTargetSourceImmediate {
            target: 1.into(),
            source: 1.into(),
            immediate: 1,
        },
        Opcode::CompareTargetLhsRhs {
            target: 10.into(),
            lhs: 1.into(),
            rhs: 42.into(),
        },
        Opcode::JumpImmediateIfLessThan {
            comparison: 10.into(),
            immediate: address_constants::ENTRY_POINT + 5 * Instruction::SIZE as Word,
        },
        Opcode::JumpImmediate {
            immediate: address_constants::ENTRY_POINT + 2 * Instruction::SIZE as Word,
        },
    ];
    let machine_code = opcodes_to_machine_code(opcodes);
    match output_filename {
        Some(filename) => save_opcodes_as_machine_code(opcodes, filename)?,
        None => io::Write::write_all(&mut std::io::stdout(), &machine_code)?,
    }

    Ok(())
}
 */


export function run(file: PseudoFile,handle: DrawHandle, exitOnHalt: boolean) : void{
        // TODO init canvas here instead of earlier
/*     let (raylib_handle, raylib_thread) = raylib::init()
        .size(SCREEN_SIZE.width, SCREEN_SIZE.height)
        .title("Backseater")
        .build(); */

    const listenDiv = handle[0].parentElement ?? handle[1].parentElement;
    if(listenDiv === null){
        throw new Error("The two canvas have no parent element, but the keyboard requires such an element!")
    }

    const timer = new Timer(new Date())
    const periphery = new Periphery(
        timer,
        new Keyboard(listenDiv),
        new Display(handle),
        new Cursor(true, new Date().getTime() + Cursor.TOGGLE_INTERVAL)
        )

    let machine = new Machine(periphery, exitOnHalt);

    loadRom(machine, file);
    machine.CachedInstructions();

    // TODO load font here, instead of previously
 /*    #[cfg(feature = "graphics")]
    let font = raylib_handle
        .borrow_mut()
        .load_font(&raylib_thread, "./resources/CozetteVector.ttf")?; */

    let timeMeasurements : TimeMeasurements =  {
        nextRenderTime: timer.getMsSinceEpoch(),
        lastCycleCount: 0,
        lastRenderTime: 0,
        clockFrequencyAccumulator: 0,
        nextClockFrequencyRender: timer.getMsSinceEpoch() + 1000,
        numClockFrequencyAccumulations: 0,
        clockFrequencyAverage: 0,
    };

    let stopVM = false;

    while (stopVM) {
        const currentTime = timer.getMsSinceEpoch();
        renderIfNeeded(
            currentTime,
            timeMeasurements,
            machine,
        );

            const [averageFrequency, dontRender] = [ timeMeasurements.clockFrequencyAverage,
                currentTime > timeMeasurements.nextRenderTime]

        let numCycles : number;
        
        if(dontRender){
            timeMeasurements.nextRenderTime = currentTime;
            numCycles = 0;
        }else if(averageFrequency === 0){
            numCycles = 10_000
        }else{
            const remainingMsUntilNextRender = timeMeasurements.nextRenderTime - currentTime;
            const cycleDuration = 1000.0 / timeMeasurements.clockFrequencyAverage;
            numCycles = (remainingMsUntilNextRender / cycleDuration - 10.0) 
        }
        

        Array(numCycles).forEach(_=>executeNextInstruction(machine));
        }
}

function loadRom(
    machine: Machine,
    file: PseudoFile): void {
    writeBuffer(file.content, machine)
}

function writeBuffer(content : Uint8ClampedArray, machine: Machine) :  {
    if ((Memory.SIZE - ENTRY_POINT) < content.length) {
        throw new Error(`File size ${content.length} too big`);
    }
    if (content.length % Word.SIZE != 0 ){
        throw new Error(`Filesize must be divisible by ${Word.SIZE}`);
    }
    machine.memory.data.set(content,  ENTRY_POINT);
}

fn duration_since_epoch() -> Duration {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
}

fn ms_since_epoch() -> u64 {
    let since_the_epoch = duration_since_epoch();
    since_the_epoch.as_secs() * 1000 + since_the_epoch.subsec_nanos() as u64 / 1_000_000
}

fn execute_next_instruction<Display>(machine: &mut Machine<Display>)
where
    Display: crate::Display + 'static,
{
    if !machine.is_halted() {
        machine.execute_next_instruction();
    }
}

fn opcodes_to_machine_code(instructions: &[Opcode]) -> Vec<u8> {
    instructions
        .iter()
        .map(|opcode| opcode.as_instruction())
        .flat_map(|instruction| instruction.to_be_bytes())
        .collect()
}

fn save_opcodes_as_machine_code(instructions: &[Opcode], filename: &Path) -> io::Result<()> {
    let file_contents = opcodes_to_machine_code(instructions);
    std::fs::write(filename, &file_contents)
}

export interface TimeMeasurements {
    nextRenderTime: number,
    lastCycleCount: number,
    lastRenderTime: number,
    clockFrequencyAccumulator: number,
    nextClockFrequencyRender: number,
    numClockFrequencyAccumulations: number,
    clockFrequencyAverage: number,
}

#[cfg(feature = "graphics")]
fn render_if_needed(
    currentTime: u64,
    timeMeasurements: &mut TimeMeasurements,
    raylib_handle: &mut RaylibHandle,
    thread: &RaylibThread,
    machine: &mut Machine<DisplayImplementation>,
    font: &Font,
    custom_number_format: &CustomFormat,
) {
    if currentTime >= timeMeasurements.nextRenderTime {
        timeMeasurements.nextRenderTime += 1000 / TARGET_FPS;

        let mut draw_handle = raylib_handle.begin_drawing(thread);
        render(&mut draw_handle, machine, font);

        let current_cycle_count = machine.processor.get_cycle_count();
        if currentTime != timeMeasurements.lastRenderTime {
            calculate_clock_frequency(currentTime, timeMeasurements, current_cycle_count);
            draw_clock_frequency(
                timeMeasurements,
                custom_number_format,
                &mut draw_handle,
                font,
            );
        }
        timeMeasurements.lastRenderTime = currentTime;
        timeMeasurements.lastCycleCount = current_cycle_count;
    }
}

#[cfg(feature = "graphics")]
fn render(
    draw_handle: &mut RaylibDrawHandle,
    machine: &mut Machine<DisplayImplementation>,
    font: &Font,
) {
    draw_handle.clear_background(Color::BLACK);
    machine.render(draw_handle, font);
    draw_handle.draw_fps(SCREEN_SIZE.width - 150, 10);
}

fn calculate_clock_frequency(
    currentTime: u64,
    timeMeasurements: &mut TimeMeasurements,
    current_cycle_count: u64,
) {
    let time_since_last_render = currentTime - timeMeasurements.lastRenderTime;
    let cycles_since_last_render = current_cycle_count - timeMeasurements.lastCycleCount;
    let clock_frequency = 1000 * cycles_since_last_render / time_since_last_render;
    timeMeasurements.clockFrequencyAccumulator += clock_frequency;
    timeMeasurements.numClockFrequencyAccumulations += 1;
    if currentTime >= timeMeasurements.nextClockFrequencyRender {
        timeMeasurements.clockFrequencyAverage = timeMeasurements.clockFrequencyAccumulator
            / timeMeasurements.numClockFrequencyAccumulations;
        timeMeasurements.nextClockFrequencyRender = currentTime + 1000;
        timeMeasurements.clockFrequencyAccumulator = 0;
        timeMeasurements.numClockFrequencyAccumulations = 0;
    }
}

#[cfg(feature = "graphics")]
fn draw_clock_frequency(
    timeMeasurements: &TimeMeasurements,
    custom_number_format: &CustomFormat,
    draw_handle: &mut RaylibDrawHandle,
    font: &Font,
) {
    draw_handle.draw_text_ex(
        font,
        &*format!(
            "{} kHz",
            (timeMeasurements.clockFrequencyAverage / 1000)
                .to_formatted_string(custom_number_format)
        ),
        Vector2::new(SCREEN_SIZE.width as f32 - 200.0, 100.0),
        30.0,
        1.0,
        Color::WHITE,
    );
}
 */
