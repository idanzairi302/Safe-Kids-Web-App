export interface User {
  _id: string;
  username: string;
  email: string;
  profileImage: string;
  createdAt?: string;
}

export interface Post {
  _id: string;
  author: User;
  text: string;
  image: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  post: string;
  author: User;
  text: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  posts?: T[];
  comments?: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
