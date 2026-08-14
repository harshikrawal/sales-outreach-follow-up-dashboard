const mongoose = require('mongoose');
const dns = require('dns');

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}
dns.setServers(['1.1.1.1', '8.8.8.8']);

const MONGODB_URI = 'mongodb+srv://harshikrawal7_db_user:aglSH0tSt4ZCo6ub@sales-and-follow-up.jibm8bk.mongodb.net/sales';

const EmailDraftSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  content: { type: String, default: '' }
}, { _id: false });

const ContactSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  status: String,
  emails: mongoose.Schema.Types.Mixed,
  emailSequence: [EmailDraftSchema]
}, { timestamps: true });

const transform = (doc, ret) => {
  if (!ret.emailSequence || ret.emailSequence.length === 0) {
    ret.emailSequence = [
      { id: "1", label: "Initial Outreach", content: ret.emails?.outreach || "" },
      { id: "2", label: "First Follow-Up", content: ret.emails?.followUp1 || "" },
      { id: "3", label: "Second Follow-Up (Break-up)", content: ret.emails?.followUp2 || "" },
      { id: "4", label: "Third Follow-Up", content: ret.emails?.followUp3 || "" },
      { id: "5", label: "Fourth Follow-Up", content: ret.emails?.followUp4 || "" },
    ].filter((item, idx) => idx < 3 || item.content !== "");
  }
  return ret;
};

ContactSchema.set('toJSON', { virtuals: true, transform });
ContactSchema.set('toObject', { virtuals: true, transform });

const Contact = mongoose.models.Contact || mongoose.model('Contact', ContactSchema);

async function main() {
  await mongoose.connect(MONGODB_URI, { family: 4 });
  const contacts = await Contact.find().limit(3);
  console.log('toJSON Outputs:');
  contacts.forEach(c => {
    console.log(JSON.stringify(c.toJSON(), null, 2));
  });
  await mongoose.disconnect();
}

main().catch(console.error);
