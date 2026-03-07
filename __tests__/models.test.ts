/**
 * Tests for data model type contracts.
 *
 * These tests verify that objects conforming to the model interfaces
 * contain the expected fields and value types. This catches accidental
 * field removals or type changes during refactoring.
 */
import type {
  DashboardData,
  TopLearner,
  LessonDay,
  WeeklyProgress,
  PronunciationMetrics,
  ConversationMetrics,
  OverallPerformance,
  ProgressData,
} from '../src/models';

describe('Model type contracts', () => {
  // ─── DashboardData ───
  describe('DashboardData', () => {
    const sample: DashboardData = {
      activeUsers: 42,
      growthPct: 12.5,
      usageDateRange: 'Feb 28 - Mar 7',
      weeklyBarData: [
        { label: 'Mon', thisWeek: 10, lastWeek: 8 },
        { label: 'Tue', thisWeek: 15, lastWeek: 12 },
      ],
      practiceActivity: { morning: 30, afternoon: 45, night: 25 },
      pronunciationAccuracy: 85.3,
      fluencyAccuracy: 78.1,
      vocabularyRetention: 91.0,
      topLearners: [{ name: 'Alice', sessions: 15 }],
      totalSessions: 150,
      sessionsGrowth: 8.5,
      sessionsThisWeek: [10, 22, 35, 48, 60, 72, 80],
      sessionsLastWeek: [8, 18, 30, 42, 55, 65, 74],
      lastAggregatedAt: '2026-03-07T10:00:00Z',
    };

    it('has required numeric fields', () => {
      expect(typeof sample.activeUsers).toBe('number');
      expect(typeof sample.growthPct).toBe('number');
      expect(typeof sample.pronunciationAccuracy).toBe('number');
      expect(typeof sample.fluencyAccuracy).toBe('number');
      expect(typeof sample.vocabularyRetention).toBe('number');
      expect(typeof sample.totalSessions).toBe('number');
      expect(typeof sample.sessionsGrowth).toBe('number');
    });

    it('has required array fields', () => {
      expect(Array.isArray(sample.weeklyBarData)).toBe(true);
      expect(Array.isArray(sample.topLearners)).toBe(true);
      expect(Array.isArray(sample.sessionsThisWeek)).toBe(true);
      expect(Array.isArray(sample.sessionsLastWeek)).toBe(true);
    });

    it('has practiceActivity with morning/afternoon/night', () => {
      expect(sample.practiceActivity).toHaveProperty('morning');
      expect(sample.practiceActivity).toHaveProperty('afternoon');
      expect(sample.practiceActivity).toHaveProperty('night');
    });

    it('weeklyBarData entries have label, thisWeek, lastWeek', () => {
      for (const entry of sample.weeklyBarData) {
        expect(typeof entry.label).toBe('string');
        expect(typeof entry.thisWeek).toBe('number');
        expect(typeof entry.lastWeek).toBe('number');
      }
    });

    it('accepts null for lastAggregatedAt', () => {
      const withNull: DashboardData = { ...sample, lastAggregatedAt: null };
      expect(withNull.lastAggregatedAt).toBeNull();
    });
  });

  // ─── TopLearner ───
  describe('TopLearner', () => {
    it('requires name and sessions', () => {
      const learner: TopLearner = { name: 'Bob', sessions: 10 };
      expect(typeof learner.name).toBe('string');
      expect(typeof learner.sessions).toBe('number');
    });

    it('avatar is optional', () => {
      const withAvatar: TopLearner = { name: 'Alice', sessions: 5, avatar: 'https://example.com/a.png' };
      expect(withAvatar.avatar).toBeDefined();

      const without: TopLearner = { name: 'Charlie', sessions: 3 };
      expect(without.avatar).toBeUndefined();
    });
  });

  // ─── LessonDay ───
  describe('LessonDay', () => {
    it('has correct shape', () => {
      const day: LessonDay = { id: 'lesson1', day: 1, status: 'completed', date: '2026-03-01' };
      expect(day.id).toBe('lesson1');
      expect(day.day).toBe(1);
      expect(['completed', 'in_progress', 'upcoming']).toContain(day.status);
      expect(typeof day.date).toBe('string');
    });
  });

  // ─── Progress metrics ───
  describe('PronunciationMetrics', () => {
    it('has all four metric fields', () => {
      const m: PronunciationMetrics = { clarity: 80, soundAccuracy: 75, smoothness: 85, rhythmAndTone: 70 };
      expect(Object.keys(m)).toHaveLength(4);
      for (const val of Object.values(m)) {
        expect(typeof val).toBe('number');
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('ConversationMetrics', () => {
    it('has all four metric fields', () => {
      const m: ConversationMetrics = { fluency: 70, vocabulary: 80, grammarUsage: 65, turnTaking: 90 };
      expect(Object.keys(m)).toHaveLength(4);
    });
  });

  describe('OverallPerformance', () => {
    it('has speechAccuracy, speechFluency, speechConsistency', () => {
      const p: OverallPerformance = { speechAccuracy: 80, speechFluency: 75, speechConsistency: 85 };
      expect(p).toHaveProperty('speechAccuracy');
      expect(p).toHaveProperty('speechFluency');
      expect(p).toHaveProperty('speechConsistency');
    });
  });

  // ─── ProgressData ───
  describe('ProgressData', () => {
    it('has required structure', () => {
      const data: ProgressData = {
        dayStreak: 5,
        lessonDays: [],
        currentWeekIndex: 0,
        weeks: [],
      };
      expect(typeof data.dayStreak).toBe('number');
      expect(Array.isArray(data.lessonDays)).toBe(true);
      expect(typeof data.currentWeekIndex).toBe('number');
      expect(Array.isArray(data.weeks)).toBe(true);
    });
  });
});
