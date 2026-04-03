import mongoose, { Schema, Document } from 'mongoose';

export interface IContact extends Document {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  contactOwner: string;
  contactSource: string;
  status: 'Approached' | 'First Follow-Up' | 'Second Follow-Up' | 'Connected' | 'Lost' | 'Closed Won';
  linkedinUrl?: string;
  niche: string;
  dateAdded: Date;
  statusChangedDate: Date;
  nextFollowUpDate?: Date;
  emails: {
    outreach?: string;
    followUp1?: string;
    followUp2?: string;
  };
}

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
    enum: ['Approached', 'First Follow-Up', 'Second Follow-Up', 'Connected', 'Lost', 'Closed Won'],
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
  }
}, { timestamps: true });

export default mongoose.models.Contact || mongoose.model<IContact>('Contact', ContactSchema);
