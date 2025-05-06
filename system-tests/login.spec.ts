import {expect} from "jsr:@std/expect";
import {describe, it} from "jsr:@std/testing/bdd";
import {getBrowserPage, startServer} from "./helpers/test_utils.ts";

function replacePasswordWithKnownShaValue(password:string) {
  switch(password) {
    case "testpassword":
      return "9f735e0df9a1ddc702bf0a1a7b83033f9f7153a00c29de82cedadc9957289b05";
    case "not-test-password":
      return "dd467bd47cbddf440fdd8fd7574ed55d1dca1809cdb15a885e6ac8a9b8ab3540";
  }
  throw new Error('Could not find known sha value for password: ' + password);
}

async function prepareUsernamesAndPasswords(array: { username: string, password: string }[]) {
  return array.map(({ username, password }) => {
    return [username, replacePasswordWithKnownShaValue(password)].join(":");
  }).join(",");
}

describe("Login Tests", () => {
  it("allowed user can log in", async () => {
    const { baseUrl } = await startServer({
      env: {
        VOI__ALLOWED_USERS: await prepareUsernamesAndPasswords([
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
        VOI__ALLOWED_USERS: await prepareUsernamesAndPasswords([{
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
        VOI__ALLOWED_USERS: await prepareUsernamesAndPasswords([{
          username: 'testuser',
          password: 'not-test-password',
        }]),
      }
    })
    const { browserFns } = await getBrowserPage(baseUrl);

    await browserFns.visit('/account');
    expect(await browserFns.getCurrentUri()).toBe('/login');
  });
  it("should not use the real password for envvars", async () => {
    const password = 'not-test-password';
    const envvarstr = await prepareUsernamesAndPasswords([{
      username: 'testuser',
      password,
    }])
    expect(envvarstr).not.toContain(password);
  });
});
