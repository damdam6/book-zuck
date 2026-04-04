import type { Octokit } from '@octokit/rest';
import type { ReviewComment } from '../types.js';

export const createReview = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  comments: ReviewComment[],
  summary: string
): Promise<void> => {
  await octokit.pulls.createReview({
    owner,
    repo,
    pull_number: prNumber,
    body: summary,
    event: 'COMMENT',
    comments: comments.map((c) => ({
      path: c.path,
      line: c.line,
      body: c.body,
      side: c.side ?? 'RIGHT',
    })),
  });
};

export const getExistingBotComments = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  botLogin: string
): Promise<ReviewComment[]> => {
  const comments = await octokit.paginate(octokit.pulls.listReviewComments, {
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  return comments
    .filter((c) => c.user?.login === botLogin)
    .map((c) => ({
      path: c.path,
      line: c.line ?? c.original_line ?? 0,
      body: c.body,
      side: c.side as ReviewComment['side'],
    }));
};

export const replyToComment = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  commentId: number,
  body: string
): Promise<void> => {
  await octokit.pulls.createReplyForReviewComment({
    owner,
    repo,
    pull_number: prNumber,
    comment_id: commentId,
    body,
  });
};
