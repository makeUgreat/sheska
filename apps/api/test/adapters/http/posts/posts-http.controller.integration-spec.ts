import { type Server } from 'node:http';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { PublishPostUseCase } from '@contexts/posts/application/use-cases/publish-post.use-case';
import { GetPostUseCase } from '@contexts/posts/application/use-cases/get-post.use-case';
import { ListPostsUseCase } from '@contexts/posts/application/use-cases/list-posts.use-case';
import { SearchPostsUseCase } from '@contexts/posts/application/use-cases/search-posts.use-case';
import { UpdatePostTitleUseCase } from '@contexts/posts/application/use-cases/update-post-title.use-case';
import {
  ApplicationException,
  APPLICATION_ERROR_KIND,
  LOGGER,
} from '@kernels/application';
import {
  InfrastructureException,
  INFRASTRUCTURE_ERROR_KIND,
} from '@kernels/infrastructure';
import { PostsHttpController } from '@contexts/posts/presentation/http/posts-http.controller';
import { HttpExceptionFilter } from '@platform/nest/filters/http-exception.filter';
import { ZodValidationPipe } from '@platform/nest/pipes/zod-validation.pipe';
import request from 'supertest';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockedFunction,
  vi,
} from 'vitest';

type PublishPostUseCaseMock = {
  execute: MockedFunction<PublishPostUseCase['execute']>;
};

type GetPostUseCaseMock = {
  execute: MockedFunction<GetPostUseCase['execute']>;
};

type ListPostsUseCaseMock = {
  execute: MockedFunction<ListPostsUseCase['execute']>;
};

type SearchPostsUseCaseMock = {
  execute: MockedFunction<SearchPostsUseCase['execute']>;
};

type UpdatePostTitleUseCaseMock = {
  execute: MockedFunction<UpdatePostTitleUseCase['execute']>;
};

