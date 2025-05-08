import { getBrowserPage, startServer } from "./helpers/test_utils.ts";
import { prepareUsernamesAndPasswords } from "./helpers/password-helpers.ts";
import { beforeEach, describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";

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
    it("logged in user can open a named room and logged out user can join it", async () => {
      const roomName = generateUniqueTestRoomName();
      const { browserFns } = await getBrowserPage(
        testScope.baseUrl || "NO BASE URL",
      );
      await browserFns.logInUser("testuser", "testpassword");
      await browserFns.assertCurrentUriIs("/account");
      await browserFns.fillFormWith({
        roomName: roomName,
      });
      await browserFns.clickButton("Create Room");
      const roomUrl = await browserFns.getUrlForNewlyCreatedRoom();

      const { browserFns: guestBrowser } = await getBrowserPage(roomUrl);

      const heading = await guestBrowser.getHeading(1);

      expect(heading).toBe(`Welcome to the room: ${roomName}`);

      const roomStatusMessage = await guestBrowser.getRoomStatusMessage();

      expect(roomStatusMessage).toEqual(
        "Waiting for host to start voting session.",
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
