const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';

const httppost = require('co-request').post;

function* sendNotification(secret, data) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Basic ${secret}`,
  };

  const res = yield httppost({
    url: ONESIGNAL_API_URL,
    method: "POST",
    json: true,
    headers,
    body: data,
  });
  return res.body;
}

module.exports = {
  init(app_id, secret) {
    this.app_id = app_id;
    this.secret = secret;
  },
  * notify(head, msg, include_player_ids) {
    const data = {
      app_id: this.app_id,
      contents: { en: msg },
      headings: { en: head },
      include_player_ids,
    };
    const res = yield sendNotification(this.secret, data);
    return res;
  },
};
