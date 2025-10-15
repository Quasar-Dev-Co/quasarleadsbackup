import mongoose, { Document, Schema } from 'mongoose';

export interface ITemporaryLead extends Document {
	// Basic lead fields (from SerpAPI only)
	name: string;
	company: string;
	location: string;
	userId: string; // User who created this search
	website?: string;
	email?: string;
	phone?: string;
	linkedinProfile?: string;
	googleAds?: boolean; // running ads or not from serp result
	googleAdsChecked?: boolean;
	organicRanking?: number;
	source?: string; // serp-api or google-maps
	address?: string;
	rating?: string;
	reviews?: string;
	// Auth check flag
	isAuthCheck: boolean; // true once OpenAI enrichment done
	// Timing
	createdAt: Date;
	updatedAt: Date;
}

const temporaryLeadSchema = new Schema<ITemporaryLead>({
	name: { type: String, required: true, trim: true, index: true },
	company: { type: String, required: true, trim: true, index: true },
	location: { type: String, required: true, trim: true },
	userId: { type: String, required: true, trim: true, index: true },
	website: { type: String, trim: true },
	email: { type: String, trim: true, lowercase: true },
	phone: { type: String, trim: true },
	linkedinProfile: { type: String, trim: true },
	googleAds: { type: Boolean, default: false },
	googleAdsChecked: { type: Boolean, default: false },
	organicRanking: { type: Number, min: 1, max: 100 },
	source: { type: String, default: 'serp-api', trim: true },
	address: { type: String, trim: true },
	rating: { type: String },
	reviews: { type: String },
	isAuthCheck: { type: Boolean, default: false, index: true },
}, {
	timestamps: true,
});

temporaryLeadSchema.index({ company: 1, location: 1 }, { unique: false });
temporaryLeadSchema.index({ isAuthCheck: 1, createdAt: 1 });

const TemporaryLead = mongoose.models.TemporaryLead || mongoose.model<ITemporaryLead>('TemporaryLead', temporaryLeadSchema);

export default TemporaryLead;
export { TemporaryLead };


