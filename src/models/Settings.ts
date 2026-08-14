import mongoose, { Schema, Document } from 'mongoose';

export interface IDynamicOption {
  id: string; 
  label: string;
  active: boolean;
  order: number;
}

export interface IFollowUpStep {
  id: string;
  label: string;
  interval: number;
}

export interface ISettings extends Document {
  firstFollowUpInterval: number;
  secondFollowUpInterval: number;
  contactSources: IDynamicOption[];
  niches: IDynamicOption[];
  followUpSteps: IFollowUpStep[];
}

const DynamicOptionSchema = new Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { _id: false });

const FollowUpStepSchema = new Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  interval: { type: Number, required: true }
}, { _id: false });

const SettingsSchema = new Schema({
  firstFollowUpInterval: { type: Number, default: 5 },
  secondFollowUpInterval: { type: Number, default: 7 },
  contactSources: [DynamicOptionSchema],
  niches: [DynamicOptionSchema],
  followUpSteps: [FollowUpStepSchema]
}, { timestamps: true });

// We ensure there's only one Settings document by using a fixed ID or using a singleton approach
export default mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);
