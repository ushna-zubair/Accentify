import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Circle, Rect, Ellipse } from 'react-native-svg';
import colors from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { useLessonDetailController, CATEGORY_COLORS } from '../../controllers';
import type { TutorStackParamList } from '../../models';

type DetailRoute = RouteProp<TutorStackParamList, 'LessonDetail'>;

// ═══════════════════════════════════════════════
//  ILLUSTRATION PLACEHOLDERS (SVG per category)
// ═══════════════════════════════════════════════

const ConversationIllustration: React.FC = () => (
  <Svg width={220} height={160} viewBox="0 0 220 160">
    {/* Background elements */}
    <Rect x={10} y={40} width={60} height={100} rx={8} fill={colors.primaryLight} opacity={0.4} />
    <Rect x={150} y={50} width={55} height={90} rx={8} fill={colors.primaryMuted} opacity={0.5} />
    {/* Person 1 */}
    <Circle cx={80} cy={55} r={18} fill="#E8BD8A" />
    <Path d="M68 52 C68 42 92 42 92 52" fill="#7B4DB8" />
    <Ellipse cx={80} cy={100} rx={22} ry={30} fill="#F5C84C" />
    {/* Speech bubble */}
    <Rect x={30} y={20} width={50} height={28} rx={14} fill={colors.primaryMuted} />
    <Circle cx={45} cy={34} r={3} fill={colors.white} />
    <Circle cx={55} cy={34} r={3} fill={colors.white} />
    <Circle cx={65} cy={34} r={3} fill={colors.white} />
    {/* Person 2 - partial */}
    <Circle cx={155} cy={65} r={14} fill="#D4A574" />
    <Ellipse cx={155} cy={105} rx={18} ry={25} fill="#5B7FC7" />
    {/* Table */}
    <Rect x={55} y={120} width={110} height={6} rx={3} fill={colors.primaryLight} />
    {/* Plant */}
    <Rect x={135} y={105} width={8} height={18} rx={2} fill="#C4A882" />
    <Ellipse cx={139} cy={100} rx={12} ry={10} fill="#6BBF6B" />
  </Svg>
);

const PronunciationIllustration: React.FC = () => (
  <Svg width={220} height={160} viewBox="0 0 220 160">
    <Rect x={40} y={30} width={140} height={100} rx={12} fill={colors.primaryMuted} opacity={0.5} />
    {/* Person */}
    <Circle cx={110} cy={60} r={22} fill="#E8BD8A" />
    <Path d="M95 55 C95 42 125 42 125 55" fill="#D45B5B" />
    <Ellipse cx={110} cy={110} rx={28} ry={28} fill="#4A90D9" />
    {/* Mic icon */}
    <Rect x={165} y={55} width={20} height={35} rx={10} fill={colors.primary} />
    <Path d="M165 90 L185 90" stroke={colors.primary} strokeWidth={3} />
    <Path d="M175 90 L175 100" stroke={colors.primary} strokeWidth={3} />
    {/* Sound waves */}
    <Path d="M45 60 Q35 75 45 90" stroke={colors.primaryLight} strokeWidth={2.5} fill="none" />
    <Path d="M35 55 Q22 75 35 95" stroke={colors.primaryLight} strokeWidth={2} fill="none" />
  </Svg>
);

