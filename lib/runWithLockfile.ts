import { verboseLog } from "./utils.ts";

const proc = Deno.args[0];

async function acquireLock(lockFilePath: string): Promise<void> {
  while (true) {
    try {
      const lockFile = await Deno.open(lockFilePath, {
        createNew: true,
        write: true,
      });
      lockFile.close();
      break;
    } catch (err) {
      if (err instanceof Deno.errors.AlreadyExists) {
        const stats = await Deno.lstat(lockFilePath).catch(() => null);
        if (stats && stats.mtime && stats.mtime.getTime() < Date.now() - 4000) {
          verboseLog("stale lockfile");
          await Deno.remove(lockFilePath).catch(() => {});
        } else {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      } else {
        throw err;
      }
    }
  }
}

async function releaseLock(lockFilePath: string): Promise<void> {
  try {
    await Deno.remove(lockFilePath);
  } catch (err) {
    console.error(proc, "Failed to release lock:", err);
  }
}

export async function runWithLockfile<T>(
  lockFilePath: string,
  fn: () => Promise<T> | T,
): Promise<T> {
  await acquireLock(lockFilePath);
  let returnValue;
  try {
    returnValue = await fn();
  } catch (e) {
    await releaseLock(lockFilePath);
    throw e;
  }
  await releaseLock(lockFilePath);
  return returnValue;
}
