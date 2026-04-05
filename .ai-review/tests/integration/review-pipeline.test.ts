import { describe, it, expect, vi } from 'vitest';
import { runQualityReview } from '../../src/agents/reviewers/quality.js';
import { runPerformanceReview } from '../../src/agents/reviewers/performance.js';
import { runSecurityReview } from '../../src/agents/reviewers/security.js';
import { runOrchestrator } from '../../src/agents/orchestrator.js';
import type { DiffChunk, LLMProvider } from '../../src/types.js';

const mockDiff: DiffChunk[] = [
  { filename: 'src/app.ts', status: 'modified', patch: '@@ -1,3 +1,4 @@\n+const x = 1;', additions: 1, deletions: 0 },
  { filename: 'src/utils.ts', status: 'added', patch: '@@ -0,0 +1,5 @@\n+export const foo = () => {};', additions: 5, deletions: 0 },
];

const qualityResponse = JSON.stringify({
  issues: [
    { file: 'src/app.ts', line: 1, severity: 'warning', category: 'quality', title: '네이밍', description: '변수명 불명확', suggestion: '의미있는 이름 사용' },
    { file: 'src/utils.ts', line: 1, severity: 'info', category: 'quality', title: '함수 구조', description: '빈 함수', suggestion: '구현 추가' },
  ],
});

const performanceResponse = JSON.stringify({
  issues: [
    { file: 'src/app.ts', line: 1, severity: 'info', category: 'performance', title: '불필요 할당', description: '사용되지 않는 변수', suggestion: '제거' },
  ],
});

const securityResponse = JSON.stringify({ issues: [] });

const orchestratorResponse = JSON.stringify({
  summary: '## 리뷰 요약\n2개 파일에서 2개 이슈 발견',
  comments: [
    { path: 'src/app.ts', line: 1, body: '**[warning]** 변수명 불명확', severity: 'warning' },
    { path: 'src/utils.ts', line: 1, body: '**[info]** 빈 함수', severity: 'info' },
  ],
});

describe('Review Pipeline Integration', () => {
  it('runs full pipeline: 3 agents → orchestrator → final comments', async () => {
    const qualityProvider: LLMProvider = { chat: vi.fn().mockResolvedValue(qualityResponse) };
    const perfProvider: LLMProvider = { chat: vi.fn().mockResolvedValue(performanceResponse) };
    const securityProvider: LLMProvider = { chat: vi.fn().mockResolvedValue(securityResponse) };
    const orchProvider: LLMProvider = { chat: vi.fn().mockResolvedValue(orchestratorResponse) };

    // 3개 에이전트 병렬 실행
    const [qualityIssues, perfIssues, securityIssues] = await Promise.all([
      runQualityReview(qualityProvider, 'model', 'prompt', mockDiff),
      runPerformanceReview(perfProvider, 'model', 'prompt', mockDiff),
      runSecurityReview(securityProvider, 'model', 'prompt', mockDiff),
    ]);

    expect(qualityIssues).toHaveLength(2);
    expect(qualityIssues.every((i) => i.category === 'quality')).toBe(true);

    expect(perfIssues).toHaveLength(1);
    expect(perfIssues[0].category).toBe('performance');

    expect(securityIssues).toHaveLength(0);

    // Orchestrator 실행
    const result = await runOrchestrator(
      orchProvider, 'model', 'prompt',
      { diff: mockDiff, qualityIssues, performanceIssues: perfIssues, securityIssues },
      20
    );

    expect(result.summary).toContain('리뷰 요약');
    expect(result.comments).toHaveLength(2);
    expect(result.comments[0].path).toBe('src/app.ts');
    expect(result.stats.total).toBe(2);

    // 각 provider가 호출되었는지 확인
    expect(qualityProvider.chat).toHaveBeenCalledTimes(1);
    expect(perfProvider.chat).toHaveBeenCalledTimes(1);
    expect(securityProvider.chat).toHaveBeenCalledTimes(1);
    expect(orchProvider.chat).toHaveBeenCalledTimes(1);
  });

  it('handles agent failure gracefully', async () => {
    const failingProvider: LLMProvider = { chat: vi.fn().mockRejectedValue(new Error('fail')) };
    const okProvider: LLMProvider = { chat: vi.fn().mockResolvedValue(JSON.stringify({ issues: [] })) };
    const orchProvider: LLMProvider = { chat: vi.fn().mockResolvedValue(JSON.stringify({ summary: 'ok', comments: [] })) };

    const [q, p, s] = await Promise.all([
      runQualityReview(failingProvider, 'model', 'prompt', mockDiff),
      runPerformanceReview(okProvider, 'model', 'prompt', mockDiff),
      runSecurityReview(okProvider, 'model', 'prompt', mockDiff),
    ]);

    // 실패한 에이전트는 빈 배열 반환 (fail-safe)
    expect(q).toHaveLength(0);
    expect(p).toHaveLength(0);
    expect(s).toHaveLength(0);

    const result = await runOrchestrator(orchProvider, 'model', 'prompt', {
      diff: mockDiff, qualityIssues: q, performanceIssues: p, securityIssues: s,
    }, 20);

    expect(result.comments).toHaveLength(0);
  });
});
