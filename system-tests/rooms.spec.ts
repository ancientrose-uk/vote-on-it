import {
  BrowserFunctions,
  getBrowserPage,
  splitUrlIntoBaseAndPath,
  startServer,
  turnOffJsEverywhere,
} from "./helpers/test_utils.ts";
import { prepareUsernamesAndPasswords } from "./helpers/password-helpers.ts";
import { beforeEach, describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";
import { sleep, verboseLog } from "../lib/utils.ts";

type TestScopeForThisSuite = {
  baseUrl?: string;
  testuserWithtestpassword?: string;
};

function generateUniqueTestRoomName() {
  return `testroom-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

async function waitForRoomStatusMessageToBecome(
  guest1Browser: BrowserFunctions,
  votingStartedMessage: string,
  options: { refreshEachTime?: boolean } = {},
) {
  let lastKnownStatusMessage = await guest1Browser.getRoomStatusMessage();
  await waitForCondition(async () => {
    if (options.refreshEachTime || turnOffJsEverywhere) {
      await guest1Browser.refresh();
    }
    lastKnownStatusMessage = await guest1Browser.getRoomStatusMessage();
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

describe("Login Tests", () => {
  let testScope: TestScopeForThisSuite = {};
  beforeEach(() => {
    testScope = {};
    testScope.testuserWithtestpassword = prepareUsernamesAndPasswords([
      {
        username: "testuser",
        password: "testpassword",
      },
    ]);
  });
  describe("with default server config", () => {
    beforeEach(async () => {
      if (!testScope.testuserWithtestpassword) {
        throw new Error("required testScope variable is not set");
      }
      const { baseUrl } = await startServer({
        env: {
          VOI__ALLOWED_USERS: testScope.testuserWithtestpassword,
        },
      });
      testScope.baseUrl = baseUrl;
    });
    it("logged in user can open a named room and logged out user can join it and see updates", async () => {
      const roomName = generateUniqueTestRoomName();
      const { browserFns: hostBrowser } = await getBrowserPage(
        testScope.baseUrl || "NO BASE URL",
      );
      await hostBrowser.logInUser("testuser", "testpassword");
      await hostBrowser.assertCurrentUriIs("/account");
      await hostBrowser.fillFormWith({
        roomName: roomName,
      });
      await hostBrowser.clickButton("Create Room");
      const roomUrl = await hostBrowser.getUrlForNewlyCreatedRoom();

      const { baseUrl, path } = splitUrlIntoBaseAndPath(roomUrl);

      const { browserFns: firstGuestBrowser } = await getBrowserPage(roomUrl);
      const { browserFns: secondGuestBrowser } = await getBrowserPage(baseUrl);

      const heading = await firstGuestBrowser.getHeading(1);

      expect(heading).toBe(`Welcome to the room: ${roomName}`);

      expect(await firstGuestBrowser.getRoomStatusMessage()).toEqual(
        "Waiting for host to start voting session.",
      );

      await hostBrowser.clickButton(`Start Voting Session ${roomName}`);

      const votingStartedMessage = "Voting session started.";

      secondGuestBrowser.visit(path);

      await waitForRoomStatusMessageToBecome(
        secondGuestBrowser,
        votingStartedMessage,
        { refreshEachTime: true },
      );

      await waitForRoomStatusMessageToBecome(
        firstGuestBrowser,
        votingStartedMessage,
      );
    });
  });
  it("should prioritise canonical URLs for room URLs", async () => {
    if (!testScope.testuserWithtestpassword) {
      throw new Error("required testScope variable is not set");
    }
    const { baseUrl } = await startServer({
      env: {
        VOI__ALLOWED_USERS: testScope.testuserWithtestpassword,
        VOI__CANONICAL_BASE_URL: "https://vote.ancientrose.uk",
      },
    });
    const roomName = generateUniqueTestRoomName();
    const { browserFns } = await getBrowserPage(
      baseUrl,
    );
    await browserFns.logInUser("testuser", "testpassword");
    await browserFns.assertCurrentUriIs("/account");
    await browserFns.fillFormWith({
      roomName: roomName,
    });
    await browserFns.clickButton("Create Room");
    const roomUrl = await browserFns.getUrlForNewlyCreatedRoom();
    expect(roomUrl).toContain("https://vote.ancientrose.uk/room");
  });
});

async function waitForCondition(
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
