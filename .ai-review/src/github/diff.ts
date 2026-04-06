import type { Octokit } from '@octokit/rest';
import { minimatch } from 'minimatch';
import type { DiffChunk } from '../types.js';

const MAX_PATCH_SIZE = 8000;

const VALID_STATUSES = new Set<string>(['added', 'modified', 'removed', 'renamed']);
const toDiffStatus = (value: unknown): DiffChunk['status'] =>
  typeof value === 'string' && VALID_STATUSES.has(value)
    ? (value as DiffChunk['status'])
    : 'modified';

const isExcluded = (filename: string, patterns: string[]): boolean =>
  patterns.some((pattern) => minimatch(filename, pattern));

const splitByHunks = (filename: string, patch: string, status: DiffChunk['status'], additions: number, deletions: number): DiffChunk[] => {
  const hunks = patch.split(/(?=^@@\s)/m).filter(Boolean);

  if (hunks.length <= 1) {
    return [{ filename, status, patch, additions, deletions }];
  }

  return hunks.map((hunk) => ({
    filename,
    status,
    patch: hunk,
    additions,
    deletions,
  }));
};

export const getDiff = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  excludePatterns: string[]
): Promise<DiffChunk[]> => {
  const files = await octokit.paginate(octokit.pulls.listFiles, {
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  const chunks: DiffChunk[] = [];

  for (const file of files) {
    if (!file.patch) continue;
    if (file.status === 'removed') continue;
    if (isExcluded(file.filename, excludePatterns)) continue;

    const status = toDiffStatus(file.status);

    if (file.patch.length > MAX_PATCH_SIZE) {
      chunks.push(...splitByHunks(file.filename, file.patch, status, file.additions, file.deletions));
    } else {
      chunks.push({
        filename: file.filename,
        status,
        patch: file.patch,
        additions: file.additions,
        deletions: file.deletions,
      });
    }
  }

  return chunks;
};
