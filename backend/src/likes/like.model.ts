import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ILike extends Document {
  _id: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  createdAt: Date;
}

const likeSchema = new Schema<ILike>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

likeSchema.index({ post: 1, user: 1 }, { unique: true });

const Like: Model<ILike> = mongoose.model<ILike>('Like', likeSchema);

export default Like;
