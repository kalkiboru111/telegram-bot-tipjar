import * as fb from "firebase-admin";
import * as functions from "firebase-functions";
import {Database} from "./database";
import {Webhook} from "./webhook";

// Setup DB for triggers.
Database.getInstance();

const webhook = new Webhook();

// Ensure user_id / username combination is always updated in `usernames` table,
// when usernames change for TG userIDs.
exports.dbUsernameTrigger = functions.database.ref("/users/{user_id}/username")
    .onWrite(async (change, context) => {
      await fb.database().ref(`usernames/@${change.before.val()}`).remove();
      await fb.database().ref(`usernames/@${change.after.val()}`).update(
          {id: context.params.user_id}
      );
    });

// HTTP Handler for Telegram webhook.
exports.handleUpdate = functions
    .runWith({
      minInstances: 2,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .https.onRequest(async (req, res): Promise<any> => {
      if (!req.body.message && !req.body.callback_query) {
        return res.status(200).send();
      }

      try {
        // Handle callback queries, these come from inline commands.
        if (req.body.callback_query) {
          try {
            await webhook.handleCallbackQuery(
                req.body.callback_query.from.id,
                req.body.callback_query.message.chat.id,
                req.body.callback_query.message.message_id,
                req.body.callback_query.data
            );
            return res.status(200).send();
          } catch (ex) {
            console.error(ex);
            // TODO: after test re-enable to force TG API to retry.
            // return res.status(500).send(ex.message);
            return res.status(200).send();
          }
        }

        const tgUserId = req.body.message.from.id;
        const tgUsername = req.body.message.from.username;

        // The commands are sent by 'text',
        // so parse them and start the chosen flow.
        switch (req.body.message.text) {
          case "/start":
            await webhook.handleStart(tgUserId, tgUsername); break;
          case "/balance":
          case "👛 Balance":
            await webhook.handleBalance(tgUserId); break;
          case "/deposit":
          case "💰 Deposit":
            await webhook.handleDeposit(tgUserId); break;
          case "/withdraw":
          case "💸 Withdraw":
            await webhook.handleWithdrawal(tgUserId); break;
          case "/help":
          case "🆘 Help":
            await webhook.handleHelp(tgUserId); break;
          case "/disclaimer":
            await webhook.handleDisclaimer(tgUserId); break;
          default:
            await webhook.handleDefault(tgUserId, req.body.message.text); break;
        }

        return res.status(200).send();
      } catch (ex) {
        console.error(ex);
        // TODO: after test re-enable to force TG API to retry.
        // return res.status(500).send(ex.message);
        return res.status(200).send();
      }
    });