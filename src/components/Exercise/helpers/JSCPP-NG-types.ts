export interface CRuntime {};

export type Specifier = "const" | "inline" | "_stdcall" | "extern" | "static" | "auto" | "register";

export interface IncludeModule {
  load(rt: CRuntime): void;
}

export interface Stdio {
  isMochaTest?: boolean;
  promiseError: (promise_error: Error) => void;
  drain?: () => string;
  cinStop: () => void;
  cinProceed: () => void;
  cinState: () => boolean;
  setReadResult: (result: string) => void;
  getReadResult: () => string;
  getInput: () => Promise<string>;
  finishCallback: (ExitCode: number) => void;
  write: (s: string) => void;
}

const arithmeticSig = {
    "I8": {},
    "U8": {},
    "I16": {},
    "U16": {},
    "I32": {},
    "U32": {},
    "I64": {},
    "U64": {},
    "F32": {},
    "F64": {},
    "BOOL": {},
} as const;

export type ArithmeticSig = keyof (typeof arithmeticSig);

export interface JSCPPConfig {
  specifiers?: Specifier[];
  arithmeticResolutionMap?: { [x: string]: ArithmeticSig };
  includes?: { [fileName: string]: IncludeModule };
  loadedLibraries: string[];
  fstream?: {
    open: (context: any, fileName: string) => FileInstance;
  };
  stdio?: Stdio;
  unsigned_overflow?: "error" | "warn" | "ignore";

  debug?: boolean;
  maxExecutionSteps?: number;
  maxTimeout?: number;
  eventLoopSteps?: number;
  stopExecutionCheck?: () => boolean;
}

export type FileInstance = {
    name: string;
    _open: boolean;
    is_open: () => boolean;
    read: (data: string) => string | void;
    clear: () => void;
    write: (data: string) => void;
    close: () => void;
};

export type InputFunction = () => Promise<string>;

export type JSCPPType = {
  run: (code: string, input: InputFunction, config: JSCPPConfig) => any | void;
};
