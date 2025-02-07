import {config} from "firebase-functions";
import fetch, {Headers} from "node-fetch";

let currentInstance: Telegram;

/**
 * Telegram Provider class.
 * Handles all communication with Telegram API.
 */
export class Telegram {
    url: URL;
    /**
     *@constructor
     */
    constructor() {
      const TG_BOT_TOKEN = config().telegram.bot_token;
      this.url = new URL(`https://api.telegram.org/bot${TG_BOT_TOKEN}`);
    }

    /**
     *
     * @return {Database} current instance of the database.
     */
    static getInstance(): Telegram {
      if (!currentInstance) {
        currentInstance = new Telegram();
      }

      return currentInstance;
    }

    /**
     * Calls the TG api.
     *
     * @param {string} command - the command
     * @param {string} method - the HTTP method to use e.g. GET/POST
     * @param {JSON} body - the HTTP payload
     */
    async callAPI(
        command: string,
        method: string,
        body: string,
    ): Promise<string> {
      const headers = new Headers({"Content-Type": "application/json"});
      const response = await fetch(`${this.url}/${command}`, {
        method, headers, body,
      });

      const result = await response.json() as TelegramResponse;
      if (!result.ok) {
        console.error(result);
        throw new Error("not ok");
      }
      return result.result;
    }

    /**
     * Sends a simple text.
     *
     * @param {string} chatId - The TG id of the receiver
     * @param {string} text - The text to be sent
     * @param {TelegramKeyboard} keyboard - (optional) a TG keyboard,
     * @param {boolean} removeKeyboard - (optional) an inline keyboard,
     * to provide options in the chat.
     * @return {Promise}
     */
    sendText(
        chatId: string,
        text: string,
        keyboard?: TelegramKeyboard,
        removeKeyboard?: boolean
    ) : Promise<string> {
      const payload = {
        "chat_id": chatId,
        "parse_mode": "html",
        "text": text,
        "reply_markup": {},
      };

      if (keyboard) {
        if (keyboard.inline) {
          payload["reply_markup"] = {
            inline_keyboard: keyboard.keys,
          };
        } else {
          payload["reply_markup"] = {
            keyboard: keyboard.keys,
            one_time_keyboard: false,
            resize_keyboard: true,
          };
        }
      } else if (removeKeyboard) {
        payload["reply_markup"] = {
          remove_keyboard: true,
        };
      }
      return this.callAPI("sendmessage", "post", JSON.stringify(payload));
    }

    /**
     *
     * @param {string} chatId
     * @param {string} messageId
     * @param {string} text
     * @param {TelegramKeyboard} keyboard - (optional) send a TG keyboard
     * to provide options in the chat.
     * @return {Promise}
     */
    editMessage(chatId: string, messageId: string, text: string,
        keyboard?: TelegramKeyboard)
        : Promise<string> {
      const payload = {
        "chat_id": chatId,
        "message_id": messageId,
        "parse_mode": "html",
        "text": text,
        "reply_markup": {},
      };

      if (keyboard) {
        if (keyboard.inline) {
          payload["reply_markup"] = {
            inline_keyboard: keyboard.keys,
          };
        }
      }
      return this.callAPI("editMessageText", "post",
          JSON.stringify(payload)
      );
    }
}
