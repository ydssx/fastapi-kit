#!/usr/bin/env python3
"""Create or promote a user to admin role."""

from __future__ import annotations

import argparse
import asyncio
import sys

from app.core.roles import ADMIN
from app.core.security import get_password_hash
from app.db.session import dispose_engine, get_session_factory
from app.repositories.user import UserRepository


async def main() -> int:
    parser = argparse.ArgumentParser(description="Create or promote an admin user")
    parser.add_argument("--email", required=True, help="Admin email address")
    parser.add_argument("--password", required=True, help="Password (min 8 chars)")
    args = parser.parse_args()

    if len(args.password) < 8:
        print("Error: password must be at least 8 characters", file=sys.stderr)
        return 1

    email = args.email.lower().strip()
    session_factory = get_session_factory()

    async with session_factory() as session:
        repo = UserRepository(session)
        user = await repo.get_by_email(email)
        if user:
            if user.role == ADMIN:
                print(f"User {email} is already an admin")
            else:
                await repo.promote_to_admin(user)
                await session.commit()
                print(f"Promoted existing user {email} to admin")
        else:
            await repo.create(
                email=email,
                hashed_password=get_password_hash(args.password),
                role=ADMIN,
            )
            await session.commit()
            print(f"Created admin user {email}")

    await dispose_engine()
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
