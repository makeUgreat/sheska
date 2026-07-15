import { type Server } from 'node:http';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { PublishPostUseCase } from '@contexts/posts/application/use-cases/publish-post.use-case';
import { GetPostUseCase } from '@contexts/posts/application/use-cases/get-post.use-case';
import { ListPostsUseCase } from '@contexts/posts/application/use-cases/list-posts.use-case';
import {
  ApplicationException,
  APPLICATION_ERROR_KIND,
  LOGGER,
} from '@kernels/application';
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

describe('PostsHttpController', () => {
  let app: INestApplication;
  let httpServer: Server;
  let publishPostUseCase: PublishPostUseCaseMock;
  let getPostUseCase: GetPostUseCaseMock;
  let listPostsUseCase: ListPostsUseCaseMock;

  beforeEach(async () => {
    publishPostUseCase = { execute: vi.fn<PublishPostUseCase['execute']>() };
    getPostUseCase = { execute: vi.fn<GetPostUseCase['execute']>() };
    listPostsUseCase = { execute: vi.fn<ListPostsUseCase['execute']>() };

    const testingModule = await Test.createTestingModule({
      controllers: [PostsHttpController],
      providers: [
        { provide: PublishPostUseCase, useValue: publishPostUseCase },
        { provide: GetPostUseCase, useValue: getPostUseCase },
        { provide: ListPostsUseCase, useValue: listPostsUseCase },
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
        new ApplicationException({
          kind: APPLICATION_ERROR_KIND.NOT_FOUND,
          code: 'posts.source_not_found',
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
        code: 'posts.source_not_found',
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
