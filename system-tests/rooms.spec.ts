import { getBrowserPage, startServer } from "./helpers/test_utils.ts";
import { prepareUsernamesAndPasswords } from "./helpers/password-helpers.ts";
import { beforeEach, describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";
import { sleep } from "../lib/utils.ts";

type TestScopeForThisSuite = {
  baseUrl?: string;
  testuserWithtestpassword?: string;
};

function generateUniqueTestRoomName() {
  return `testroom-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
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
      const { browserFns: hostBrowser, jsDisabledByRunSettings } =
        await getBrowserPage(
          testScope.baseUrl || "NO BASE URL",
        );
      await hostBrowser.logInUser("testuser", "testpassword");
      await hostBrowser.assertCurrentUriIs("/account");
      await hostBrowser.fillFormWith({
        roomName: roomName,
      });
      await hostBrowser.clickButton("Create Room");
      const roomUrl = await hostBrowser.getUrlForNewlyCreatedRoom();

      const { browserFns: guestBrowser } = await getBrowserPage(roomUrl);

      const heading = await guestBrowser.getHeading(1);

      expect(heading).toBe(`Welcome to the room: ${roomName}`);

      const roomStatusMessage = await guestBrowser.getRoomStatusMessage();

      expect(roomStatusMessage).toEqual(
        "Waiting for host to start voting session.",
      );

      await hostBrowser.clickButton(`Start Voting Session ${roomName}`);

      const votingStartedMessage = "Voting session started.";

      if (jsDisabledByRunSettings) {
        return;
      }
      guestBrowser.refreshPageWhenJsDisabled();

      let lastKnownStatusMessage = roomStatusMessage;
      await waitForCondition(async () => {
        lastKnownStatusMessage = await guestBrowser.getRoomStatusMessage();
        return lastKnownStatusMessage === votingStartedMessage;
      }, (err) => {
        const message =
          `Timed out waiting for room status to become [${votingStartedMessage}], latest value was [${lastKnownStatusMessage}]`;
        if (err) {
          throw new Error(message, err);
        }
        throw new Error(message);
      });
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
      lastError = e as Error;
    }
    await sleep(interval);
  }

  errorHandler(lastError);
}
