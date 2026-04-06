import * as core from '@actions/core';
import type { ReviewThread } from '../types.js';

const MAX_PAGES = 10;

type GraphqlFn = <T>(query: string, variables?: Record<string, unknown>) => Promise<T>;

interface ThreadNode {
  id: string;
  isResolved: boolean;
  isOutdated: boolean;
  path: string;
  line: number | null;
  comments: {
    nodes: Array<{
      databaseId: number;
      body: string;
      author: { login: string } | null;
    }>;
  };
}

interface ThreadsResponse {
  repository: {
    pullRequest: {
      reviewThreads: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: ThreadNode[];
      };
    };
  };
}

interface ResolveResponse {
  resolveReviewThread: {
    thread: { id: string; isResolved: boolean };
  };
}

const THREADS_QUERY = `
  query($owner: String!, $repo: String!, $pr: Int!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $pr) {
        reviewThreads(first: 100, after: $cursor) {
          pageInfo { hasNextPage, endCursor }
          nodes {
            id
            isResolved
            isOutdated
            path
            line
            comments(last: 5) {
              nodes {
                databaseId
                body
                author { login }
              }
            }
          }
        }
      }
    }
  }
`;

const RESOLVE_MUTATION = `
  mutation($threadId: ID!) {
    resolveReviewThread(input: { threadId: $threadId }) {
      thread { id, isResolved }
    }
  }
`;

const toReviewThread = (node: ThreadNode): ReviewThread => ({
  id: node.id,
  isResolved: node.isResolved,
  isOutdated: node.isOutdated,
  path: node.path,
  line: node.line ?? 0,
  comments: node.comments.nodes.map((c) => ({
    id: c.databaseId,
    body: c.body,
    author: c.author?.login ?? 'unknown',
  })),
});

export const getUnresolvedThreads = async (
  graphql: GraphqlFn,
  owner: string,
  repo: string,
  prNumber: number
): Promise<ReviewThread[]> => {
  const threads: ReviewThread[] = [];
  let cursor: string | null = null;
  let page = 0;

  do {
    const data: ThreadsResponse = await graphql<ThreadsResponse>(THREADS_QUERY, {
      owner,
      repo,
      pr: prNumber,
      cursor,
    });

    const connection: ThreadsResponse['repository']['pullRequest']['reviewThreads'] = data.repository.pullRequest.reviewThreads;

    for (const node of connection.nodes) {
      if (!node.isResolved) {
        threads.push(toReviewThread(node));
      }
    }

    page++;
    if (page >= MAX_PAGES) {
      core.warning(`Reached max pagination limit (${MAX_PAGES} pages). Some threads may not be fetched.`);
      break;
    }

    cursor = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
  } while (cursor);

  return threads;
};

export const resolveThread = async (
  graphql: GraphqlFn,
  threadId: string
): Promise<void> => {
  await graphql<ResolveResponse>(RESOLVE_MUTATION, { threadId });
};

export const filterBotThreads = (
  threads: ReviewThread[],
  botLogin: string
): ReviewThread[] =>
  threads.filter((t) =>
    t.comments.some((c) => c.author === botLogin)
  );
