# NixOS Updates Bot for Telegram

*(Add the bot <https://t.me/nixos_updates_bot> Join the channel at <https://t.me/nixos_updates>)*

Periodically checks for Nix channel updates and posts them in a channel. Also, sends private messages for subscribed updates.

## Usage

Watch the channel <https://t.me/nixos_updates>, or send, say, `/subscribe nixpkgs-unstable` to <https://t.me/nixos_updates_bot>.

## Deployment

Why would you want to do that?

If you want to somehow deploy *another* *same* bot:

- Configuration is currently a bit hard-coded. Change code according to your needs
- Specify these environment variables
    - `BOT_SECRET`: A secret string to use in webhooks
    - `TELEGRAM_KEY`: Your Telegram bot key
    - `DATABASE_URL`: A Postgresql connection URL
    - `ARMED`: `true` if you want the bot to send Telegram messages (or any non-reply requests to the Telegram servers at all)
    - `PORT`: Port to listen on. Defaults to `5000`
- Set webhook to `.../webhook/$BOT_SECRET` using the Telegram Bot API manually.
- Periodically `POST` to `/update` with json like `{ "secret": "<bot secret>", "action": "update" }`. An update will run in the background after some delay (`0` to `60` seconds random).

## Icon

Icon based on [Nix official icon](https://github.com/NixOS/nixos-artwork/blob/master/logo/nix-snowflake.svg) and [Octicons `radio-tower](https://octicons.github.com/icon/radio-tower/).
