export async function execAndWait(
  command: string,
  args: string[] = [],
  options: {
    hideStdOut?: boolean;
    hideStdErr?: boolean;
    passThroughEnv?: boolean;
    cwd?: string;
    env?: Record<string, string>;
  } = {},
): Promise<{
  code: number;
  success: boolean;
  fullCommand: string;
}> {
  const env = {
    ...(options.env || {}),
    ...(options.passThroughEnv ? Deno.env.toObject() : {}),
  };
  const a = new Deno.Command(command, {
    args: args,
    env,
    cwd: options.cwd || Deno.cwd(),
    stdout: options.hideStdOut ? "null" : "inherit",
    stderr: options.hideStdErr ? "null" : "inherit",
  });
  const child = a.spawn();
  const status = await child.status;
  const output = await child.output();
  const code = output.code;
  return {
    code,
    success: status.success,
    fullCommand: [command].concat(args).join(" "),
  };
}

export async function execAndWaitOrThrow(
  ...args: Parameters<typeof execAndWait>
) {
  const result = await execAndWait(...args);
  if (!result.success) {
    throw new Error(
      `Command [${result.fullCommand}] failed with code [${result.code}]`,
    );
  }
  return result;
}
