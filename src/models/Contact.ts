import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailDraft {
  id: string;
  label: string;
  content: string;
}

export interface IContact extends Document {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  contactOwner: string;
  contactSource: string;
  status: 'Approached' | 'First Follow-Up' | 'Second Follow-Up' | 'Third Follow-Up' | 'Fourth Follow-Up' | 'Connected' | 'Lost' | 'Closed Won';
  linkedinUrl?: string;
  niche: string;
  dateAdded: Date;
  statusChangedDate: Date;
  nextFollowUpDate?: Date;
  emails: {
    outreach?: string;
    followUp1?: string;
    followUp2?: string;
    followUp3?: string;
    followUp4?: string;
  };
  emailSequence?: IEmailDraft[];
}

const EmailDraftSchema = new Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  content: { type: String, default: '' }
}, { _id: false });

const ContactSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  jobTitle: { type: String },
  contactOwner: { type: String, default: 'Parth Kotadiya' },
  contactSource: { type: String, required: true },
  status: { 
    type: String, 
    required: true,
    enum: ['Approached', 'First Follow-Up', 'Second Follow-Up', 'Third Follow-Up', 'Fourth Follow-Up', 'Connected', 'Lost', 'Closed Won'],
    default: 'Approached'
  },
  linkedinUrl: { type: String },
  niche: { type: String, required: true },
  dateAdded: { type: Date, default: Date.now },
  statusChangedDate: { type: Date, default: Date.now },
  nextFollowUpDate: { type: Date },
  emails: {
    outreach: { type: String, default: '' },
    followUp1: { type: String, default: '' },
    followUp2: { type: String, default: '' },
    followUp3: { type: String, default: '' },
    followUp4: { type: String, default: '' },
  },
  emailSequence: [EmailDraftSchema]
}, { timestamps: true });

const transform = (doc: any, ret: any) => {
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

export default mongoose.models.Contact || mongoose.model<IContact>('Contact', ContactSchema);
