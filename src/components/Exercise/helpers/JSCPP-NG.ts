import { Result } from "../../../generated/globalTypes";
import { FileInstance, InputFunction, JSCPPConfig, JSCPPType } from "./JSCPP-NG-types";

declare var JSCPP: JSCPPType;

interface RunCppI {
  code: string;
  setLoading: (v: boolean) => void;
  setOutput: (v: string) => void;
  setResult: (v: Result) => void;
  stopExecution: { current: boolean };
  onSuccess?: Function;
  onError: (v: string) => void;
  getInput: (() => Promise<string>) | undefined;
  onFinish?: (error?: any) => void;
  addFile: (filename: string) => void;
}

export function runCpp({
  code,
  setLoading,
  setOutput,
  setResult,
  stopExecution,
  onSuccess,
  onError,
  getInput,
  onFinish,
  addFile
}: RunCppI) {

  setLoading(true);

  /*function mFileWrite(obj: HTMLObjectElement, stringToWrite: { v: string }) {
    const filenameNode = document.getElementById(obj.name);
    if (!filenameNode) {
    }
    (document.getElementById(obj.name) as any).value += stringToWrite.v;
  }
 
  function mFileOpen(obj: HTMLObjectElement) {
    if (obj.mode.v == "w") {
      filenameNode = document.getElementById(obj.name);
      if (!filenameNode) {
        addFileNode(obj.name);
      }
      document.getElementById(obj.name).value = "";
    }
    if (obj.mode.v == "a") {
      filenameNode = document.getElementById(obj.name);
      if (!filenameNode) {
        addFileNode(obj.name);
      }
    }
    if (obj.mode.v == "x") {
      filenameNode = document.getElementById(obj.name);
      if (!filenameNode) {
        addFileNode(obj.name);
      } else {
        //                Sk.builtin.IOError("Error. Such file already exists!");
      }
      document.getElementById(obj.name).value = "";
    }
  }*/

  let errorOccured: boolean = false;
  // Stops any asynchronous functions still running
  /*const stopit = function() {
    stopExecution.current = true;
    const elem = document.getElementById("input_panel");
    if (elem) {
      elem.style.display = "none";
    }
  }*/

  const fstream = (function() {
    const openFiles: { [name: string]: FileInstance } = {};

    return {
      open: function(context: any, fileName: string) {
        const openFileNode = ((context, getFileNode) => {
          if (context.t.name === "ofstream" && !getFileNode())
            addFile(fileName)

          return getFileNode();
        })(context, () => document.querySelector(`textarea[id='${fileName}']`));

        openFiles[fileName] = {
          name: fileName,
          _open: openFileNode != null,
          is_open: function() {
            return this._open;
          },
          read: function(_data: string) {
            if (!this.is_open())
              return;

            if (openFileNode && "value" in openFileNode) {
              return openFileNode.value as string;
            }
          },
          clear: function() {
            if (openFileNode && "value" in openFileNode) {
              openFileNode.value = "";
            }
          },
          write: function(data) {
            if (!this.is_open())
              return;

            if (openFileNode && "value" in openFileNode) {
              openFileNode.value += data;
            }
          },
          close: function() {
            this._open = false;
          }
        };

        return openFiles[fileName];
      }
    };
  })();

  function prepareLaunchRuntime(source: string, input: InputFunction | undefined, config: JSCPPConfig): void {
    errorOccured = false;

    stopExecution.current = false;

    JSCPP.run(source, input ?? function() { throw new Error("Input is not given") }, config);
  }

  const runit = function(source: string) {
    const msStart = Date.now();
    const config: JSCPPConfig = {
      fstream,
      includes: {},
      loadedLibraries: [],
      stdio: {
        finishCallback: function(exitCode: number) {
          const msEnd = Date.now();
          setOutput("\nprogram exited with code " + exitCode + "\ndone in " + ((msEnd - msStart) / 1000).toFixed(3) + " s\n\n");
          //hideProgress();
          setResult(Result.ACCEPT);
          setLoading(false);
          if (exitCode === 0) {
              onSuccess && onSuccess();
          }
          onFinish && onFinish();
        },
        promiseError: function(promise_error) {
          onError &&
            onError(
              '<span style="white-space: pre-line;">' +
              promise_error.toString() +
              "\n" +
              "</span>"
            );
          setResult(Result.RUNTIME_ERROR);
          setLoading(false);
          setOutput(promise_error.toString() + "\n");
          onFinish && onFinish();
        },
        write: function(s) {
          setOutput(s);
        },
        getInput: getInput ?? function() { stopExecution.current = true; throw new Error("getInput is undefined") },
      },
      stopExecutionCheck: function() {
        return stopExecution.current;
      },
      //maxExecutionSteps: (100 * 100) * 10, // (lines of code * loop iterations) * 10 times buffer
      maxTimeout: 3 * 60 * 1000, // 3 mins
      eventLoopSteps: 10_000,
      unsigned_overflow: "error"
    };

    prepareLaunchRuntime(source, getInput, config);
  }

  try {
    runit(code);
  } catch (_e) {
    const err = _e as Error;
    onError &&
      onError(
        '<span style="white-space: pre-line;">' +
        err.toString() +
        "\n" +
        "</span>"
      );

    console.log("ERR", JSON.stringify(err));
    setResult(Result.RUNTIME_ERROR);
    setLoading(false);
    setOutput(err.toString() + "\n");
    onFinish && onFinish(err.toString() + "\n");

  }

}

