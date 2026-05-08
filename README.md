# Telegram Bulk Leave Manager

A web app that lets you leave multiple Telegram channels, groups, and bots at once — something the official Telegram client doesn't support.

Each user logs in with their own Telegram account. Sessions are isolated, so no one can access another user's account.

## Features

- Login with your own Telegram account (phone + code + optional 2FA)
- View all your channels, groups, and bots in one list
- Filter by type: Channel / Group / Bot
- Search by name
- Multi-select with Select All / Clear
- Real-time progress as each chat is left
- Safe delays between requests to avoid Telegram flood limits
- Multi-user support — each visitor uses their own session

## Tech Stack

- **Backend**: Python 3.12, FastAPI, Telethon (MTProto)
- **Frontend**: React 19, TypeScript, Vite 6

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- Telegram `api_id` and `api_hash` from [my.telegram.org](https://my.telegram.org/apps)

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and fill in your API_ID and API_HASH
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

1. Open the app and enter your phone number
2. Enter the verification code Telegram sends you
3. Browse your chats — filter by Channel / Group / Bot
4. Select the ones you want to leave
5. Click **Leave selected** and watch real-time progress

## Notes

- Sessions are stored locally in `backend/sessions/` — keep this folder private
- Leaving uses random 1–3 second delays to avoid Telegram flood bans
- You cannot undo leaving a private channel or group
- Built with [Telethon](https://github.com/LonamiWebs/Telethon) — uses MTProto, not the Bot API
