import { AuthClient } from "@dfinity/auth-client";

let authClient;
let identity = null;
let principal = null;

export async function initAuthClient() {
  authClient = await AuthClient.create();
  if (await authClient.isAuthenticated()) {
    identity = authClient.getIdentity();
    principal = identity.getPrincipal().toText();
  }
  return authClient;
}

export async function login() {
  if (!authClient) await initAuthClient();
  return new Promise((resolve, reject) => {
    authClient.login({
      identityProvider: "https://identity.ic0.app",
      onSuccess: () => {
        identity = authClient.getIdentity();
        principal = identity.getPrincipal().toText();
        resolve(principal);
      },
      onError: (err) => reject(err),
    });
  });
}

export function logout() {
  if (!authClient) return;
  authClient.logout();
  identity = null;
  principal = null;
}
