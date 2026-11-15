import sys
import os
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

def main():
    if len(sys.argv) > 1:
        supabase_url = sys.argv[1].strip()
    else:
        supabase_url = os.environ.get("SUPABASE_DB_URL", "")

    if not supabase_url:
        print("Usage: python backend/scripts/connect_supabase.py '<SUPABASE_POSTGRES_URI>'")
        print("Example: python backend/scripts/connect_supabase.py 'postgresql://postgres.xxx:pass@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'")
        return

    # Clean URL format for SQLAlchemy
    clean_url = supabase_url
    if clean_url.startswith("postgres://"):
        clean_url = clean_url.replace("postgres://", "postgresql://", 1)

    print(f"[*] Testing connection to Supabase database...")
    from sqlalchemy import create_engine, text

    try:
        engine = create_engine(clean_url, pool_pre_ping=True)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();")).scalar()
            print(f"[+] Successfully connected to Supabase PostgreSQL!")
            print(f"    Version: {result}")

        # Update backend/.env file
        env_file = backend_dir / ".env"
        lines = []
        if env_file.exists():
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    if not line.startswith("DATABASE_SYNC_URL=") and not line.startswith("SUPABASE_DB_URL="):
                        lines.append(line.rstrip())

        lines.append(f"DATABASE_SYNC_URL={clean_url}")
        lines.append(f"SUPABASE_DB_URL={clean_url}")

        with open(env_file, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")

        print(f"[+] Saved Supabase connection to: {env_file}")

        # Initialize tables & seed
        print("[*] Creating tables & seeding initial admin account...")
        os.environ["SUPABASE_DB_URL"] = clean_url
        os.environ["DATABASE_SYNC_URL"] = clean_url

        from app.core.database import init_db, SessionLocal
        from app.models.entities import User
        from sqlalchemy import select

        init_db()

        with SessionLocal() as db:
            users = db.execute(select(User)).scalars().all()
            print(f"[+] Database initialization complete. Users in Supabase ({len(users)}):")
            for u in users:
                print(f"    - Email: {u.email} | Role: {u.role}")

        print("\n=== Supabase Database Setup Complete! ===")
        print("OTNET is now connected to Supabase for all user accounts and data.")

    except Exception as e:
        print(f"[-] Connection failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