describe('PostsHttpController', () => {
  let app: INestApplication;
  let httpServer: Server;
  let publishPostUseCase: PublishPostUseCaseMock;
  let getPostUseCase: GetPostUseCaseMock;
  let listPostsUseCase: ListPostsUseCaseMock;
  let searchPostsUseCase: SearchPostsUseCaseMock;
  let updatePostTitleUseCase: UpdatePostTitleUseCaseMock;

  beforeEach(async () => {
    publishPostUseCase = { execute: vi.fn<PublishPostUseCase['execute']>() };
    getPostUseCase = { execute: vi.fn<GetPostUseCase['execute']>() };
    listPostsUseCase = { execute: vi.fn<ListPostsUseCase['execute']>() };
    searchPostsUseCase = { execute: vi.fn<SearchPostsUseCase['execute']>() };
    updatePostTitleUseCase = {
      execute: vi.fn<UpdatePostTitleUseCase['execute']>(),
    };

    const testingModule = await Test.createTestingModule({
      controllers: [PostsHttpController],
      providers: [
        { provide: PublishPostUseCase, useValue: publishPostUseCase },
        { provide: GetPostUseCase, useValue: getPostUseCase },
        { provide: ListPostsUseCase, useValue: listPostsUseCase },
        { provide: SearchPostsUseCase, useValue: searchPostsUseCase },
        { provide: UpdatePostTitleUseCase, useValue: updatePostTitleUseCase },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
        {
          provide: LOGGER,
          useValue: {
            log: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn(),
          },
        },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
      ],
    }).compile();

    app = testingModule.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /posts', () => {
    it('post를 게시하고 201 응답을 반환한다', async () => {
      const now = new Date('2026-01-01T00:00:00.000Z');
      publishPostUseCase.execute.mockResolvedValue({
        postId: 'post-1',
        sourceId: 'source-1',
        title: '테스트 포스트',
        viewCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      const response = await request(httpServer)
        .post('/posts')
        .send({ sourceId: 'source-1' })
        .expect(201);

      expect(response.body).toEqual({
        postId: 'post-1',
        sourceId: 'source-1',
        title: '테스트 포스트',
        viewCount: 0,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
      expect(publishPostUseCase.execute).toHaveBeenCalledWith({
        sourceId: 'source-1',
      });
    });

    it('요청 body가 유효하지 않으면 400 응답을 반환하고 use case를 호출하지 않는다', async () => {
      const response = await request(httpServer)
        .post('/posts')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'request.validation_failed',
      });
      expect(publishPostUseCase.execute).not.toHaveBeenCalled();
    });

    it('source가 없으면 404 응답을 반환한다', async () => {
      publishPostUseCase.execute.mockRejectedValue(
        new InfrastructureException({
          kind: INFRASTRUCTURE_ERROR_KIND.NOT_FOUND,
          code: 'source.get_failed',
          source: { boundary: 'persistence', adapter: 'source.pg-drizzle' },
          message: 'Source not found',
          details: {},
        }),
      );

      const response = await request(httpServer)
        .post('/posts')
        .send({ sourceId: 'non-existent' })
        .expect(404);

      expect(response.body).toEqual({
        statusCode: 404,
        code: 'source.get_failed',
        message: 'Source not found',
        details: {},
      });
    });

    it('이미 게시된 source이면 409 응답을 반환한다', async () => {
      publishPostUseCase.execute.mockRejectedValue(
        new ApplicationException({
          kind: APPLICATION_ERROR_KIND.STATE_CONFLICT,
          code: 'posts.source_already_published',
          message: 'This source already has a published post',
          details: {},
        }),
      );

      const response = await request(httpServer)
        .post('/posts')
        .send({ sourceId: 'source-1' })
        .expect(409);

      expect(response.body).toEqual({
        statusCode: 409,
        code: 'posts.source_already_published',
        message: 'This source already has a published post',
        details: {},
      });
    });

    it('예기치 못한 오류는 500 응답으로 마스킹한다', async () => {
      publishPostUseCase.execute.mockRejectedValue(
        new Error('DB connection lost'),
      );

      const response = await request(httpServer)
        .post('/posts')
        .send({ sourceId: 'source-1' })
        .expect(500);

      expect(response.body).toEqual({
        statusCode: 500,
        code: 'internal.unexpected',
        message: 'Internal server error',
        details: {},
      });
    });
  });

  describe('GET /posts', () => {
    it('포스트 목록과 nextCursor를 200 응답으로 반환한다', async () => {
      const now = new Date('2026-01-01T00:00:00.000Z');
      const cursorValue = { createdAt: now, id: 'post-1' };
      listPostsUseCase.execute.mockResolvedValue({
        posts: [
          {
            postId: 'post-1',
            sourceId: 'source-1',
            title: '테스트 포스트',
            viewCount: 0,
            createdAt: now,
            updatedAt: now,
          },
        ],
        nextCursor: cursorValue,
      });

      const response = await request(httpServer).get('/posts').expect(200);
      const body = response.body as { posts: unknown[]; nextCursor: unknown };

      expect(body.posts).toEqual([
        {
          postId: 'post-1',
          sourceId: 'source-1',
          title: '테스트 포스트',
          viewCount: 0,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ]);
      expect(typeof body.nextCursor).toBe('string');
      expect(listPostsUseCase.execute).toHaveBeenCalledWith({
        cursor: undefined,
        limit: undefined,
      });
    });

    it('cursor 쿼리 파라미터를 디코딩하여 use case에 전달한다', async () => {
      const now = new Date('2026-01-01T00:00:00.000Z');
      const encodedCursor = Buffer.from(
        JSON.stringify({ createdAt: now.toISOString(), id: 'post-1' }),
      ).toString('base64url');
      listPostsUseCase.execute.mockResolvedValue({
        posts: [],
        nextCursor: null,
      });

      await request(httpServer)
        .get(`/posts?cursor=${encodedCursor}&limit=5`)
        .expect(200);

      expect(listPostsUseCase.execute).toHaveBeenCalledWith({
        cursor: { createdAt: now, id: 'post-1' },
        limit: 5,
      });
    });

    it('유효하지 않은 limit이면 400 응답을 반환한다', async () => {
      const response = await request(httpServer)
        .get('/posts?limit=-1')
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'request.validation_failed',
      });
      expect(listPostsUseCase.execute).not.toHaveBeenCalled();
    });

    it('유효하지 않은 cursor이면 400 응답을 반환한다', async () => {
      const response = await request(httpServer)
        .get('/posts?cursor=not-a-cursor')
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'request.validation_failed',
      });
      expect(listPostsUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('GET /posts/search', () => {
    it('query와 일치하는 post 목록과 nextCursor를 200으로 반환한다', async () => {
      const now = new Date('2026-01-01T00:00:00.000Z');
      const cursorValue = { createdAt: now, id: 'post-1', score: 1 };
      searchPostsUseCase.execute.mockResolvedValue({
        posts: [
          {
            postId: 'post-1',
            sourceId: 'source-1',
            title: 'TypeScript 입문',
            viewCount: 0,
            createdAt: now,
            updatedAt: now,
          },
        ],
        nextCursor: cursorValue,
      });

      const response = await request(httpServer)
        .get('/posts/search')
        .query({ q: 'TypeScript' })
        .expect(200);
      const body = response.body as { posts: unknown[]; nextCursor: unknown };

      expect(body.posts).toEqual([
        {
          postId: 'post-1',
          sourceId: 'source-1',
          title: 'TypeScript 입문',
          viewCount: 0,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ]);
      expect(typeof body.nextCursor).toBe('string');
      expect(searchPostsUseCase.execute).toHaveBeenCalledWith({
        query: 'TypeScript',
        cursor: undefined,
        limit: undefined,
      });
    });

    it('cursor와 limit 쿼리 파라미터를 디코딩하여 use case에 전달한다', async () => {
      const now = new Date('2026-01-01T00:00:00.000Z');
      const encodedCursor = Buffer.from(
        JSON.stringify({
          createdAt: now.toISOString(),
          id: 'post-1',
          score: 0.8,
        }),
      ).toString('base64url');
      searchPostsUseCase.execute.mockResolvedValue({
        posts: [],
        nextCursor: null,
      });

      await request(httpServer)
        .get('/posts/search')
        .query({ q: 'TypeScript', cursor: encodedCursor, limit: 5 })
        .expect(200);

      expect(searchPostsUseCase.execute).toHaveBeenCalledWith({
        query: 'TypeScript',
        cursor: { createdAt: now, id: 'post-1', score: 0.8 },
        limit: 5,
      });
    });

    it('q가 없으면 400 응답을 반환하고 use case를 호출하지 않는다', async () => {
      const response = await request(httpServer)
        .get('/posts/search')
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'request.validation_failed',
      });
      expect(searchPostsUseCase.execute).not.toHaveBeenCalled();
    });

    it('q가 1자이면 400 응답을 반환하고 use case를 호출하지 않는다', async () => {
      const response = await request(httpServer)
        .get('/posts/search')
        .query({ q: 'a' })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'request.validation_failed',
      });
      expect(searchPostsUseCase.execute).not.toHaveBeenCalled();
    });

    it('예기치 못한 오류는 500 응답으로 마스킹한다', async () => {
      searchPostsUseCase.execute.mockRejectedValue(
        new Error('DB connection lost'),
      );

      const response = await request(httpServer)
        .get('/posts/search')
        .query({ q: 'TypeScript' })
        .expect(500);

      expect(response.body).toEqual({
        statusCode: 500,
        code: 'internal.unexpected',
        message: 'Internal server error',
        details: {},
      });
    });
  });

  describe('GET /posts/:id', () => {
    it('post를 200 응답으로 반환하고 viewCount를 증가시킨다', async () => {
      const now = new Date('2026-01-01T00:00:00.000Z');
      getPostUseCase.execute.mockResolvedValue({
        postId: 'post-1',
        sourceId: 'source-1',
        title: '테스트 포스트',
        viewCount: 1,
        createdAt: now,
        updatedAt: now,
        sourceContent: '테스트 본문',
      });

      const response = await request(httpServer)
        .get('/posts/post-1')
        .expect(200);

      expect(response.body).toEqual({
        postId: 'post-1',
        sourceId: 'source-1',
        title: '테스트 포스트',
        viewCount: 1,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        sourceContent: '테스트 본문',
      });
      expect(getPostUseCase.execute).toHaveBeenCalledWith({ postId: 'post-1' });
    });

    it('post가 없으면 404 응답을 반환한다', async () => {
      getPostUseCase.execute.mockRejectedValue(
        new ApplicationException({
          kind: APPLICATION_ERROR_KIND.NOT_FOUND,
          code: 'posts.post_not_found',
          message: 'Post not found',
          details: {},
        }),
      );

      const response = await request(httpServer)
        .get('/posts/non-existent')
        .expect(404);

      expect(response.body).toEqual({
        statusCode: 404,
        code: 'posts.post_not_found',
        message: 'Post not found',
        details: {},
      });
    });

    it('예기치 못한 오류는 500 응답으로 마스킹한다', async () => {
      getPostUseCase.execute.mockRejectedValue(new Error('DB connection lost'));

      const response = await request(httpServer)
        .get('/posts/post-1')
        .expect(500);

      expect(response.body).toEqual({
        statusCode: 500,
        code: 'internal.unexpected',
        message: 'Internal server error',
        details: {},
      });
    });
  });
});
