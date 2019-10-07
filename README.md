# NixOS Updates Bot for Telegram

*(Join the channel `@nixos_updates` at <https://t.me/nixos_updates>)*

Periodically checks for Nix channel updates and posts them.

## Deployment

Why would you want to do that?

If you want to somehow deploy *another* *same* bot:

- Configuration is currently a bit hard-coded. Change code according to your needs
- Specify these environment variables
    - `BOT_SECRET`: A secret string to use in webhooks
    - `TELEGRAM_KEY`: Your telegram bot key
    - `DATABASE_URL`: A Postgresql connection URL
    - `ARMED`: `true` if you want the bot to send telegram messages
    - `PORT`: Port to listen on. Defaults to `5000`
- Periodically `POST` to `/update` with json like `{ "secret": "<bot secret>", "action": "update" }`. An update will run in the background.
