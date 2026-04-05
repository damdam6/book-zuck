import { describe, it, expect, vi } from 'vitest';
import { getDiff } from '../../src/github/diff.js';

const mockOctokit = {
  paginate: vi.fn(),
  pulls: { listFiles: vi.fn() },
} as any;

describe('getDiff', () => {
  it('returns DiffChunk array for normal files', async () => {
    mockOctokit.paginate.mockResolvedValue([
      { filename: 'src/app.ts', status: 'modified', patch: '@@ +1 @@\n+line', additions: 1, deletions: 0 },
    ]);

    const result = await getDiff(mockOctokit, 'owner', 'repo', 1, []);
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('src/app.ts');
  });

  it('excludes files without patch (binary)', async () => {
    mockOctokit.paginate.mockResolvedValue([
      { filename: 'image.png', status: 'added', patch: undefined, additions: 0, deletions: 0 },
      { filename: 'src/app.ts', status: 'modified', patch: '@@ +1 @@\n+line', additions: 1, deletions: 0 },
    ]);

    const result = await getDiff(mockOctokit, 'owner', 'repo', 1, []);
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('src/app.ts');
  });

  it('excludes removed files', async () => {
    mockOctokit.paginate.mockResolvedValue([
      { filename: 'old.ts', status: 'removed', patch: '@@ -1 @@\n-line', additions: 0, deletions: 1 },
    ]);

    const result = await getDiff(mockOctokit, 'owner', 'repo', 1, []);
    expect(result).toHaveLength(0);
  });

  it('excludes files matching exclude patterns', async () => {
    mockOctokit.paginate.mockResolvedValue([
      { filename: 'package-lock.json', status: 'modified', patch: '@@ +1 @@\n+line', additions: 1, deletions: 0 },
      { filename: 'src/app.ts', status: 'modified', patch: '@@ +1 @@\n+line', additions: 1, deletions: 0 },
    ]);

    const result = await getDiff(mockOctokit, 'owner', 'repo', 1, ['*.json']);
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('src/app.ts');
  });

  it('splits large patches by hunks', async () => {
    const largePatch = '@@ -1,3 +1,4 @@\n' + '+line\n'.repeat(5000) + '@@ -100,3 +100,4 @@\n' + '+another\n'.repeat(100);
    mockOctokit.paginate.mockResolvedValue([
      { filename: 'big.ts', status: 'modified', patch: largePatch, additions: 5100, deletions: 0 },
    ]);

    const result = await getDiff(mockOctokit, 'owner', 'repo', 1, []);
    expect(result.length).toBeGreaterThan(1);
    expect(result.every((c) => c.filename === 'big.ts')).toBe(true);
  });

  it('returns empty array for empty file list', async () => {
    mockOctokit.paginate.mockResolvedValue([]);
    const result = await getDiff(mockOctokit, 'owner', 'repo', 1, []);
    expect(result).toHaveLength(0);
  });
});
