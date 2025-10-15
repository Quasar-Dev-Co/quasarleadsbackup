import mongoose, { Document, Schema } from 'mongoose';

export interface ISearchJob extends Document {
	service: string;
	location: string;
	userId: string;
	status: 'pending' | 'processing' | 'completed' | 'failed';
	progress: number;
	leadsFound: number;
	errorMessage?: string;
	startedAt?: Date;
	completedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}

const searchJobSchema = new Schema<ISearchJob>({
	service: { type: String, required: true, trim: true },
	location: { type: String, required: true, trim: true },
	userId: { type: String, required: true, index: true },
	status: { 
		type: String, 
		enum: ['pending', 'processing', 'completed', 'failed'], 
		default: 'pending',
		index: true 
	},
	progress: { type: Number, default: 0, min: 0, max: 100 },
	leadsFound: { type: Number, default: 0 },
	errorMessage: { type: String },
	startedAt: { type: Date },
	completedAt: { type: Date },
}, {
	timestamps: true,
});

searchJobSchema.index({ status: 1, createdAt: 1 });
searchJobSchema.index({ userId: 1, status: 1 });

const SearchJob = mongoose.models.SearchJob || mongoose.model<ISearchJob>('SearchJob', searchJobSchema);

export default SearchJob;
export { SearchJob };
