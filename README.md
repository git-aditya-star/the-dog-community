# The Dog Community

A small chat community for dog owners, with one unusual member: **Barkley**,
a golden retriever who lives in the database as a real user row and knows
every dog in the room.

Upload a photo of your dog and the app works out the breed for you. Barkley
notices the new arrival, welcomes it by name with something breed-specific,
and quietly interrupts if anyone mentions feeding their dog chocolate.

![The #general channel, with the dog rail on the right](docs/02-general.png)

## What it does

- **Photos everywhere** — pick an image and it uploads, attaches to the draft
  so it can carry a caption, and lands in every open window over the same
  socket as text. Channels and DMs both.
- **Channels and DMs over one WebSocket** — send and delivery share a single
  connection, so a message is in both windows before the sender's spinner
  would have finished.
- **Photo in, breed out** — adding a dog runs one vision pass and stores the
  result. Nobody types a breed.
- **Barkley is a member, not a chatbot widget** — his own avatar, his own card
  in the dog rail, his own DM thread. He answers when he is mentioned, when
  he is DMed, and when someone says something dangerous.
- **Restraint** — plain chatter gets silence. A bot that answers everything is
  a search box.

![#breed-talk, where Barkley does most of the talking](docs/03-breed-talk.png)

![A direct message with Barkley](docs/04-dm-barkley.png)

![Sharing a photo in a direct message](docs/05-dm-photo.png)

## Stack

FastAPI · React (Vite) · PostgreSQL · one WebSocket · Gemini for vision and
chat. Auth is username/password with bcrypt and a JWT in localStorage.

## Getting it running

**You need:** PostgreSQL (running locally), Python 3.10+, Node 18+, and a
Google AI Studio API key. See [the note on the model](#a-note-on-the-model).

### 1. Database

Nothing to create by hand. The app connects to your existing `postgres`
database and makes its own `dog` schema and tables on first boot.

### 2. Backend

```bash
python -m venv venv
venv/Scripts/activate          # macOS/Linux: source venv/bin/activate
pip install -r backend/requirements.txt

cd backend
cp .env.example .env           # then edit it, see the table below
python -m uvicorn app.main:app --reload --port 8000
```

Start uvicorn **from `backend/`** — `.env` is read relative to the working
directory, and starting from the repo root fails on a missing `DATABASE_URL`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, create an account, and add your dog.

### Environment

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | SQLAlchemy URL, e.g. `postgresql+psycopg2://postgres:yourpassword@localhost:5432/postgres` |
| `DB_SCHEMA` | Schema the app owns. Defaults to `dog` |
| `JWT_SECRET` | Any long random string |
| `JWT_EXPIRE_MINUTES` | Token lifetime. Defaults to a week |
| `CORS_ORIGINS` | Comma-separated. Defaults to the Vite dev server |
| `GEMINI_API_KEY` | Your Google AI Studio key |
| `GEMINI_MODEL` | Defaults to `gemini-3.5-flash-lite` |

### A note on the model

`gemini-3.5-flash-lite` does both jobs: one vision pass when a dog is added,
and every line Barkley says. It answers a photo in about 2.3 seconds, which is
what makes breed detection something you can wait for on a form rather than a
background job with a spinner.

That speed is what makes a photo affordable on the reply path too. A dog's
breed and description are computed once, written to the dog row and read back
as text forever after; the only image Barkley re-opens when he answers is the
newest photo in the conversation in front of him.

An honest caveat: the app needs a key. Without one nothing breaks — dogs
simply arrive with no breed and Barkley stays quiet — but the part worth
seeing is the part that needs it.

## How it fits together

```
frontend/  React + Vite, SCSS design system, one auth context, one socket
backend/
  app/models.py     four tables: users, dogs, channels, messages
  app/ws.py         the single WebSocket — carries send and delivery both ways
  app/barkley.py    the bot: trigger checks, context building, typing frames
  app/llm.py        the only place that talks to a model
  app/routers/      auth, channels + DMs, uploads, dogs
```

Four decisions worth calling out:

**DMs live on the channel row.** There is no `channel_members` table. A DM
stores its two participants as `user_a_id` / `user_b_id`, always lower id
first, with a partial unique index on the pair. That one constraint makes
duplicate conversations impossible without any code checking for them, and a
user's whole channel list — public channels plus their DMs — is one query.

**One WebSocket, both directions.** The client sends a message over the same
socket that delivers it. There is no POST-then-wait-for-echo, so there is no
optimistic-update reconciliation to get wrong. Fan-out is a dictionary of
connections: a public channel goes to everyone connected, a DM to two ids.

**Vision runs once per dog, at upload.** The breed and a short description are
written to the dog row and cached forever, so no profile is ever re-read — when
Barkley talks about a dog he is reading text that was computed minutes or weeks
ago. Breed detection falls out of profile creation for free. The one image that
does ride along on a reply is the newest photo in the channel or DM, which is
the next decision.

**Barkley gets no vector store.** His context is the last ten messages plus a
`SELECT` of every dog's name, breed and notes, pasted into the prompt. The
model already knows breeds; there is nothing to retrieve. He can also see the
newest photo in the conversation, which is how an uncaptioned picture of
grapes gets a toxicity warning.

## Credits

`backend/app/assets/barkley.jpg` — "GoldenRetrieverPortrait.jpg" by Ltshears,
via Wikimedia Commons, licensed
[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).

The photos shared in the conversations in the screenshots above are from
Wikimedia Commons:

| Photo | By | Licence |
| --- | --- | --- |
| Jack Russell catching ball | Emery Way | CC BY 2.0 |
| Labrador Retriever yellow swimming | MC Glasgow | CC BY 2.0 |
| Puppy playing with a toy (Unsplash) | Justin Veenema | CC0 |
| Shih Tzu puppy wonton chewing a (fake) bone | Jim Winstead | CC BY 2.0 |
| Corgi-on-lawn | John Moodey | CC0 |
| Dogs playfully wrestling on green grass | Shixart1985 | CC BY 2.0 |