const VocabularyIllustration: React.FC = () => (
  <Svg width={220} height={160} viewBox="0 0 220 160">
    {/* Background people - partial */}
    <Rect x={5} y={40} width={50} height={100} rx={8} fill={colors.primaryLight} opacity={0.3} />
    <Circle cx={30} cy={55} r={14} fill="#A0C4E8" opacity={0.5} />
    <Ellipse cx={30} cy={95} rx={18} ry={24} fill="#5B7FC7" opacity={0.5} />
    {/* Main person */}
    <Circle cx={120} cy={50} r={20} fill="#E8BD8A" />
    <Path d="M107 44 C107 34 133 34 133 44" fill="#C75B3B" />
    <Ellipse cx={120} cy={100} rx={26} ry={30} fill="#F5C84C" />
    {/* Writing hand */}
    <Path d="M95 105 L80 125" stroke="#E8BD8A" strokeWidth={4} strokeLinecap="round" />
    {/* Speech bubble */}
    <Rect x={45} y={15} width={55} height={30} rx={15} fill={colors.primaryMuted} />
    <Circle cx={60} cy={30} r={3.5} fill={colors.white} />
    <Circle cx={72} cy={30} r={3.5} fill={colors.white} />
    <Circle cx={84} cy={30} r={3.5} fill={colors.white} />
    {/* Table / desk */}
    <Rect x={60} y={122} width={120} height={6} rx={3} fill={colors.primaryLight} />
    {/* Book/paper */}
    <Rect x={85} y={108} width={30} height={18} rx={2} fill={colors.white} />
    <Path d="M90 113 L110 113" stroke={colors.textMuted} strokeWidth={1.5} />
    <Path d="M90 117 L105 117" stroke={colors.textMuted} strokeWidth={1.5} />
    <Path d="M90 121 L108 121" stroke={colors.textMuted} strokeWidth={1.5} />
    {/* Plant */}
    <Rect x={155} y={108} width={7} height={16} rx={2} fill="#C4A882" />
    <Ellipse cx={158} cy={103} rx={10} ry={9} fill="#6BBF6B" />
    {/* Right person - partial */}
    <Rect x={175} y={50} width={40} height={90} rx={8} fill={colors.primaryMuted} opacity={0.3} />
  </Svg>
);

const CATEGORY_ILLUSTRATIONS: Record<string, React.FC> = {
  conversation: ConversationIllustration,
  pronunciation: PronunciationIllustration,
  vocabulary: VocabularyIllustration,
};

// ═══════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════

const LessonDetailScreen: React.FC = () => {
  const route = useRoute<DetailRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<TutorStackParamList>>();
  const { lessonId } = route.params;

  const { detail, loading, starting, error, startLesson } =
    useLessonDetailController(lessonId);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const Illustration =
    CATEGORY_ILLUSTRATIONS[detail.category] ?? VocabularyIllustration;

  const buttonLabel =
    detail.status === 'in_progress'
      ? 'Continue'
      : detail.status === 'completed'
        ? 'Review'
        : 'Continue';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Title ── */}
        <Text style={styles.title}>{detail.title}</Text>

        {/* ── Illustration Card ── */}
        <View style={styles.illustrationCard}>
          {detail.imageUrl ? (
            <Image
              source={{ uri: detail.imageUrl }}
              style={styles.illustrationImage}
              resizeMode="cover"
            />
          ) : (
            <Illustration />
          )}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* ── Description ── */}
        <Text style={styles.description}>{detail.fullDescription}</Text>

        {/* ── Focus Tips ── */}
        {detail.focusTips.length > 0 && (
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>Remember to focus:</Text>
            {detail.focusTips.map((tip, i) => (
              <Text key={i} style={styles.tipItem}>
                • {tip}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Continue Button ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={async () => {
            await startLesson();
            if (detail.category === 'vocabulary') {
              navigation.navigate('VocabExercise', { lessonId });
            } else if (detail.category === 'pronunciation') {
              navigation.navigate('PronunciationExercise', { lessonId });
            }
          }}
          disabled={starting}
          activeOpacity={0.8}
        >
          {starting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.continueBtnText}>{buttonLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryMuted,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 100,
    alignItems: 'center',
  },

  // Title
  title: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },

  // Illustration
  illustrationCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    width: '100%',
    aspectRatio: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 24,
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },

  // Error
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.error,
    marginBottom: 10,
    textAlign: 'center',
  },

  // Description
  description: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },

  // Tips
  tipsSection: {
    alignSelf: 'stretch',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  tipsTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    marginBottom: 6,
  },
  tipItem: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    paddingLeft: 4,
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingBottom: 16,
    paddingTop: 10,
  },
  continueBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueBtnText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.white,
  },
});

export default LessonDetailScreen;
