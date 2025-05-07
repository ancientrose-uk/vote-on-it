import React from "react";

export function HomePage() {
  const [count, setCount] = React.useState(0);

  return (
    <div>
      <h1>Welcome to Vote On It!</h1>
      <div style={{ marginTop: "2rem" }}>
        <p>Hydration test: {count}</p>
        <button
          type="button"
          onClick={() => setCount((c) => c + 1)}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          Click me to test hydration
        </button>
      </div>
    </div>
  );
}

export function LoginPage(
  { error = "", prefilledUsername = "" },
) {
  // add useState to manage the username input
  // const [username, setUsername] = React.useState(prefilledUsername);
  return (
    <>
      <h1>Log in to your account</h1>
      {error && <p className="errorMessage">{error}</p>}
      <form method="POST" action="/login">
        <div style={{ padding: "2rem" }}>
          <label
            htmlFor="username"
            style={{
              display: "block",
              fontSize: "1.5rem",
              paddingBottom: "1rem",
            }}
          >
            Username
          </label>
          {prefilledUsername
            ? (
              <input
                type="text"
                id="username"
                name="username"
                value={prefilledUsername}
              />
            )
            : (
              <input
                type="text"
                id="username"
                name="username"
              />
            )}
        </div>
        <div style={{ padding: "2rem" }}>
          <label
            htmlFor="password"
            style={{
              display: "block",
              fontSize: "1.5rem",
              paddingBottom: "1rem",
            }}
          >
            Password
          </label>
          <input type="password" id="password" name="password" />
        </div>
        <button type="submit" style={{ zoom: 1.25 }}>Log In</button>
      </form>
    </>
  );
}

export function AccountPage({ username }: { username: string }) {
  return <h1>Welcome to your account {username}!</h1>;
}

export function NotFoundPage() {
  return <h1>You seem to be lost!</h1>;
}
