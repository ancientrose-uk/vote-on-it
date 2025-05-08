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

const configuredTestUsers = [
  {
    username: "testuser",
    password: "testpassword",
  },
  {
    username: "testuser2",
    password: "password2",
  },
  {
    username: "testuser3",
    password: "password3",
  },
];

describe("Login Tests", () => {
  let testScope: TestScopeForThisSuite = {};
  beforeEach(() => {
    testScope = {};
    testScope.standardTestUsers = prepareUsernamesAndPasswords(
      configuredTestUsers,
    );
  });
  describe("with default server config", () => {
    beforeEach(async () => {
      if (!testScope.standardTestUsers) {
        throw new Error("required testScope variable is not set");
      }
      const { baseUrl } = await startServer({
        env: {
          VOI__ALLOWED_USERS: testScope.standardTestUsers,
        },
      });
      testScope.baseUrl = baseUrl;
    });
    it("logged in user can open a named room and logged out user can join it and see updates", async () => {
      const roomName = generateUniqueTestRoomName();
      const { browserFns: hostBrowser } = await getBrowserPage(
        testScope.baseUrl || "NO BASE URL",
      );
      const { roomUrl, baseUrl, path } = await loginAndCreateRoom(
        hostBrowser,
        roomName,
        "testuser",
        "testpassword",
      );

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
    it("should allow multiple hosts to create multiple rooms", async () => {
      const hosts = await Promise.all(
        configuredTestUsers.map(async ({ username, password }) => {
          const browser = await getBrowserPage(
            testScope.baseUrl || "NO BASE URL",
          );
          const hostBrowser = browser.browserFns;
          const roomName = generateUniqueTestRoomName();
          const createRoomOutput = await loginAndCreateRoom(
            hostBrowser,
            roomName,
            username,
            password,
          );
          return {
            ...createRoomOutput,
            ...browser,
            roomName,
            guestBrowsers: await Promise.all([0, 1, 2].map(async () => {
              const guestBrowser = await getBrowserPage(
                createRoomOutput.roomUrl,
              );
              const status = await guestBrowser.browserFns
                .getRoomStatusMessage();
              expect(status).toEqual(
                "Waiting for host to start voting session.",
              );
              return guestBrowser;
            })),
          };
        }),
      );

      const firstHost = hosts.shift();
      if (!firstHost) {
        throw new Error("This should never be hit");
      }

      firstHost.browserFns.clickButton(
        `Start Voting Session ${firstHost.roomName}`,
      );
      await Promise.all(firstHost.guestBrowsers.map(async (guestBrowser) => {
        expect(await guestBrowser.browserFns.getHeading(1)).toEqual(
          `Welcome to the room: ${firstHost.roomName}`,
        );
        await waitForRoomStatusMessageToBecome(
          guestBrowser.browserFns,
          "Voting session started.",
        );
      }));

      await Promise.all(hosts.map(async (host) => {
        await Promise.all(host.guestBrowsers.map(async (guestBrowser) => {
          expect(await guestBrowser.browserFns.getHeading(1)).toEqual(
            `Welcome to the room: ${host.roomName}`,
          );
          expect(await guestBrowser.browserFns.getRoomStatusMessage()).toEqual(
            "Waiting for host to start voting session.",
          );
        }));
      }));
    });
  });
  it("should prioritise canonical URLs for room URLs", async () => {
    if (!testScope.standardTestUsers) {
      throw new Error("required testScope variable is not set");
    }
    const { baseUrl } = await startServer({
      env: {
        VOI__ALLOWED_USERS: testScope.standardTestUsers,
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

type TestScopeForThisSuite = {
  baseUrl?: string;
  standardTestUsers?: string;
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

async function loginAndCreateRoom(
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
