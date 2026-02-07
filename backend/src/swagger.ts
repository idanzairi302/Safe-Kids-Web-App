import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SafeKids API',
      version: '1.0.0',
      description: 'Community-based hazard reporting API for child safety',
    },
    servers: [
      { url: '/api', description: 'API base path' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e1' },
            username: { type: 'string', example: 'john_doe' },
            email: { type: 'string', example: 'john@example.com' },
            profileImage: { type: 'string', example: '/uploads/abc123.jpg' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Post: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            author: { $ref: '#/components/schemas/User' },
            text: { type: 'string', example: 'Broken swing at Central Park playground' },
            image: { type: 'string', example: 'abc123.jpg' },
            likesCount: { type: 'integer', example: 5 },
            commentsCount: { type: 'integer', example: 3 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Comment: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            post: { type: 'string' },
            author: { $ref: '#/components/schemas/User' },
            text: { type: 'string', example: 'Thanks for reporting this!' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Error message' },
          },
        },
        ValidationErrors: {
          type: 'object',
          properties: {
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  msg: { type: 'string' },
                  param: { type: 'string' },
                  location: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User profile endpoints' },
      { name: 'Posts', description: 'Post CRUD endpoints' },
      { name: 'Comments', description: 'Comment endpoints' },
      { name: 'Likes', description: 'Like endpoints' },
      { name: 'Search', description: 'AI-powered search' },
    ],
    paths: {
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'email', 'password'],
                  properties: {
                    username: { type: 'string', minLength: 3, maxLength: 30 },
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 6 },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'User created', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } },
            '400': { description: 'Validation error or duplicate', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login with email and password',
          description: 'Returns access token in body and sets refresh token as httpOnly cookie',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Login successful', content: { 'application/json': { schema: { type: 'object', properties: { accessToken: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } },
            '401': { description: 'Invalid credentials' },
          },
        },
      },
      '/auth/google': {
        post: {
          tags: ['Auth'],
          summary: 'Login with Google OAuth',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['credential'],
                  properties: { credential: { type: 'string', description: 'Google ID token' } },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Login successful', content: { 'application/json': { schema: { type: 'object', properties: { accessToken: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } },
            '401': { description: 'Google auth failed' },
          },
        },
      },
      '/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access token',
          description: 'Uses httpOnly refresh token cookie to issue a new access token',
          responses: {
            '200': { description: 'New access token', content: { 'application/json': { schema: { type: 'object', properties: { accessToken: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } },
            '401': { description: 'Invalid refresh token' },
          },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout and invalidate refresh token',
          responses: {
            '200': { description: 'Logged out', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
          },
        },
      },
      '/users/{id}': {
        get: {
          tags: ['Users'],
          summary: 'Get user profile by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'User profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
            '404': { description: 'User not found' },
          },
        },
      },
      '/users/me': {
        put: {
          tags: ['Users'],
          summary: 'Update own profile',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    username: { type: 'string' },
                    profileImage: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Updated user', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
            '401': { description: 'Not authenticated' },
          },
        },
      },
      '/posts': {
        get: {
          tags: ['Posts'],
          summary: 'Get paginated feed of posts',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 50 } },
            { name: 'cursor', in: 'query', schema: { type: 'string' }, description: 'Last post ID for pagination' },
            { name: 'author', in: 'query', schema: { type: 'string' }, description: 'Filter by author ID' },
          ],
          responses: {
            '200': {
              description: 'Paginated posts',
              content: { 'application/json': { schema: { type: 'object', properties: { posts: { type: 'array', items: { $ref: '#/components/schemas/Post' } }, nextCursor: { type: 'string', nullable: true }, hasMore: { type: 'boolean' } } } } },
            },
          },
        },
        post: {
          tags: ['Posts'],
          summary: 'Create a new post',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['text', 'image'],
                  properties: {
                    text: { type: 'string', minLength: 1, maxLength: 2000 },
                    image: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Post created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Post' } } } },
            '400': { description: 'Validation error' },
            '401': { description: 'Not authenticated' },
          },
        },
      },
      '/posts/{id}': {
        get: {
          tags: ['Posts'],
          summary: 'Get a single post',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Post details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Post' } } } },
            '404': { description: 'Post not found' },
          },
        },
        put: {
          tags: ['Posts'],
          summary: 'Update a post (owner only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    text: { type: 'string' },
                    image: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Updated post', content: { 'application/json': { schema: { $ref: '#/components/schemas/Post' } } } },
            '403': { description: 'Not authorized' },
          },
        },
        delete: {
          tags: ['Posts'],
          summary: 'Delete a post (owner only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Post deleted' },
            '403': { description: 'Not authorized' },
          },
        },
      },
      '/posts/{postId}/comments': {
        get: {
          tags: ['Comments'],
          summary: 'List comments for a post',
          parameters: [
            { name: 'postId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'cursor', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Paginated comments',
              content: { 'application/json': { schema: { type: 'object', properties: { comments: { type: 'array', items: { $ref: '#/components/schemas/Comment' } }, nextCursor: { type: 'string', nullable: true }, hasMore: { type: 'boolean' } } } } },
            },
          },
        },
        post: {
          tags: ['Comments'],
          summary: 'Add a comment to a post',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['text'],
                  properties: { text: { type: 'string', minLength: 1, maxLength: 500 } },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Comment created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Comment' } } } },
            '401': { description: 'Not authenticated' },
          },
        },
      },
      '/posts/{postId}/comments/{commentId}': {
        delete: {
          tags: ['Comments'],
          summary: 'Delete a comment (owner only)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'postId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'commentId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Comment deleted' },
            '403': { description: 'Not authorized' },
          },
        },
      },
      '/posts/{postId}/like': {
        post: {
          tags: ['Likes'],
          summary: 'Toggle like on a post',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Like toggled',
              content: { 'application/json': { schema: { type: 'object', properties: { liked: { type: 'boolean' }, likesCount: { type: 'integer' } } } } },
            },
            '401': { description: 'Not authenticated' },
          },
        },
        get: {
          tags: ['Likes'],
          summary: 'Check if current user liked a post',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Like status',
              content: { 'application/json': { schema: { type: 'object', properties: { liked: { type: 'boolean' } } } } },
            },
            '401': { description: 'Not authenticated' },
          },
        },
      },
      '/search': {
        post: {
          tags: ['Search'],
          summary: 'AI-powered free-text search',
          description: 'Search for posts using natural language. Uses Ollama AI to parse queries into structured filters. Rate limited to 5 requests per minute per user.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: { query: { type: 'string', minLength: 1, maxLength: 200, example: 'dangerous dogs near playground' } },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Search results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      posts: { type: 'array', items: { $ref: '#/components/schemas/Post' } },
                      query: {
                        type: 'object',
                        nullable: true,
                        properties: {
                          keywords: { type: 'array', items: { type: 'string' } },
                          category: { type: 'string' },
                          sortBy: { type: 'string' },
                        },
                      },
                      fallback: { type: 'boolean', description: 'True if AI was unavailable and text search was used' },
                    },
                  },
                },
              },
            },
            '401': { description: 'Not authenticated' },
            '429': { description: 'Rate limit exceeded' },
          },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'SafeKids API Documentation',
  }));
}
