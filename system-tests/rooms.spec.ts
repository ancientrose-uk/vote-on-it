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

describe("Rooms", () => {
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
    it("should protect against empty room names", async () => {
      const { browserFns: hostBrowser } = await getBrowserPage(
        testScope.baseUrl || "NO BASE URL",
      );

      await hostBrowser.logInUser("testuser", "testpassword");
      await hostBrowser.assertCurrentUriIs("/account");
      expect(await hostBrowser.hasElement(".errorMessage"))
        .not.toBe(true);

      // don't fill in the room name
      await hostBrowser.clickButton("Create Room");
      expect(await hostBrowser.getErrorMessage()).toEqual(
        "Please enter a room name",
      );
      expect(await hostBrowser.hasElement(".errorMessage"))
        .toBe(true);
      expect((await hostBrowser.getCurrentUri()).split("?")[0]).toEqual(
        "/account",
      );

      expect(await hostBrowser.getFieldValue("roomName")).toEqual("");
      await hostBrowser.fillFormWith({
        roomName: "something",
      });
      expect(await hostBrowser.getFieldValue("roomName")).toEqual("something");
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

      expect(heading).toBe(`${roomName}`);

      expect(await firstGuestBrowser.getRoomStatusMessage()).toEqual(
        "This room is not open yet",
      );

      await hostBrowser.clickLink(roomUrl);

      expect(await hostBrowser.getCurrentUri()).toEqual(path);

      await hostBrowser.clickButton(`Start Voting Session`);

      expect(await hostBrowser.getCurrentUri()).toEqual(path);

      const votingStartedMessage = "Waiting for the host to ask a question.";

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
    it("should not allow guests to start voting", async () => {
      const roomName = generateUniqueTestRoomName();
      const { browserFns: hostBrowser } = await getBrowserPage(
        testScope.baseUrl || "NO BASE URL",
      );
      const { roomUrl } = await loginAndCreateRoom(
        hostBrowser,
        roomName,
        "testuser",
        "testpassword",
      );
      await hostBrowser.clickLink(roomUrl);
      const { browserFns: guestBrowser } = await getBrowserPage(roomUrl);

      expect(await hostBrowser.hasElement("button", "Start Voting Session"))
        .toBe(true);
      expect(await guestBrowser.hasElement("button", "Start Voting Session"))
        .not.toBe(true);
    });
    it("should work for a full run-through with multiple users and multiple votes (just one room here)", async () => {
      const roomName = generateUniqueTestRoomName();
      const { browserFns: hostBrowser } = await getBrowserPage(
        testScope.baseUrl || "NO BASE URL",
      );
      const { roomUrl } = await loginAndCreateRoom(
        hostBrowser,
        roomName,
        "testuser",
        "testpassword",
      );
      await hostBrowser.clickLink(roomUrl);
      const { browserFns: firstGuestBrowser } = await getBrowserPage(roomUrl);
      const { browserFns: secondGuestBrowser } = await getBrowserPage(roomUrl);
      const { browserFns: thirdGuestBrowser } = await getBrowserPage(roomUrl);
      const { browserFns: fourthGuestBrowser } = await getBrowserPage(roomUrl);

      const guestBrowsers = [
        firstGuestBrowser,
        secondGuestBrowser,
        thirdGuestBrowser,
        fourthGuestBrowser,
      ];

      const allBrowsersPromise = Promise.all(
        guestBrowsers.map(async (browser) => {
          await waitForRoomStatusMessageToBecome(
            browser,
            "Is the sky blue?",
            {
              hackyLookupQuestionInstead: true,
            },
          );
        }),
      );

      await hostBrowser.clickButton(`Start Voting Session`);

      await hostBrowser.fillFormWith({
        voteTitle: "Is the sky blue?",
      });

      await hostBrowser.clickButton("Request Vote");

      await allBrowsersPromise;

      await Promise.all(guestBrowsers.map(async (browser) => {
        await browser.assertThatTheVotingButtonsAreDifferentColors();
      }));

      const buttonSummaryBeforeVoting = await getButtonSummaryForBrowsers(
        guestBrowsers,
      );

      const presentButtons = getPresentButtons(buttonSummaryBeforeVoting);

      expect(presentButtons).toEqual(
        guestBrowsers.map(() => ["For", "Against", "Abstain"]).flat(),
      );

      await Promise.all([
        firstGuestBrowser.clickButton("For"),
        secondGuestBrowser.clickButton("Against"),
        thirdGuestBrowser.clickButton("Abstain"),
        fourthGuestBrowser.clickButton("For"),
      ]);

      const buttonSummaryAfterVoting = await getButtonSummaryForBrowsers(
        guestBrowsers,
      );

      const presentButtonsAfterVoting = getPresentButtons(
        buttonSummaryAfterVoting,
      );

      expect(presentButtonsAfterVoting).toEqual([]);

      await Promise.all(
        guestBrowsers.map(async (browser) =>
          await browser.hasElement(".voteSummary")
        ),
      );

      await hostBrowser.clickButton("End vote");

      await Promise.all(
        guestBrowsers.map((browser) =>
          waitForRoomStatusMessageToBecome(
            browser,
            "Waiting for the host to ask a question.",
          )
        ),
      );

      const allBrowsers = [
        hostBrowser,
        ...guestBrowsers,
      ];

      await Promise.all(
        allBrowsers.map(async (browser) => {
          expect(await browser.getVoteSummary()).toEqual({
            Outcome: "Passed",
            "Votes for": 2,
            "Votes against": 1,
            Abstained: 1,
          });
        }),
      );

      await Promise.all(allBrowsers.map(async (browser) => {
        const votingSummaryExists = await browser.hasElement(".voteSummary");
        if (!votingSummaryExists) {
          throw new Error("Voting summary not found when it should be present");
        }
      }));

      const allBrowsersPromise2 = Promise.all(
        guestBrowsers.map((browser) =>
          waitForRoomStatusMessageToBecome(
            browser,
            "Is the sky red?",
            {
              hackyLookupQuestionInstead: true,
            },
          )
        ),
      );

      await hostBrowser.fillFormWith({
        voteTitle: "Is the sky red?",
      });

      await hostBrowser.clickButton("Request Vote");

      await allBrowsersPromise2;

      await Promise.all(allBrowsers.map(async (browser) => {
        const votingSummaryExists = await browser.hasElement(".voteSummary");
        if (votingSummaryExists) {
          throw new Error("Voting summary found when it should be absent");
        }
      }));
      await Promise.all(
        [
          firstGuestBrowser,
          secondGuestBrowser,
          thirdGuestBrowser,
          fourthGuestBrowser,
        ].map(async (browser) => {
          await browser.clickButton("Abstain");
        }),
      );

      await hostBrowser.clickButton("End vote");

      await Promise.all(
        allBrowsers.map(async (browser) => {
          expect(await browser.getVoteSummary()).toEqual({
            Outcome: "Tied",
            "Votes for": 0,
            "Votes against": 0,
            Abstained: 4,
          });
        }),
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
                "This room is not open yet",
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

      await firstHost.browserFns.clickLink(firstHost.roomUrl);
      await firstHost.browserFns.clickButton(
        `Start Voting Session`,
      );
      await Promise.all(firstHost.guestBrowsers.map(async (guestBrowser) => {
        expect(await guestBrowser.browserFns.getHeading(1)).toEqual(
          `${firstHost.roomName}`,
        );
        await waitForRoomStatusMessageToBecome(
          guestBrowser.browserFns,
          "Waiting for the host to ask a question.",
        );
      }));

      await Promise.all(hosts.map(async (host) => {
        await Promise.all(host.guestBrowsers.map(async (guestBrowser) => {
          expect(await guestBrowser.browserFns.getHeading(1)).toEqual(
            `${host.roomName}`,
          );
          expect(await guestBrowser.browserFns.getRoomStatusMessage()).toEqual(
            "This room is not open yet",
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

async function getButtonSummaryForBrowsers(guestBrowsers: BrowserFunctions[]) {
  return await Promise.all(guestBrowsers.map(async (browser) => {
    return {
      forButton: await browser.hasElement("button:has-text('For')"),
      againstButton: await browser.hasElement("button:has-text('Against')"),
      abstainButton: await browser.hasElement("button:has-text('Abstain')"),
    };
  }));
}

function getPresentButtons(buttonSummaryBeforeVoting: {
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
