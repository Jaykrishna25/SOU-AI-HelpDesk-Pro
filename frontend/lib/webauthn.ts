import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";

/* ============================================================
   WebAuthn: passkeys, face unlock and fingerprint unlock.

   The authenticator (Windows Hello, Touch ID, Android biometric)
   verifies the user LOCALLY and releases a hardware-held private
   key to sign a server challenge. We store a public key and a
   signature counter. No biometric data is transmitted or stored.

   Password sign-in remains fully available; this is an additional
   method, never a replacement.
   ============================================================ */

export const RP_NAME = "SOU AI HelpDesk";
export const RP_ID = process.env.WEBAUTHN_RP_ID || "localhost";
export const ORIGIN = process.env.WEBAUTHN_ORIGIN || "http://localhost:3000";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const b64 = {
  fromBuffer: (b: Uint8Array) => Buffer.from(b).toString("base64url"),
  toBuffer: (s: string) => new Uint8Array(Buffer.from(s, "base64url")),
};

async function storeChallenge(loginId: string, challenge: string, purpose: string) {
  await prisma.webAuthnChallenge.deleteMany({ where: { loginId, purpose } });
  await prisma.webAuthnChallenge.create({
    data: { loginId, challenge, purpose, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) },
  });
}

async function takeChallenge(loginId: string, purpose: string): Promise<string | null> {
  const row = await prisma.webAuthnChallenge.findFirst({
    where: { loginId, purpose }, orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  await prisma.webAuthnChallenge.delete({ where: { id: row.id } }).catch(() => {});
  if (row.expiresAt.getTime() < Date.now()) return null;   // single use, time limited
  return row.challenge;
}

/* ---------------- registration ---------------- */

export async function registrationOptions(userId: string, loginId: string, displayName: string) {
  const existing = await prisma.passkey.findMany({
    where: { userId }, select: { credentialId: true, transports: true },
  });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(userId),
    userName: loginId,
    userDisplayName: displayName,
    attestationType: "none",
    excludeCredentials: existing.map(c => ({
      id: c.credentialId,
      transports: c.transports ? JSON.parse(c.transports) : undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      // "platform" asks for the built-in authenticator: Windows Hello,
      // Touch ID, or the phone's fingerprint/face sensor.
      authenticatorAttachment: "platform",
    },
  });

  await storeChallenge(loginId, options.challenge, "register");
  return options;
}

export async function verifyRegistration(userId: string, loginId: string, response: any, label: string) {
  const expectedChallenge = await takeChallenge(loginId, "register");
  if (!expectedChallenge) throw new Error("Registration challenge expired. Please try again.");

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Could not verify this device.");
  }

  const info = verification.registrationInfo;
  const cred = info.credential;

  await prisma.passkey.create({
    data: {
      userId,
      credentialId: cred.id,
      publicKey: b64.fromBuffer(cred.publicKey),
      counter: BigInt(cred.counter || 0),
      deviceType: info.credentialDeviceType,
      backedUp: !!info.credentialBackedUp,
      transports: cred.transports ? JSON.stringify(cred.transports) : null,
      label: label.slice(0, 80) || "This device",
    },
  });

  return { credentialId: cred.id };
}

/* ---------------- authentication ---------------- */

export async function authenticationOptions(loginId: string) {
  const user = await prisma.user.findUnique({ where: { loginId }, select: { id: true, isActive: true } });
  if (!user || !user.isActive) throw new Error("No passkey is registered for that login ID.");

  const keys = await prisma.passkey.findMany({
    where: { userId: user.id }, select: { credentialId: true, transports: true },
  });
  if (keys.length === 0) throw new Error("No passkey is registered for that login ID.");

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: keys.map(k => ({
      id: k.credentialId,
      transports: k.transports ? JSON.parse(k.transports) : undefined,
    })),
    userVerification: "preferred",
  });

  await storeChallenge(loginId, options.challenge, "authenticate");
  return options;
}

export async function verifyAuthentication(loginId: string, response: any) {
  const expectedChallenge = await takeChallenge(loginId, "authenticate");
  if (!expectedChallenge) throw new Error("Sign-in challenge expired. Please try again.");

  const passkey = await prisma.passkey.findUnique({ where: { credentialId: response.id } });
  if (!passkey) throw new Error("This device is not registered.");

  const user = await prisma.user.findUnique({ where: { id: passkey.userId } });
  if (!user || !user.isActive) throw new Error("Account unavailable.");
  if (user.loginId !== loginId) throw new Error("This passkey belongs to a different account.");

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: false,
    credential: {
      id: passkey.credentialId,
      publicKey: b64.toBuffer(passkey.publicKey),
      counter: Number(passkey.counter),
      transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
    },
  });

  if (!verification.verified) throw new Error("Could not verify this device.");

  // A counter that fails to advance can indicate a cloned authenticator.
  await prisma.passkey.update({
    where: { id: passkey.id },
    data: { counter: BigInt(verification.authenticationInfo.newCounter), lastUsedAt: new Date() },
  });

  return user;
}

/** Housekeeping: challenges are single-use, but expire stale rows too. */
export async function purgeExpiredChallenges() {
  await prisma.webAuthnChallenge.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
