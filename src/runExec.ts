﻿import { v4 } from "https://deno.land/std@0.105.0/uuid/mod.ts";

function splitCommand(command: string): string[] {
  var myRegexp = /[^\s"]+|"([^"]*)"/gi;
  var splits = [];

  do {
    //Each call to exec returns the next regex match as an array
    var match = myRegexp.exec(command);
    if (match != null) {
      //Index 1 in the array is the captured group if it exists
      //Index 0 is the matched text, which we use if no captured group exists
      splits.push(match[1] ? match[1] : match[0]);
    }
  } while (match != null);

  return splits;
}

export enum OutputMode {
  None = 0, // no output, just run the command
  StdOut, // dump the output to stdout
  Capture, // capture the output and return it
  Tee, // both dump and capture the output
}

export interface IExecStatus {
  code: number;
  success: boolean;
}

export interface IExecResponse {
  status: IExecStatus;
  output: string;
  outputErr: string;
}

interface IOptions {
  output?: OutputMode;
  verbose?: boolean;
  continueOnError?: boolean;
}

export const exec = async (
  command: string,
  options: IOptions = { output: OutputMode.StdOut, verbose: false },
): Promise<IExecResponse> => {
  let splits = splitCommand(command);

  let uuid = "";
  if (options.verbose) {
    uuid = v4.generate();
    console.log(``);
    console.log(`Exec Context: ${uuid}`);
    console.log(`    Exec Options: `, options);
    console.log(`    Exec Command: ${command}`);
    console.log(`    Exec Command Splits:  [${splits}]`);
  }

  let p = Deno.run({ cmd: splits, stdout: "piped", stderr: "piped" });

  let responseStdOut = "";
  let responseStdErr = "";
  let decoder = new TextDecoder();

  if (p && options.output != OutputMode.None) {
    const buff = new Uint8Array(1);

    while (true) {
      try {
        let result = await p.stdout?.read(buff);
        if (!result) {
          break;
        }

        if (
          options.output == OutputMode.Capture ||
          options.output == OutputMode.Tee
        ) {
          responseStdOut = responseStdOut + decoder.decode(buff);
        }

        if (
          options.output == OutputMode.StdOut ||
          options.output == OutputMode.Tee
        ) {
          await Deno.stdout.write(buff);
        }
      } catch (ex) {
        break;
      }
    }

    while (true) {
      try {
        let result = await p.stderr?.read(buff);
        if (!result) {
          break;
        }

        if (
          options.output == OutputMode.Capture ||
          options.output == OutputMode.Tee
        ) {
          responseStdErr = responseStdErr + decoder.decode(buff);
        }

        if (
          options.output == OutputMode.StdOut ||
          options.output == OutputMode.Tee
        ) {
          await Deno.stdout.write(buff);
        }
      } catch (ex) {
        break;
      }
    }
  }

  let status = await p.status();
  p.stdout?.close();
  p.stderr?.close();
  p.close();

  let result = {
    status: {
      code: status.code,
      success: status.success,
    },
    output: responseStdOut.trim(),
    outputErr: responseStdErr.trim()
  };
  if (options.verbose) {
    console.log("    Exec Result: ", result);
    console.log(`Exec Context: ${uuid}`);
    console.log(``);
  }
  return result;
};

export const execSequence = async (
  commands: string[],
  options: IOptions = {
    output: OutputMode.StdOut,
    continueOnError: false,
    verbose: false,
  },
): Promise<IExecResponse[]> => {
  let results: IExecResponse[] = [];

  for (let i = 0; i < commands.length; i++) {
    let result = await exec(commands[i], options);
    results.push(result);
    if (options.continueOnError == false && result.status.code != 0) {
      break;
    }
  }

  return results;
};
