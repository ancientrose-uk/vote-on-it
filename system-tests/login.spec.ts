import {expect} from "jsr:@std/expect";
import {afterAll, describe, it} from "jsr:@std/testing/bdd";
import { runCleanupTasks, startServer, getBrowserPage } from "./helpers/test_utils.ts";

function prepareUsernamesAndPasswords(array: { username: string, password: string }[]) {
  return array.map(({ username, password }) => {
    return [username, password].join(":");
  }).join(",");
}

describe("Login Tests", () => {
  it("allowed user can log in", async () => {
    const { baseUrl } = await startServer({
      env: {
        VOI__ALLOWED_USERS: prepareUsernamesAndPasswords([
          {
            username: "testuser",
            password: "testpassword",
          }
        ]),
      }
    })
    const { browserFns } = await getBrowserPage(baseUrl);

    await browserFns.visit('/login');
    const heading = await browserFns.getHeading();

    expect(heading).toBe("Log in to your account");

    await browserFns.fillFormWith({
      username: 'testuser',
      password: 'testpassword',
    });

    await browserFns.clickButton('Log In');

    expect(await browserFns.getCurrentUri()).toBe(`/account`);

    const headingAfterLogin = await browserFns.getHeading();
    expect(headingAfterLogin).toBe("Welcome to your account testuser!");
  });
  it("not allowed user can not log in", async () => {
    const { baseUrl } = await startServer({
      env: {
        VOI__ALLOWED_USERS: prepareUsernamesAndPasswords([{
          username: 'testuser',
          password: 'not-test-password',
        }]),
      }
    })
    const { browserFns } = await getBrowserPage(baseUrl);

    await browserFns.visit('/login');
    const heading = await browserFns.getHeading();

    expect(heading).toBe("Log in to your account");

    await browserFns.fillFormWith({
      username: 'testuser',
      password: 'testpassword',
    });

    await browserFns.clickButton('Log In');

    const headingAfterLogin = await browserFns.getHeading();
    expect(headingAfterLogin).toBe("Log in to your account");
    expect(await browserFns.getErrorMessage()).toBe("We couldn't find your account");
  });
  it("redirect users with no session to the login screen if they try to view the logged in page", async () => {
    const { baseUrl } = await startServer({
      env: {
        VOI__ALLOWED_USERS: prepareUsernamesAndPasswords([{
          username: 'testuser',
          password: 'not-test-password',
        }]),
      }
    })
    const { browserFns } = await getBrowserPage(baseUrl);

    await browserFns.visit('/account');
    expect(await browserFns.getCurrentUri()).toBe('/login');
  });
});
