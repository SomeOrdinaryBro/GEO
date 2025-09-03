import sys
import time
import requests

URL = "https://dnabehavior.com"


def main():
    try:
        r = requests.get(URL, timeout=15)
        r.raise_for_status()
        print(f"{time.strftime('%Y-%m-%d %H:%M:%S')} OK {r.status_code}")
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
