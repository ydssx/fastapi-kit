#!/usr/bin/env python3
"""Promote a user to creator Pro plan (validation period; no payment)."""

from __future__ import annotations

import argparse
import asyncio

from app.core.logging import setup_logging
from app.db.session import dispose_engine, get_session_factory
from app.repositories.user import UserRepository


async def main(email: str) -> None:
    setup_logging()
    session_factory = get_session_factory()
    async with session_factory() as session:
        repo = UserRepository(session)
        user = await repo.get_by_email(email.lower().strip())
        if user is None:
            raise SystemExit(f"User not found: {email}")
        await repo.update_fields(user, plan="pro")
        await session.commit()
        print(f"Promoted {email} to plan=pro")
    await dispose_engine()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Set users.plan=pro for creator quota")
    parser.add_argument("--email", required=True)
    args = parser.parse_args()
    asyncio.run(main(args.email))
