import { generateId } from "lucia";
import { hash } from "@node-rs/argon2";
import { db } from "@/lib/db.ts";
import { SqliteError } from "better-sqlite3";

import type { APIContext } from "astro";

export async function POST(context: APIContext): Promise<Response> {
  try {
    const requestBody = await context.request.json();
    const { username, password, role } = requestBody;

    if (
        typeof username !== "string" ||
        username.length < 3 ||
        username.length > 31 ||
        !/^[a-z0-9_-]+$/.test(username)
    ) {
      return new Response(
          JSON.stringify({ error: "Invalid username" }),
          { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 6 || password.length > 255) {
      return new Response(
          JSON.stringify({ error: "Invalid password" }),
          { status: 400 }
      );
    }

    const passwordHash = await hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });
    const userId = generateId(15);

    db.prepare(
        "INSERT INTO user (id, username, password_hash, role) VALUES(?, ?, ?, ?)"
    ).run(userId, username, passwordHash, role);

    return new Response(
        JSON.stringify({
          message: "User successfully created.",
          username,
        }),
        { status: 201 }
    );
  } catch (e) {
    if (e instanceof SqliteError && e.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return new Response(
          JSON.stringify({ error: "Username already used" }),
          { status: 400 }
      );
    }

    return new Response(
        JSON.stringify({ error: "An unknown error occurred" }),
        { status: 500 }
    );
  }
}