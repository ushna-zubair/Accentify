"use strict";
/**
 * adminAnalytics.ts
 *
 * Scheduled Cloud Function that aggregates per-user progress data
 * into `admin_analytics/global_stats` for the admin dashboard.
 *
 * Runs every 6 hours by default. Can also be triggered manually via
 * the `runAdminAggregation` callable.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAdminAggregation = exports.scheduledAdminAggregation = void 0;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const db = admin.firestore();
// ─── Helpers ───
const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun'];
function startOfWeek(d) {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
}
function dowIndex(d) {
    const js = d.getDay();
    return js === 0 ? 6 : js - 1;
}
function timeOfDay(hour) {
    if (hour >= 5 && hour < 12)
        return 'morning';
    if (hour >= 12 && hour < 18)
        return 'afternoon';
    return 'night';
}
function formatDateRange(start, end) {
    const opts = { month: 'short', day: 'numeric' };
    const s = start.toLocaleDateString('en-US', opts);
    const e = end.toLocaleDateString('en-US', { ...opts, year: '2-digit' });
    return `${s} - ${e}`;
}
async function aggregate() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisWeekStart = startOfWeek(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const usersSnap = await db.collection('users').get();
    let activeUsers = 0;
    let totalSessions = 0;
    let totalPronunciation = 0;
    let totalFluency = 0;
    let totalVocab = 0;
    let usersWithMetrics = 0;
    let morningCount = 0;
    let afternoonCount = 0;
    let nightCount = 0;
    const sessionsPerDayThisWeek = [0, 0, 0, 0, 0, 0, 0];
    const sessionsPerDayLastWeek = [0, 0, 0, 0, 0, 0, 0];
    const learnerMap = new Map();
    for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        if (userData.role === 'admin')
            continue;
        // Active in last 30 days?
        const lastActive = userData.lastSeen?.toDate?.()
            ?? userData.lastActiveAt?.toDate?.()
            ?? null;
        if (lastActive && now.getTime() - lastActive.getTime() < 30 * 24 * 60 * 60 * 1000) {
            activeUsers++;
        }
        // Summary
        try {
            const summarySnap = await db
                .doc(`users/${userDoc.id}/progress/summary`)
                .get();
            if (summarySnap.exists) {
                const summary = summarySnap.data();
                totalSessions += summary.totalSessions ?? 0;
                const userName = userData.fullName ?? userData.profile?.fullName ?? 'User';
                learnerMap.set(userDoc.id, {
                    name: userName,
                    sessions: summary.totalSessions ?? 0,
                });
            }
        }
        catch { /* skip */ }
        // Daily logs (2 weeks window)
        try {
            for (let offset = 0; offset < 14; offset++) {
                const d = new Date(lastWeekStart);
                d.setDate(d.getDate() + offset);
                const dateKey = d.toISOString().split('T')[0];
                const daySnap = await db
                    .doc(`users/${userDoc.id}/progress/daily/entries/${dateKey}`)
                    .get();
                if (!daySnap.exists)
                    continue;
                const dayData = daySnap.data();
                const sessions = (dayData.lessonsCompleted ?? 0) +
                    (dayData.pronunciationAttempts ?? 0) +
                    (dayData.conversationTurns ?? 0);
                const idx = dowIndex(d);
                if (d >= thisWeekStart) {
                    sessionsPerDayThisWeek[idx] += sessions;
                }
                else {
                    sessionsPerDayLastWeek[idx] += sessions;
                }
                const hour = dayData.primaryHour ?? 12;
                const tod = timeOfDay(hour);
                if (tod === 'morning')
                    morningCount++;
                else if (tod === 'afternoon')
                    afternoonCount++;
                else
                    nightCount++;
            }
        }
        catch { /* skip */ }
        // Weekly accuracy metrics
        try {
            const weeklySnap = await db
                .collection(`users/${userDoc.id}/progress/weekly/entries`)
                .orderBy('weekNumber', 'desc')
                .limit(1)
                .get();
            if (!weeklySnap.empty) {
                const wd = weeklySnap.docs[0].data();
                const pron = wd.pronunciation ?? {};
                const conv = wd.conversation ?? {};
                const pronAvg = ((pron.clarity ?? 0) + (pron.soundAccuracy ?? 0) +
                    (pron.smoothness ?? 0) + (pron.rhythmAndTone ?? 0)) / 4;
                const convAvg = ((conv.fluency ?? 0) + (conv.vocabulary ?? 0) +
                    (conv.grammarUsage ?? 0) + (conv.turnTaking ?? 0)) / 4;
                const vg = wd.vocabularyGrowth ?? [];
                const vLast = vg[vg.length - 1]?.value ?? 0;
                const vFirst = vg[0]?.value ?? 0;
                const vocabRet = vFirst > 0 ? Math.min(100, Math.round((vLast / vFirst) * 100)) : 0;
                totalPronunciation += pronAvg;
                totalFluency += convAvg;
                totalVocab += vocabRet;
                usersWithMetrics++;
            }
        }
        catch { /* skip */ }
    }
    // ── Derived values ──
    let growthPct = 0;
    try {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const prevSnap = await db
            .doc(`admin_analytics/daily_snapshots/${yesterday.toISOString().split('T')[0]}`)
            .get();
        if (prevSnap.exists) {
            const prevActive = prevSnap.data().activeUsers ?? 0;
            if (prevActive > 0) {
                growthPct = parseFloat((((activeUsers - prevActive) / prevActive) * 100).toFixed(1));
            }
        }
    }
    catch { /* first run */ }
    const actTotal = morningCount + afternoonCount + nightCount || 1;
    const practiceActivity = {
        morning: Math.round((morningCount / actTotal) * 100),
        afternoon: Math.round((afternoonCount / actTotal) * 100),
        night: Math.round((nightCount / actTotal) * 100),
    };
    const n = usersWithMetrics || 1;
    const pronunciationAccuracy = Math.round(totalPronunciation / n);
    const fluencyAccuracy = Math.round(totalFluency / n);
    const vocabularyRetention = Math.round(totalVocab / n);
    const topLearners = Array.from(learnerMap.values())
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 4);
    const weeklyBarData = DOW_LABELS.map((label, i) => ({
        label,
        thisWeek: sessionsPerDayThisWeek[i],
        lastWeek: sessionsPerDayLastWeek[i],
    }));
    let cumThis = 0;
    let cumLast = 0;
    const sessionsThisWeek = [];
    const sessionsLastWeek = [];
    for (let i = 0; i < 7; i++) {
        cumThis += sessionsPerDayThisWeek[i];
        cumLast += sessionsPerDayLastWeek[i];
        sessionsThisWeek.push(cumThis);
        sessionsLastWeek.push(cumLast);
    }
    const lastWeekTotal = sessionsPerDayLastWeek.reduce((a, b) => a + b, 0);
    const thisWeekTotal = sessionsPerDayThisWeek.reduce((a, b) => a + b, 0);
    const sessionsGrowth = lastWeekTotal > 0
        ? parseFloat((((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100).toFixed(1))
        : 0;
    const weekEnd = new Date(thisWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const usageDateRange = formatDateRange(thisWeekStart, weekEnd);
    // ── Write results ──
    await db.doc('admin_analytics/global_stats').set({
        activeUsers,
        growthPct,
        usageDateRange,
        weeklyBarData,
        practiceActivity,
        pronunciationAccuracy,
        fluencyAccuracy,
        vocabularyRetention,
        topLearners,
        totalSessions,
        sessionsGrowth,
        sessionsThisWeek,
        sessionsLastWeek,
        lastAggregatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db
        .doc(`admin_analytics/daily_snapshots/${today}`)
        .set({
        activeUsers,
        totalSessions,
        date: today,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`[adminAnalytics] Aggregation complete – ${activeUsers} active users, ${totalSessions} total sessions`);
}
// ─── Scheduled Function (every 6 hours) ───
exports.scheduledAdminAggregation = (0, scheduler_1.onSchedule)({ schedule: 'every 6 hours', timeZone: 'UTC' }, async () => {
    await aggregate();
});
// ─── Callable – Manual Trigger ───
exports.runAdminAggregation = (0, https_1.onCall)(async (request) => {
    // Only allow admin users
    if (!request.auth) {
        throw new Error('Authentication required.');
    }
    const userDoc = await db.doc(`users/${request.auth.uid}`).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        throw new Error('Admin access required.');
    }
    await aggregate();
    return { success: true };
});
//# sourceMappingURL=adminAnalytics.js.map