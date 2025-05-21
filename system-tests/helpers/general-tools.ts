import { sleep, verboseLog } from "../../lib/utils.ts";
import {
  BrowserFunctions,
  splitUrlIntoBaseAndPath,
  turnOffJsEverywhere,
} from "./test_utils.ts";

export async function waitForCondition(
  checkFn: () => Promise<boolean>,
  errorHandler: (error: Error | null) => void,
) {
  const timeout = 2000;
  const interval = 50;
  const startTime = Date.now();
  let lastError: Error | null = null;

  while ((Date.now() - startTime) < timeout) {
    try {
      const result = await checkFn();
      if (result) {
        return;
      }
      lastError = null;
    } catch (e) {
      verboseLog(`Error while checking condition:`, e);
      lastError = e as Error;
    }
    await sleep(interval);
  }

  errorHandler(lastError);
}

export function generateUniqueTestRoomName() {
  return `testroom-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export async function waitForRoomStatusMessageToBecome(
  browser: BrowserFunctions,
  votingStartedMessage: string,
  options: { refreshEachTime?: boolean; hackyLookupQuestionInstead?: boolean } =
    {},
) {
  let lastKnownStatusMessage = await browser.getRoomStatusMessage();
  await waitForCondition(async () => {
    if (options.refreshEachTime || turnOffJsEverywhere) {
      await browser.refresh();
    }
    lastKnownStatusMessage = options.hackyLookupQuestionInstead
      ? await browser.getCurrentQuestionFromGuestScreen()
      : await browser.getRoomStatusMessage();
    verboseLog(
      `Checking room status message [${lastKnownStatusMessage}] against [${votingStartedMessage}], [${
        lastKnownStatusMessage === votingStartedMessage
      }]`,
    );
    return lastKnownStatusMessage === votingStartedMessage;
  }, (err) => {
    if (err) {
      err.message = "Error in waitForRoomStatusMessageToBecome: " + err.message;
      throw err;
    }
    const message =
      `Timed out waiting for room status to become [${votingStartedMessage}], latest value was [${lastKnownStatusMessage}]`;
    throw new Error(message);
  });
}

export async function loginAndCreateRoom(
  hostBrowser: BrowserFunctions,
  roomName: string,
  username: string,
  userPassword: string,
) {
  await hostBrowser.logInUser(username, userPassword);
  await hostBrowser.assertCurrentUriIs("/account");
  await hostBrowser.fillFormWith({
    roomName: roomName,
  });
  await hostBrowser.clickButton("Create Room");
  const roomUrl = await hostBrowser.getUrlForNewlyCreatedRoom();

  const { baseUrl, path } = splitUrlIntoBaseAndPath(roomUrl);
  return { roomUrl, baseUrl, path };
}

export async function getButtonSummaryForBrowsers(
  guestBrowsers: BrowserFunctions[],
) {
  return await Promise.all(guestBrowsers.map(async (browser) => {
    return {
      forButton: await browser.hasElement("button:has-text('For')"),
      againstButton: await browser.hasElement("button:has-text('Against')"),
      abstainButton: await browser.hasElement("button:has-text('Abstain')"),
    };
  }));
}

export function getPresentButtons(buttonSummaryBeforeVoting: {
  againstButton: boolean;
  abstainButton: boolean;
  forButton: boolean;
}[]) {
  return buttonSummaryBeforeVoting.reduce((acc: string[], curr: {
    forButton: boolean;
    againstButton: boolean;
    abstainButton: boolean;
  }) => {
    if (curr.forButton) {
      acc.push("For");
    }
    if (curr.againstButton) {
      acc.push("Against");
    }
    if (curr.abstainButton) {
      acc.push("Abstain");
    }
    return acc;
  }, [] as string[]);
}
