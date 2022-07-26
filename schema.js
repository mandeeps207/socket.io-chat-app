const {Schema, model} = require('mongoose');
const tokenSchema = new Schema({
  userToken: {
    type: String,
    required: true
  },
  messages: [
    {
      from: {
        type: String,
        required: true
      },
      message: {
        type: String,
        required: true
      },
      time: {
        type: String,
        required: true
      }
    }
  ]
});

const tokenModel = model("socket-chat-tokens", tokenSchema);
module.exports = tokenModel;